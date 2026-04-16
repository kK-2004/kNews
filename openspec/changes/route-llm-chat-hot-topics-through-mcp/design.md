## Context

当前热点问答实现位于 `core/chat/chat-service.js`，它会读取当前用户的 default API key，但热点内容本身仍由聊天服务直接访问 `SourceRepository`、`LocalCacheRepository`、`FeedService` 与 `ScraperEngine` 组装。这意味着聊天链路与本地 MCP Server 维护了两套相似但不一致的热点获取逻辑：一套对外通过 `/mcp` 暴露，另一套仅供内部聊天使用。

这类双轨实现已经带来了可观察偏差：

- default API key 的 `source_scope` 与 `max_count` 只是被“借用”，但 `rate_limit`、鉴权、工具调用顺序并未真正生效。
- 聊天热点结果与外部 MCP 客户端调用结果不保证一致，后续 MCP 工具行为调整时容易遗漏聊天链路。
- 聊天服务直接依赖本地缓存与抓取实现，增加了跨层耦合，也让“热点来自 MCP 服务”的需求难以验证。

本次变更横跨 `core/chat/`、`core/mcp/` 和 `main/bootstrap.js`，属于跨模块契约收敛。目标不是更换 LLM 或 UI，而是把热点来源单点收口到本地 MCP 服务。

## Goals / Non-Goals

**Goals:**
- 让热点问答只通过用户 default API key 调用本地 `/mcp` 获取热点上下文。
- 让 default API key 的 `source_scope`、`max_count`、`rate_limit`、有效性校验对聊天热点请求真实生效。
- 用官方 MCP client 流程统一初始化、`get_available_sources` 调用和 `get_hotest_latest_news` 调用，避免手写半套 JSON-RPC / SSE 协议。
- 保留热点失败降级为普通对话的现有产品行为。

**Non-Goals:**
- 不改动模型供应商、LLM prompt 总体风格或流式事件协议。
- 不重写 MCP 工具实现本身的业务逻辑，只补充其对“内部聊天客户端”的契约说明。
- 不在本次设计中引入远程 MCP 或额外代理层，热点仍来自本机启动的 MCP Server。

## Decisions

### D1. 聊天服务通过 SDK MCP Client 调用本地 `/mcp`

**选择**: 在 `ChatService` 内引入 `@modelcontextprotocol/sdk` 的 `Client` 与 `StreamableHTTPClientTransport`，把聊天热点获取封装为一个正式的 MCP 客户端调用流程。

**原因**:
- 本地 `/mcp` 当前返回的是 Streamable HTTP + SSE 响应，直接手搓 `fetch` 协议解析风险高，也容易偏离 SDK 行为。
- SDK client 会自动处理 `initialize`、`notifications/initialized`、`mcp-protocol-version` 等细节，能最大程度保证内部调用与外部 MCP 客户端一致。
- 这让“chat 是否真的经过 MCP”可以通过代码结构直接判断，而不是靠约定。

**备选方案**:
- 继续在 `ChatService` 中手写 JSON-RPC 请求和 SSE 解析。
  放弃原因：协议细节脆弱，维护成本高，而且无法证明与标准 MCP 客户端等价。
- 在 `McpServer` 上额外挂内部直接调用方法，绕开 HTTP。
  放弃原因：这会再次形成第二条旁路，违背本次收口目标。

### D2. 默认 key 直接使用数据库中的 `key_hash` 作为内部 Bearer token

**选择**: 聊天服务获取 default API key 后，使用其数据库行中的 `key_hash` 作为 `Authorization: Bearer <token>` 调用 `/mcp`。

**原因**:
- 当前服务端已经兼容 default key 以存储 hash 值直接认证，且明文 key 并未保存在数据库中。
- 这样无需改表结构、无需为聊天链路单独签发新凭证，也不需要把明文 key 重新暴露到应用内部。
- 该方案与现有 default key 创建逻辑兼容，实施面最小。

**备选方案**:
- 新增 internal-only service token。
  放弃原因：会增加新的凭证生命周期与权限模型，超出本次范围。
- 将 default key 明文持久化以供内部调用。
  放弃原因：会降低凭证安全性，没有必要。

### D3. 热点获取遵循“先可用源，再逐源取热点”的两步调用

**选择**: 单次热点请求先调用 `get_available_sources` 获取当前 key 允许访问的数据源与 `max_count`，再仅对返回的 source id 调用 `get_hotest_latest_news`。

**原因**:
- 这与 MCP capability 的 intended flow 一致，也能保证聊天链路不会绕过 source scope 推断可用源。
- 如果后续 MCP 工具在 `get_available_sources` 中增加额外约束，聊天链路会自动继承。
- 通过“先列后取”可以把状态提示绑定到真实可访问源，而不是本地猜测源列表。

**备选方案**:
- 直接读取 default key 的 `source_scope` 后批量调 `get_hotest_latest_news`。
  放弃原因：仍会绕过 MCP 的可用源决策，不满足需求文档新增约束。

### D4. `ChatService` 只保留热点上下文整形和降级逻辑，不再直接抓取或刷新源

**选择**: 将 `_fetchHotTopics()` 收敛为“通过 MCP 取数 -> 解析工具结果 -> 生成 prompt 上下文”的职责，不再直接访问 `feedService`、`localCache` 或 `scraperEngine`。

**原因**:
- 这样热点来源单一，避免 MCP 和 chat 双实现分叉。
- `ChatService` 与抓取/缓存细节解绑后，更符合“聊天编排层”的定位。
- 失败场景也会更清晰：失败来自 default key 缺失、MCP 初始化失败、工具报错或 rate limit，而不是本地多处实现混杂。

**备选方案**:
- 保留当前本地链路作为 fallback，仅在部分失败场景下切回直连。
  放弃原因：这会让 rate limit 和行为一致性重新失真，削弱本次变更价值。

### D5. 通过依赖注入向聊天服务暴露 MCP 端口，而不是硬编码 12580

**选择**: 在应用启动时把已启动的 `mcpServer` 实例注入 `ChatService`，由聊天服务读取 `mcpServer.port` 组装本地 MCP URL。

**原因**:
- `McpServer` 存在端口顺延逻辑，不能假定始终是 12580。
- 直接注入实例能避免聊天服务重新读取磁盘配置文件或依赖固定端口。
- 该依赖仅用于发现本地服务地址，不会改变聊天服务对 MCP 的客户端角色。

**备选方案**:
- 每次从 `~/.knews/mcp-port.json` 读取端口。
  放弃原因：增加 IO 依赖，而且与已在进程内持有的实例相比重复。

## Risks / Trade-offs

- [内部热点请求也开始消耗 default API key 的 rate limit] → 这是需求目标之一，但会让免费用户更快遇到限流；通过错误文案明确提示“热点上下文暂不可用”来缓冲体验。
- [MCP client 初始化开销高于本地直连] → 单次热点请求会多一次初始化握手，但换来行为统一；如果后续需要优化，可在实现阶段评估复用 client/transport。
- [MCP 工具当前文本输出格式变化会影响聊天解析] → 聊天服务应以更稳健的 markdown/link 解析方式消费工具结果，必要时在 spec 中约束最小输出结构。
- [本地 MCP 服务未启动或启动异常会直接影响热点问答] → 保持现有降级策略，失败时退回普通对话而不是整条消息失败。

## Migration Plan

1. 更新 OpenSpec spec，先把“聊天热点必须通过本地 MCP”写入契约。
2. 在 `main/bootstrap.js` 中把 `mcpServer` 注入 `ChatService`，为聊天服务提供实际监听端口。
3. 在 `core/chat/chat-service.js` 中移除直连 feed/cache/scraper 的热点逻辑，替换为 SDK MCP client 调用流程。
4. 回归验证 default key 无效、rate limit 超限、source scope 收窄和 MCP 服务不可用等场景下的降级行为。

**回滚策略**:
- 如果实现阶段发现 SDK client 与当前本地 `/mcp` 兼容性存在问题，可先回滚到现有直连逻辑，但保留本次 proposal/spec 作为后续收口目标。

## Open Questions

- `get_available_sources` 当前文本返回是否足够稳定，还是实现阶段应顺手为内部客户端补充更易解析的结构化输出。
- 单次热点请求是否需要串行调用每个 source，还是可以并行发起 `get_hotest_latest_news` 并按 source 顺序整理结果；设计默认允许并行，但实现时需结合状态展示体验决定。
