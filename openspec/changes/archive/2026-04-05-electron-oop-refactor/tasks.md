## 1. 项目初始化与目录结构

- [x] 1.1 在项目根目录 `/Users/kk/code/news/` 创建新目录结构：`main/`、`core/`、`database/`、`preload/`、`config/`、`renderer/`
- [x] 1.2 创建根目录 `package.json`：项目名 `knews-desktop`，添加 electron、electron-builder、@supabase/supabase-js、p-limit、cheerio、jose 等依赖，添加 `dev`（electron .）、`build:mac`、`build:win` 脚本
- [x] 1.3 创建 `main/index.js`：Electron Main Process 入口，配置 BrowserWindow（最小宽度 1024px，最小高度 700px），加载 `renderer/index.html`
- [x] 1.4 创建 `preload/index.js`：使用 contextBridge 暴露 `window.api` 命名空间（auth、feeds、sources、scraper、user、mcp 分组）
- [x] 1.5 创建 `electron-builder.yml`：配置 Windows (NSIS) 和 Mac (DMG) 打包，应用名称 "kNews"，图标路径
- [x] 1.6 创建 `.env.example`：列出 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 等必要环境变量
- [x] 1.7 从 `kNews/src/` 复制前端代码到 `renderer/`，保持目录结构不变（features/、shared/、stores/ 等）

## 2. Supabase 数据库层

- [x] 2.1 创建 `database/connection.js`：Supabase 客户端初始化，从环境变量读取 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`，导出共享单例
- [x] 2.2 创建 `database/migrations/001_create_users.sql`：users 表（id BIGINT IDENTITY PK / email TEXT / github_id TEXT / nickname TEXT NOT NULL / level INT DEFAULT 0 / balance DECIMAL DEFAULT 0 / created_at / updated_at）
- [x] 2.3 创建 `database/migrations/002_create_api_key.sql`：api_key 表（id TEXT PK / user_id BIGINT FK / key_hash TEXT UNIQUE / name / is_active / source_scope TEXT JSON / rate_limit INT / max_count INT / last_used / call_count / created_at / updated_at）
- [x] 2.4 创建 `database/migrations/003_create_source.sql`：source 表（id TEXT PK / name TEXT NOT NULL / url TEXT / category TEXT / enabled BOOLEAN DEFAULT true / config TEXT JSON / created_at / updated_at）
- [x] 2.5 创建 `database/migrations/004_create_cache.sql`：cache 表（id TEXT PK / source_id TEXT FK / data JSONB / updated_at）
- [x] 2.6 创建 `database/migrations/005_create_preference.sql`：preference 表（id TEXT PK / user_id BIGINT FK / data JSONB / updated_at）
- [x] 2.7 创建 `database/init.js`：数据库初始化执行器，按序执行 SQL 文件建表（全新库，不迁移旧数据），幂等处理（已存在则跳过）

## 3. OOP 基础 — Repository 层

- [x] 3.1 创建 `core/user/user-repository.js`：UserRepository class（注入 supabase 客户端），实现 findByGithubId、findByEmail、create、update 方法
- [x] 3.2 创建 `core/source/source-repository.js`：SourceRepository class，实现 findAll、findById、findByCategory、create、update、delete 方法
- [x] 3.3 创建 `core/feed/feed-repository.js`：FeedRepository class，实现 findBySourceId、findCached、saveCache 方法
- [x] 3.4 创建 `core/auth/api-key-repository.js`：ApiKeyRepository class，实现 findByHash、updateUsage、findActiveByUserId 方法

## 4. OOP 基础 — Service 层

- [x] 4.1 创建 `core/user/user-service.js`：UserService class（注入 UserRepository），实现 syncUser 方法（GitHub/Email 首次创建、重复更新逻辑）
- [x] 4.2 创建 `core/source/source-service.js`：SourceService class（注入 SourceRepository），实现 getSources、getSource、createSource、updateSource、deleteSource
- [x] 4.3 创建 `core/feed/feed-service.js`：FeedService class（注入 FeedRepository），实现 getFeeds、getFeedsBySource（从缓存读取）

## 5. 认证系统（策略模式 + 工厂模式 + 模板方法模式）

- [x] 5.1 创建 `core/auth/auth-template.js`：AuthTemplate 基类，定义 authenticate() 模板方法（initiate → validate → syncUser → createSession），抽象方法 initiate()/validate()（throw Error），共用方法 syncUser()/createSession()
- [x] 5.2 创建 `core/auth/github-oauth-strategy.js`：GitHubOAuthStrategy extends AuthTemplate，实现 initiate()（启动临时 HTTP Server、shell.openExternal 打开浏览器、等待 callback、获取 code）和 validate()（code 换 access_token、GitHub API 获取用户信息）
- [x] 5.3 创建 `core/auth/email-otp-strategy.js`：EmailOTPStrategy extends AuthTemplate，实现 initiate()（从参数接收 Supabase JWT）和 validate()（用 jose 验证 JWT 签名、提取 email）
- [x] 5.4 创建 `core/auth/auth-factory.js`：AuthFactory class，静态方法 create(type) 支持 'github' 和 'otp'
- [x] 5.5 创建 `core/auth/auth-context.js`：AuthContext class，管理策略实例和 Session 状态，提供 login/logout/getSession 方法
- [x] 5.6 实现 Session 持久化：登录成功后通过 Electron safeStorage 加密保存到本地，应用启动时自动恢复

## 6. 爬虫引擎

- [x] 6.1 创建 `core/scraper/source-fetcher.js`：SourceFetcher class，封装单源抓取（RSS 解析 + Cheerio HTML 抓取），返回统一格式（title/url/date/source）
- [x] 6.2 从 `kNews/server/sources/` 和 `kNews/shared/newsnow-sources.json` 适配源定义到 `core/scraper/sources/`，提供 `defineSource`、`defineRSSSource` 兼容 API
- [x] 6.3 创建 `core/scraper/scraper-engine.js`：ScraperEngine class，start（10 分钟定时器）、stop、refreshAll（p-limit 并发控制，最大 5）、refreshOne 方法
- [x] 6.4 实现抓取缓存：成功后写入 Supabase cache 表，失败保留上次缓存

## 7. 本地 MCP Server

- [x] 7.1 创建 `core/mcp/mcp-server.js`：McpServer class，HTTP Server（默认端口 12580，占用递增），端口信息写入本地配置
- [x] 7.2 创建 `core/mcp/mcp-tools.js`：定义 get_available_sources 和 get_hotest_latest_news 工具
- [x] 7.3 实现 MCP 认证：Authorization Header 验证 API Key（查 Supabase api_key 表），更新 last_used/call_count
- [x] 7.4 实现频率限制：根据 api_key.rate_limit 限制每小时请求数
- [x] 7.5 实现 `/mcp/health` 健康检查端点（返回 status、uptime、port）

## 8. IPC 通信层

- [x] 8.1 创建 `main/ipc/auth.handler.js`：注册 auth:login、auth:logout、auth:get-session 通道
- [x] 8.2 创建 `main/ipc/feeds.handler.js`：注册 feeds:get、feeds:get-by-source 通道
- [x] 8.3 创建 `main/ipc/sources.handler.js`：注册 sources:list、sources:get、sources:create、sources:update、sources:delete 通道
- [x] 8.4 创建 `main/ipc/scraper.handler.js`：注册 scraper:refresh-all、scraper:refresh-one、scraper:get-status 通道
- [x] 8.5 创建 `main/ipc/user.handler.js`：注册 user:profile、user:update 通道
- [x] 8.6 更新 `preload/index.js`：注册所有 IPC 通道到 `window.api` 各子命名空间

## 9. 前端适配

- [x] 9.1 创建 `renderer/shared/utils/ipc-api.js`：封装 `window.api.xxx()` 的调用工具，替代原有 `fetch.js`
- [x] 9.2 更新 `renderer/features/home/shared/composables/useAuthApi.js`：GitHub OAuth 改为 IPC auth:login，新增 Email OTP 流程（Supabase SDK signInWithOtp + verifyOtp → IPC auth:login-otp）
- [x] 9.3 更新 `renderer/features/home/shared/composables/useFeedsApi.js`：改为 IPC feeds:get
- [x] 9.4 更新 `renderer/features/home/shared/composables/useSourcesApi.js`：改为 IPC sources:* 调用
- [x] 9.5 更新 `renderer/features/home/shared/composables/useAdminApi.js`：改为 IPC 调用
- [x] 9.6 更新 `renderer/features/home/shared/composables/usePreferencesApi.js`：改为 IPC 调用
- [x] 9.7 添加 Email OTP 登录 UI：登录页新增邮箱输入框和验证码输入，集成 @supabase/supabase-js

## 10. 集成与启动

- [x] 10.1 创建 `main/bootstrap.js`：启动初始化流程（Supabase 连接 → 数据库初始化建表 → ScraperEngine 启动 → MCP Server 启动 → Session 恢复）
- [x] 10.2 更新 `main/index.js`：调用 bootstrap，注册所有 IPC handler，创建 BrowserWindow
- [ ] 10.3 集成测试：验证启动流程、GitHub OAuth 登录、Email OTP 登录、新闻刷新、MCP Server 访问
- [ ] 10.4 打包测试：Mac 执行 `build:mac`、Windows 执行 `build:win`，验证安装包正常运行
