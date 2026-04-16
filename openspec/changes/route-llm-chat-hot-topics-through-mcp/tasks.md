## 1. Chat Service 接入本地 MCP

- [x] 1.1 更新 `main/bootstrap.js` 的依赖注入，将已启动的 `mcpServer` 实例传给 `ChatService`
- [x] 1.2 更新 `core/chat/chat-service.js`，为热点获取增加基于 `mcpServer.port` 的本地 `/mcp` 地址解析
- [x] 1.3 在 `core/chat/chat-service.js` 中接入 SDK 的 MCP client/transport，完成 initialize、`get_available_sources` 与 `get_hotest_latest_news` 调用流程

## 2. 热点获取逻辑收口

- [x] 2.1 移除 `ChatService` 中直接使用 `SourceRepository`、`LocalCacheRepository`、`FeedService`、`ScraperEngine` 组装热点上下文的旁路逻辑
- [x] 2.2 使用用户 default API key 的内部认证 token 调用本地 MCP，并将 MCP 返回结果整理为注入给模型的热点上下文
- [x] 2.3 调整热点失败处理，覆盖 default key 缺失、MCP 不可用、rate limit 超限和工具调用失败等降级路径

## 3. 契约与验证

- [x] 3.1 确认本地 MCP 服务对应用内聊天客户端和外部客户端执行一致的鉴权、限流和 max_count/source_scope 约束
- [x] 3.2 回归验证热点请求会真实消耗 default API key 调用次数，并且只访问 `get_available_sources` 返回的数据源
- [x] 3.3 运行 OpenSpec 状态检查，确认 `route-llm-chat-hot-topics-through-mcp` 全部 artifacts 完成并可进入 `/opsx:apply`
