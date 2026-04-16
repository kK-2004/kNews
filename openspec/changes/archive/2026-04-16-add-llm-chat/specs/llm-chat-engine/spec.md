## ADDED Requirements

### Requirement: GLM 模型调用
系统 SHALL 通过 OpenAI 兼容 Chat Completions 协议调用 GLM 模型，默认模型为 `glm-4.7`。

#### Scenario: 正常调用
- **WHEN** ChatService 收到用户消息
- **THEN** 系统构造 messages 数组（含 system prompt + 历史消息 + 当前消息），POST 到配置的 API endpoint，返回模型回复

#### Scenario: API 配置不可读
- **WHEN** 前端尝试直接读取 API Key 或 endpoint
- **THEN** 系统 SHALL 确保前端无法通过任何渠道（preload、devtools）获取 API Key 明文

### Requirement: 运行时配置
GLM API Base URL、API Key 和模型名 SHALL 通过 `.env` 环境变量配置。

#### Scenario: 读取配置
- **WHEN** LlmClient 初始化
- **THEN** 从 `process.env.LLM_API_BASE`、`process.env.LLM_API_KEY`、`process.env.LLM_MODEL` 读取配置

#### Scenario: 配置缺失
- **WHEN** 必要的环境变量未配置
- **THEN** 系统在发送消息时返回明确的配置缺失错误

### Requirement: 热点上下文注入
当命中热点/新闻问答场景时，系统 SHALL 调用现有 MCP 能力获取最新热点上下文后再请求模型。

#### Scenario: 热点场景触发
- **WHEN** 用户通过热点快捷入口发送消息或消息内容涉及新闻/热点
- **THEN** 系统调用 MCP 工具获取最新新闻，将新闻标题、链接、来源注入 system message 后再请求模型

#### Scenario: 热点获取失败降级
- **WHEN** MCP 热点获取失败
- **THEN** 系统降级为普通对话，在回复中提示热点上下文暂不可用

### Requirement: 缓存优先热点获取
AI 对话获取热点数据时 SHALL 优先使用本地缓存（`LocalCacheRepository`），遵循 1h 过期阈值。

#### Scenario: 缓存未过期
- **WHEN** 数据源本地缓存存在且未过期（fetchedAt 距今 < 1h）
- **THEN** 系统直接使用缓存数据，返回新闻内容及 `fetchedAt` 更新时间

#### Scenario: 缓存已过期但存在数据
- **WHEN** 数据源本地缓存已过期（fetchedAt 距今 > 1h）但存在数据
- **THEN** 系统先使用过期缓存数据返回，后台静默触发 `refreshOne()` 刷新供下次使用

#### Scenario: 缓存完全缺失
- **WHEN** 数据源本地缓存不存在
- **THEN** 系统同步等待 `refreshOne()` 完成爬取后返回新数据

### Requirement: Level 权限刷新控制
AI 对话获取热点时 SHALL 检查用户 level 决定刷新策略。

#### Scenario: 付费用户（level >= 1）获取热点
- **WHEN** 用户 level >= 1 且数据源缓存已过期
- **THEN** 系统同步触发 `refreshOne()` 刷新该数据源，等待爬取完成后返回最新数据

#### Scenario: 免费用户（level 0）获取热点
- **WHEN** 用户 level 0 且数据源缓存已过期
- **THEN** 系统仅使用现有缓存数据（即使过期），后台静默刷新供下次使用，不阻塞等待

#### Scenario: 数据时效性展示
- **WHEN** 热点数据返回给前端
- **THEN** 系统 SHALL 返回每个数据源的 `fetchedAt` 时间戳，前端可展示数据时效性

### Requirement: Chat IPC 通道
系统 SHALL 提供 `chat` 领域 IPC 通道。

#### Scenario: IPC 通道注册
- **WHEN** 应用启动
- **THEN** 系统 SHALL 注册以下 IPC 通道：`chat:listSessions`、`chat:getSession`、`chat:createSession`、`chat:sendMessage`、`chat:sendMessageStream`、`chat:streamEvent`、`chat:abortStream`、`chat:deleteSession`

#### Scenario: 通过 IPC 发送消息
- **WHEN** 前端通过 `window.api.chat.sendMessage(sessionId, content)` 调用
- **THEN** Main Process 调用 ChatService 处理消息，返回 assistant 回复
