## Why

kNews 当前运行在 Cloudflare Workers + D1 上，受限于 Serverless 架构无法提供桌面端原生体验。将其重构为 Electron 桌面应用，可以提供 Windows/Mac 原生安装包、本地定时刷新、离线缓存等能力，同时通过 OOP 重构提升后端代码的可维护性和扩展性。

## What Changes

- **BREAKING**: 将整个项目从 Cloudflare Workers (H3/Nitro) 迁移到 Electron 桌面应用
- 全新 Supabase (PostgreSQL) 数据库，从零建表，不迁移旧数据
- 新增 Electron Main Process，负责后端逻辑（爬虫、数据库操作、IPC 通信）
- 新增认证系统，采用策略模式 + 工厂模式 + 抽象模板方法模式实现：
  - GitHub OAuth（独立处理，不走 Supabase Auth）
  - Email OTP（通过 Supabase Auth JS SDK，前端调用，Main Process 验证 JWT 并同步用户）
- 新增用户表及用户管理能力（用户首次登录自动创建）
- 新增本地定时刷新引擎（10 分钟自动刷新 + 手动刷新）
- 前端 Vue 3 代码复用，通过 Electron IPC 与 Main Process 通信
- 后端 JS 代码按 OOP 思想重构（class、继承、接口模拟）
- MCP 服务改为本地启动，Main Process 内嵌 MCP HTTP Server，通过本地端口 `/mcp` 路径对外提供服务
- 新增 Electron 打包配置，生成 Windows exe 和 Mac app

## Capabilities

### New Capabilities

- `electron-app`: Electron 桌面应用骨架，包含 Main Process、Renderer Process (Vue 3)、IPC 通信层、打包配置（Windows exe / Mac app）
- `auth-system`: 基于 OOP 设计模式的认证系统（策略模式 + 工厂模式 + 抽象模板方法模式），支持 GitHub OAuth 和 Email OTP 两种登录方式
- `user-management`: 用户表设计及用户生命周期管理（首次登录自动创建、信息同步、等级/余额管理）
- `supabase-database`: Supabase 数据库全新集成，包含表结构定义、初始化脚本、数据访问层（OOP 重构），不迁移旧数据
- `scraper-engine`: 新闻爬虫引擎 OOP 重构，支持本地定时刷新（10 分钟间隔）和手动触发，并发抓取 60+ 源
- `local-mcp-server`: 本地 MCP HTTP Server，在 Main Process 中启动，通过本地端口 `/mcp` 路径提供 MCP 协议服务（get_available_sources、get_hotest_latest_news）
- `oop-refactor`: 现有后端 JS 代码的 OOP 重构规范和架构（class 体系、继承关系、接口模拟）

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **代码结构**: 在项目根目录 `/Users/kk/code/news/` 下新建完整项目（`kNews/` 目录仅作为参考源，不做修改）。新项目包含 `main/`、`core/`、`database/`、`renderer/`、`preload/`、`config/` 目录
- **前端变更**: 从 `kNews/src/` 复制 Vue 3 代码到 `renderer/`，API 调用从 HTTP fetch 改为 Electron IPC 调用
- **依赖变更**: 新项目独立 package.json，新增 Electron、electron-builder、@supabase/supabase-js；不含 Cloudflare Workers 相关依赖
- **数据库**: 使用 Supabase PostgreSQL，全新建表，不迁移旧数据（Cloudflare D1 中的数据保留在原处）
- **部署**: 通过 electron-builder 编译生成 Windows exe 和 Mac app 安装包
- **MCP**: 从远程 Cloudflare Worker 改为本地内嵌 MCP HTTP Server，通过 localhost 端口 `/mcp` 访问
