# kNews

基于 [NewsNow](https://github.com/ourongxing/newsnow) 的新闻聚合服务，重点提供可直接集成的 **MCP 服务** 与 **API Key 精细化控制**。

## 核心能力

- MCP 接口：`/api/mcp`
- API Key 维度控制：
  - 可配置允许访问的数据源（`source_ids`）
  - 可配置单次返回上限（`max_count`，1-30）
  - 可配置每小时限流（`rate_limit_rph`）
- Web 端自助管理：用户可在设置页创建/删除自己的 API Key
- 后台管理系统：管理员可管理数据源、用户黑名单、所有 API Key 与调用分析

## MCP + API Key 机制（重点）

每个 API Key 都是独立配额与独立权限，适合给不同客户端单独发放。

| 维度 | 说明 |
| --- | --- |
| `source_ids` | 限制该 key 可访问的数据源 ID 列表 |
| `max_count` | 限制该 key 每次请求最多返回多少条新闻（最大 30） |
| `rate_limit_rph` | 限制该 key 每小时最大请求数 |
| 全局数据源作用域 | 管理员在后台配置后，对非管理员 key 生效（与 key 范围取交集） |

MCP 当前提供两个工具：

- `get_available_sources`：返回当前 key 可用数据源 + `max_count`
- `get_hotest_latest_news`：按 `id` 获取新闻，`count` 会被 `max_count` 自动截断

## 快速开始

1. 安装依赖：`pnpm install`
2. 配置环境变量：`cp .env.example .env`
3. 启动开发：`pnpm dev`
4. 构建：`pnpm build`

## `.env` 关键配置

```env
VITE_API_BASE_URL=/api
VITE_APP_NAME=kNews
JWT_SECRET=replace-with-a-long-random-secret
G_CLIENT_ID=github-oauth-app-client-id
G_CLIENT_SECRET=github-oauth-app-client-secret
ADMIN_GITHUB_IDS=12345678
MCP_REQUIRE_AUTH=true
MCP_RATE_LIMIT=100/hour
```

说明：

- `G_CLIENT_ID` / `G_CLIENT_SECRET` / `JWT_SECRET`：用于 GitHub 登录
- `ADMIN_GITHUB_IDS`：管理员 GitHub 用户 ID，多个用逗号分隔
- `MCP_REQUIRE_AUTH=true`：MCP 强制 API Key 鉴权

## 管理员后台登录

项目已内置后台系统。只要在 `.env` 里设置 `ADMIN_GITHUB_IDS`，对应 GitHub 账号登录后即可进入后台页面进行管理。

后台主要功能：

- 后台-数据源：启用/禁用数据源
- 后台-用户：查看用户、登录审计、黑名单管理
- 后台-APIKey：查看 key 列表、调用趋势、每小时榜单、限流调整、删除 key

## MCP 接入

- Endpoint：`http://<your-host>/api/mcp`
- API Key 传递方式（二选一）：
  - Header：`x-api-key: <YOUR_API_KEY>`
  - Query：`?apiKey=<YOUR_API_KEY>`

示例（按客户端版本调整字段名）：

```json
{
  "mcpServers": {
    "knews": {
      "transport": "streamable_http",
      "url": "http://127.0.0.1:5173/api/mcp",
      "headers": {
        "x-api-key": "YOUR_API_KEY"
      }
    }
  }
}
```

## 常用场景

1. OpenClaw 定时任务调用 ClaudeCode
   - 由于 OpenClaw 当前不支持自定义 MCP，可在 ClaudeCode 内配置本项目 MCP
   - 定时任务触发 ClaudeCode 后，由 ClaudeCode 通过该 MCP 拉取新闻
2. Chatbox 集成 MCP
   - 在 Chatbox MCP 配置中接入 `/api/mcp`
   - 按机器人或工作流发放不同 API Key，实现“按 key 控制数据源与返回条数”

## 部署到 Cloudflare Workers（D1）

1. 创建 D1 数据库并记录 `database_id`
   - `wrangler d1 create knews`
2. 修改 `wrangler.toml` 中的 `[[d1_databases]]`
   - `database_id = "你的 D1 database_id"`
3. 执行迁移
   - `wrangler d1 migrations apply knews --local`
   - `wrangler d1 migrations apply knews --remote`
4. 构建 Worker
   - `npm run build:worker`
5. 部署
   - `wrangler deploy`

当前 Worker 入口文件：`dist/output/public/_worker.js`（见 `wrangler.toml` 的 `main`）。

## 技术栈

- Vue 3 + Vue Router + Pinia
- Vite + UnoCSS
- H3 / Nitro-compatible 服务端
- Cloudflare D1（生产环境）
- MCP SDK（`@modelcontextprotocol/sdk`）

## 致谢

本项目基于 NewsNow 衍生开发，遵循 MIT License。

## License

MIT，详见 `LICENSE`。
