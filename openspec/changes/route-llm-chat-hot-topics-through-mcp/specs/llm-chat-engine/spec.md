## MODIFIED Requirements

### Requirement: 热点上下文注入
当命中热点/新闻问答场景时，系统 SHALL 在请求模型前通过用户 default MCP API key 调用本地 `/mcp` 端点获取最新热点上下文，并默认要求模型在输出新闻事实的同时提供见解、趋势判断、影响分析和不确定性说明。

#### Scenario: 热点场景触发
- **WHEN** 用户通过热点快捷入口发送消息或消息内容涉及新闻/热点
- **THEN** 系统 MUST 先使用用户 default MCP API key 初始化本地 MCP 客户端，调用热点获取链路整理新闻标题、链接、来源和时效信息，注入 system prompt，并要求模型输出“新闻要点 + 分析见解”的结构化回答

#### Scenario: 默认不只返回新闻列表
- **WHEN** 用户发起泛化的热点获取请求且未明确要求“只列新闻”
- **THEN** 系统 SHALL 约束模型在新闻条目之外补充至少一组分析性内容，如脉络总结、潜在影响、后续观察点或不确定性提示

#### Scenario: 热点获取失败降级
- **WHEN** default MCP API key 缺失、MCP 调用失败、限流超限或工具返回错误
- **THEN** 系统降级为普通对话，在回复中提示热点上下文暂不可用

## ADDED Requirements

### Requirement: 本地 MCP 热点调用流程
聊天热点链路 SHALL 按标准 MCP 客户端流程调用本地 `/mcp`，不得直接访问 `LocalCacheRepository`、`FeedService` 或 `ScraperEngine` 组装热点数据。

#### Scenario: 先查询可用源再查询热点
- **WHEN** 聊天服务开始构建单次热点上下文
- **THEN** 系统 MUST 先调用 `get_available_sources` 获取当前 default API key 允许访问的数据源列表和数量上限，再仅对这些返回的 source id 调用 `get_hotest_latest_news`

#### Scenario: 不允许旁路直连热点实现
- **WHEN** 聊天服务获取热点数据
- **THEN** 系统 MUST NOT 直接读取本地缓存、feed service 或 scraper engine 作为热点来源，热点上下文仅可来自 MCP 工具调用结果

#### Scenario: 真实继承 default key 限制
- **WHEN** default API key 的 `source_scope`、`max_count` 或 `rate_limit` 发生变化
- **THEN** 后续聊天热点请求 SHALL 自动继承这些限制，无需聊天服务维护独立的热点权限逻辑
