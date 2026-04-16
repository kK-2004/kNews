## Why

当前 K-Ai 热点问答虽然会参考用户 default API key 的 `source_scope` 和 `max_count`，但实际实现仍直接读取本地缓存、FeedService 和 ScraperEngine，并没有真正通过本地 `/mcp` 发起 MCP 请求。这导致聊天热点链路与 MCP 对外能力之间存在行为漂移，API Key 的请求次数、鉴权和限流也无法被统一执行。

## What Changes

- 将 llm-chat 热点获取链路改为通过用户 default API key 请求本地 MCP HTTP 端点 `/mcp`，而不是直接访问 `FeedService`、`LocalCacheRepository` 或 `ScraperEngine`。
- 在聊天热点场景中按 MCP 标准流程初始化并调用 `get_available_sources`、`get_hotest_latest_news`，以 MCP 返回结果构建注入给模型的热点上下文。
- 让 default API key 的 `source_scope`、`max_count`、`rate_limit` 和鉴权约束在 llm-chat 热点请求中真实生效。
- 保留热点获取失败时的对话降级能力，但失败来源改为 MCP 调用结果，而不是本地拼装链路。

## Capabilities

### New Capabilities
<!-- 无新增 capability -->

### Modified Capabilities
- `llm-chat-engine`: 热点问答必须通过用户 default API key 调用本地 MCP 服务获取上下文，而不是直接读取本地 feed/cache/scraper。
- `local-mcp-server`: 本地 MCP 服务需要支持应用内部聊天链路作为正式客户端接入，并让聊天热点请求遵循与外部客户端一致的鉴权、限流和工具调用约束。

## Impact

- **聊天编排**: `core/chat/chat-service.js`
- **应用启动依赖注入**: `main/bootstrap.js`
- **本地 MCP 接口契约**: `core/mcp/mcp-server.js`, `core/mcp/mcp-tools.js`
- **需求文档**: 同步更新 `docs/需求文档.md` 中 F13 章节，使热点链路与本地 MCP 行为保持一致
