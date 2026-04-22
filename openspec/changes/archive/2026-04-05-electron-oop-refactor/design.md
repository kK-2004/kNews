## Context

kNews 是一个基于 NewsNow 的新闻聚合应用，当前架构为 Vue 3 + H3/Nitro + Cloudflare D1，部署在 Cloudflare Workers 上。服务端代码采用函数式编程风格（模块导出函数），没有使用类和 OOP 模式。前端通过 HTTP fetch 调用后端 API。

目标架构为 Electron 桌面应用（Windows/Mac），后端用 JS OOP 重构，数据库全新使用 Supabase PostgreSQL（不迁移旧数据），MCP 服务在本地内嵌启动。

## Goals / Non-Goals

**Goals:**
- 将 kNews 包装为 Electron 桌面应用，生成 Windows exe 和 Mac app
- 后端 JS 代码重构为 OOP 风格（class、继承、接口模拟）
- 认证系统采用策略模式 + 工厂模式 + 抽象模板方法模式
- 数据库全新使用 Supabase PostgreSQL，从零建表，不迁移旧数据
- 前端 API 调用从 HTTP fetch 改为 Electron IPC
- MCP 服务在 Main Process 内嵌 HTTP Server，通过本地端口 `/mcp` 路径对外提供服务
- 本地 10 分钟定时刷新 + 手动刷新

**Non-Goals:**
- 不重写前端 Vue 3 代码，只做最小化改动（API 层适配）
- 不做离线模式（首次使用需要网络）
- 不做自动更新功能（后续版本考虑）
- 不迁移旧数据（Cloudflare D1 数据保留原处），Supabase 从空库开始

## Decisions

### 1. Electron Main Process 作为后端

**选择**: Electron Main Process (Node.js) 承载所有后端逻辑

**替代方案**:
- 在 Electron 内嵌一个 Express/H3 服务器，前端仍用 HTTP 调用
- 使用单独的 Node.js 子进程

**理由**: Main Process 天然拥有 Node.js 能力，通过 IPC 直接暴露方法给 Renderer，比 HTTP 更轻量、延迟更低。`contextBridge` + `ipcRenderer.invoke()` 是 Electron 官方推荐的安全做法。

### 2. IPC 通道设计

**选择**: 按领域划分 IPC 通道，前端通过 preload 暴露的 API 调用

```
Renderer                    Preload (contextBridge)         Main Process
────────                    ─────────────────────           ────────────
                            window.api.auth.login()     →   ipcMain 'auth:login'
                            window.api.auth.logout()    →   ipcMain 'auth:logout'
                            window.api.feeds.get()      →   ipcMain 'feeds:get'
                            window.api.sources.list()   →   ipcMain 'sources:list'
                            window.api.scraper.refresh()→   ipcMain 'scraper:refresh'
                            window.api.user.profile()   →   ipcMain 'user:profile'
```

**理由**: 按领域分组比扁平化通道名更易维护。`invoke/handle` 模式天然支持 Promise，与现有 async/await 风格一致。

### 3. 认证系统 — 三模式协作

**选择**: 策略模式（可替换策略）+ 工厂模式（创建策略）+ 模板方法模式（固定流程骨架）

```
AuthTemplate (抽象模板)
├── authenticate() { initiate → validate → syncUser → createSession }
├── initiate()      ← 抽象，子类实现
├── validate()      ← 抽象，子类实现
├── syncUser()      ← 具体方法，所有策略共享
└── createSession() ← 具体方法，所有策略共享

GitHubOAuthStrategy extends AuthTemplate
├── initiate(): 开本地 HTTP Server → 打开系统浏览器 → 等 callback
└── validate(): code → access_token → GitHub API 用户信息

EmailOTPStrategy extends AuthTemplate
├── initiate(): 从 IPC 接收前端传来的 Supabase JWT
└── validate(): 验证 JWT 签名 → 提取 email

AuthFactory
└── create(type): 根据类型返回对应策略实例
```

**理由**: 策略模式让认证方式可扩展；工厂模式让调用方解耦；模板方法让共用逻辑（syncUser、createSession）只写一次。新增认证方式只需新增一个 Strategy 子类 + 工厂注册。

### 4. GitHub OAuth — 本地 HTTP Server 方案

**选择**: 在 Main Process 起临时 HTTP Server（端口随机）接收 callback

**流程**:
1. Main Process 启动临时 server（如 `localhost:38271`）
2. 通过 `shell.openExternal()` 打开 GitHub 授权页，`redirect_uri` 指向本地 server
3. 用户授权后 GitHub redirect 到本地 server，获取 code
4. Main Process 用 code 换取 access_token，获取 GitHub 用户信息
5. 关闭临时 server，执行 syncUser

**理由**: 比 deep link 注册更简单，VS Code、Electron-Auth 均采用此方案。

### 5. Email OTP — 前端 Supabase SDK + Main Process JWT 验证

**选择**: 前端使用 `@supabase/supabase-js` 完成 OTP 全流程，拿到 JWT 后通过 IPC 传给 Main Process

**理由**: Supabase JS SDK 封装了 OTP 发送/验证的完整流程，前端直接调用最简洁。Main Process 只需验证 JWT 并同步用户。

### 6. Supabase 用户表设计

**选择**: 自定义 `public.users` 表

```sql
CREATE TABLE public.users (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT,
  github_id  TEXT,
  nickname   TEXT NOT NULL,
  level      INTEGER NOT NULL DEFAULT 0,  -- 0:普通 1:plus 2:pro
  balance    DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**理由**: 自增 ID（BIGINT IDENTITY）符合需求。GitHub OAuth 不走 Supabase Auth，所以不关联 `auth.users`。OTP 用户可通过 email 关联。

### 7. 本地 MCP HTTP Server

**选择**: 在 Main Process 中内嵌一个轻量 HTTP Server，提供 `/mcp` 路径的 MCP 协议服务

```
Main Process
├── Electron 窗口管理
├── IPC Handlers
├── ScraperEngine
├── AuthService
└── McpServer ← 内嵌 HTTP Server
    ├── GET  /mcp/health          → 健康检查
    ├── POST /mcp/tools/list      → get_available_sources
    └── POST /mcp/tools/call      → get_hotest_latest_news
```

**端口策略**: 使用固定端口（如 12580），启动时检测端口占用，占用则递增尝试。端口信息写入本地配置，供外部工具连接。

**认证**: MCP 请求通过 API Key 认证（与现有逻辑一致），API Key 存储在 Supabase `api_key` 表中。

**理由**: 本地 MCP Server 让桌面应用成为 AI 工具（如 Claude Desktop、Cursor）的新闻数据源，用户无需额外部署。复用现有 MCP 工具定义（get_available_sources、get_hotest_latest_news）。

### 8. 项目结构与位置

**选择**: 在 `/Users/kk/code/news/`（项目根目录）下新建完整的 Electron 项目。`kNews/` 目录仅作为参考源，不做任何修改。

```
/Users/kk/code/news/           ← 项目根目录（新项目所在地）
├── kNews/                     ← 旧项目（只读参考，不修改）
│   ├── server/                   参考：爬虫实现、API 逻辑
│   ├── src/                      参考：前端代码，复制到 renderer/
│   └── shared/                   参考：源定义、共享工具
│
├── main/                      # Electron Main Process（新建）
│   ├── index.js               # 入口
│   ├── ipc/                   # IPC handlers
│   │   ├── auth.handler.js
│   │   ├── feeds.handler.js
│   │   ├── sources.handler.js
│   │   ├── scraper.handler.js
│   │   └── user.handler.js
│   └── bootstrap.js           # 应用初始化
│
├── core/                      # OOP 业务层（新建，不依赖 Electron）
│   ├── auth/
│   │   ├── auth-template.js
│   │   ├── github-oauth-strategy.js
│   │   ├── email-otp-strategy.js
│   │   ├── auth-factory.js
│   │   └── auth-context.js
│   ├── user/
│   │   ├── user-repository.js
│   │   └── user-service.js
│   ├── scraper/
│   │   ├── scraper-engine.js
│   │   ├── source-fetcher.js
│   │   └── sources/           # 从 kNews/server/sources/ 适配迁移
│   ├── feed/
│   │   ├── feed-service.js
│   │   └── feed-repository.js
│   ├── source/
│   │   ├── source-service.js
│   │   └── source-repository.js
│   └── mcp/
│       ├── mcp-server.js
│       └── mcp-tools.js
│
├── database/                  # 数据库层（新建）
│   ├── connection.js          # Supabase client
│   └── migrations/            # SQL 迁移
│
├── renderer/                  # Vue 3 前端（从 kNews/src/ 复制并适配）
│   ├── features/
│   ├── shared/
│   ├── stores/
│   └── ...
│
├── preload/
│   └── index.js               # contextBridge 暴露 API
│
├── config/
│   ├── electron.config.js     # Electron 配置
│   └── env.js                 # 环境变量
│
├── package.json               # 新项目独立 package.json
├── .env.example               # 环境变量模板
└── electron-builder.yml       # 打包配置
```

**理由**: 新旧项目物理隔离，kNews 保持原样可随时对照参考。`core/` 纯业务逻辑不依赖 Electron，可独立测试。

### 9. 爬虫引擎

**选择**: `ScraperEngine` class 管理定时任务和并发

```js
class ScraperEngine {
  constructor(sources, interval = 600000) // 10 min
  start()        // 启动定时器
  stop()         // 停止定时器
  refreshAll()   // 刷新全部源
  refreshOne(id) // 刷新单个源
}
```

**并发策略**: 使用 p-limit 控制并发数（默认 5），避免同时发起 60+ 请求。

## Risks / Trade-offs

- **[Electron 打包体积大]** → 约 80-150MB（含 Chromium）。可使用 electron-builder NSIS 安装包减小下载体积。
- **[Supabase 网络延迟]** → 所有数据库操作需要网络。Mitigation: 本地内存缓存热点数据。
- **[GitHub OAuth callback 端口冲突]** → 使用随机端口 + 重试。Mitigation: `get-port` 库检测可用端口。
- **[MCP 端口占用]** → 固定端口可能被占用。Mitigation: 端口检测 + 递增尝试 + 配置文件记录实际端口。
- **[IPC 通道膨胀]** → 按领域分组 + handler class 封装控制复杂度。
- **[现有源定义迁移]** → 60+ 源定义从 `kNews/shared/newsnow-sources.json` 和 `kNews/server/sources/` 适配复制，只需统一接口包装。
