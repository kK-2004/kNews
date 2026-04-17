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

### Requirement: MCP 结构化热点上下文
聊天热点链路 SHALL 按标准 MCP 客户端流程调用本地 `/mcp`，并将热点工具结果转换为可供 UI 直接消费的结构化 JSON 数据，而不是继续依赖文本解析生成卡片字段。

#### Scenario: 先查询可用源再查询热点
- **WHEN** 聊天服务开始构建单次热点上下文
- **THEN** 系统 MUST 先调用 `get_available_sources` 获取当前 default API key 允许访问的数据源列表和数量上限，再仅对这些返回的 source id 调用 `get_hotest_latest_news`

#### Scenario: 热点卡片使用结构化字段
- **WHEN** 聊天服务向前端推送热点卡片数据
- **THEN** 每条新闻数据 MUST 至少包含稳定 `topicId`、`title`、`url`、`sourceId`、`sourceName` 与 `publishedAt` 字段，供 UI 直接渲染

#### Scenario: 不允许旁路直连热点实现
- **WHEN** 聊天服务获取热点数据
- **THEN** 系统 MUST NOT 直接读取本地缓存、feed service 或 scraper engine 作为热点来源，热点上下文仅可来自 MCP 工具调用结果

### Requirement: 热点新闻一句话描述并发补全
当热点卡片已生成时，聊天编排层 SHALL 为每条新闻并发请求一句话描述，并且这些描述任务必须与原 llm-chat 主回答流同时进行，不得阻塞正文输出。

#### Scenario: 描述任务与主回答并行启动
- **WHEN** 热点卡片结构化数据已准备完成并开始请求主回答
- **THEN** 系统 MUST 在不等待主回答结束的情况下，为每条新闻启动异步描述生成任务

#### Scenario: 描述任务使用 tool_calls 返回结构化结果
- **WHEN** 系统请求单条新闻的一句话描述
- **THEN** 描述生成链路 MUST 使用 `tool_calls` 返回至少包含 `topicId` 和 `summary` 的结构化结果，以便前端定位并更新对应新闻项

#### Scenario: 单条描述失败不影响主回答
- **WHEN** 某条新闻的一句话描述生成失败、超时或为空
- **THEN** 系统 SHALL 仅影响该新闻项的描述展示，不得中断本轮热点主回答、其它新闻描述任务或已完成的热点卡片渲染
