## MODIFIED Requirements

### Requirement: 热点上下文注入
当命中热点/新闻问答场景时，系统 SHALL 在请求模型前注入最新热点上下文，并默认要求模型在输出新闻事实的同时提供见解、趋势判断、影响分析和不确定性说明。

#### Scenario: 热点场景触发
- **WHEN** 用户通过热点快捷入口发送消息或消息内容涉及新闻/热点
- **THEN** 系统调用热点获取链路整理新闻标题、链接、来源和时效信息，注入 system prompt，并要求模型输出“新闻要点 + 分析见解”的结构化回答

#### Scenario: 默认不只返回新闻列表
- **WHEN** 用户发起泛化的热点获取请求且未明确要求“只列新闻”
- **THEN** 系统 SHALL 约束模型在新闻条目之外补充至少一组分析性内容，如脉络总结、潜在影响、后续观察点或不确定性提示

#### Scenario: 热点获取失败降级
- **WHEN** MCP 热点获取失败
- **THEN** 系统降级为普通对话，在回复中提示热点上下文暂不可用

### Requirement: Chat IPC 通道
系统 SHALL 提供 `chat` 领域 IPC 通道，并支持区分热点状态流、Thinking 增量和正文 token 的流式事件。

#### Scenario: IPC 通道注册
- **WHEN** 应用启动
- **THEN** 系统 SHALL 注册以下 IPC 通道：`chat:listSessions`、`chat:getSession`、`chat:createSession`、`chat:sendMessage`、`chat:sendMessageStream`、`chat:streamEvent`、`chat:abortStream`、`chat:deleteSession`

#### Scenario: 通过 IPC 发送消息
- **WHEN** 前端通过 `window.api.chat.sendMessageStream(sessionId, content, isHotTopic)` 调用
- **THEN** Main Process SHALL 通过 `chat:streamEvent` 连续发送结构化事件，事件类型至少包含 `status`、`thinking`、`token`、`done`、`error`

#### Scenario: 流式事件分层
- **WHEN** 模型进入 Thinking 或正文输出阶段
- **THEN** 系统 SHALL 将 Thinking 增量与最终正文 token 分离发送，前端无需通过字符串前缀自行猜测事件类型

## ADDED Requirements

### Requirement: 禁用源过滤
热点数据候选源 SHALL 先经过全局 enabled 状态过滤，再与用户默认 MCP key 的 source scope 和缓存/刷新策略求交集；任何已禁用源都不得进入网络请求阶段。

#### Scenario: 候选源求交
- **WHEN** 聊天服务构建本轮热点候选源列表
- **THEN** 系统 SHALL 仅从全局启用源中选取候选项，并与用户默认 MCP key 允许访问的 source scope 求交集

#### Scenario: 请求前二次校验
- **WHEN** 系统准备对某个源执行缺缓存补拉或过期同步刷新
- **THEN** 系统 SHALL 在发起网络请求前再次校验该源的 enabled 状态；若源已禁用，则跳过并记录结构化 `status` 事件

#### Scenario: 禁用源不注入上下文
- **WHEN** 某个源在本轮热点请求中被判定为禁用
- **THEN** 系统 SHALL 不将该源的缓存数据、抓取结果或失败信息注入给模型作为热点上下文

### Requirement: Thinking 增量输出
系统 SHALL 在模型提供 reasoning/thinking 增量时，将该增量作为独立流式事件发给前端，且不将 Thinking 内容并入最终 assistant 正文。

#### Scenario: 模型返回 Thinking 增量
- **WHEN** 流式响应 delta 中包含 reasoning/thinking 字段
- **THEN** 系统 SHALL 发送 `thinking` 事件，并仅将正文字段累计到最终 assistant message

#### Scenario: 用户中断或请求失败
- **WHEN** 流式响应被用户中断或因异常失败
- **THEN** 系统 SHALL 停止继续发送 Thinking 事件，且不要求保存历史 Thinking 文本
