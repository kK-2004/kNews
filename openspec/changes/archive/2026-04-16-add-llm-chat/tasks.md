## 1. 后端基础设施

- [x] 1.1 创建 `core/chat/llm-client.js`：封装 OpenAI 兼容 Chat Completions 请求，支持环境变量配置（`LLM_API_BASE`、`LLM_API_KEY`、`LLM_MODEL`）
- [x] 1.2 创建 `core/chat/chat-repository.js`：文件系统持久化，读写 `~/.knews/chat/<sessionId>.json`，支持 listSessions、getSession、saveSession、deleteSession
- [x] 1.3 创建 `core/chat/chat-service.js`：编排 ChatService（创建会话、发送消息、删除会话），注入热点上下文，调用 LlmClient
- [x] 1.4 热点上下文注入：ChatService.sendMessage 中判断热点场景，通过 FeedService/SourceService 获取缓存新闻，构造 system message

## 2. IPC 注册与 Preload 桥接

- [x] 2.1 创建 `main/ipc/chat.handler.js`：注册 `chat:listSessions`、`chat:getSession`、`chat:createSession`、`chat:sendMessage`、`chat:deleteSession` 通道
- [x] 2.2 更新 `main/bootstrap.js`：初始化 ChatRepository、LlmClient、ChatService 并传入 IPC 注册
- [x] 2.3 更新 `preload/index.js`：新增 `window.api.chat` 桥接（listSessions、getSession、createSession、sendMessage、deleteSession）

## 3. 环境配置

- [x] 3.1 更新 `.env.example`：添加 `LLM_API_BASE`、`LLM_API_KEY`、`LLM_MODEL` 示例配置
- [x] 3.2 更新 `.env.development`：添加开发环境 GLM API 配置

## 4. 流式响应与 Agent 状态

- [x] 4.1 更新 `core/chat/llm-client.js`：新增 `chatStream(messages, onChunk)` 方法，使用 `stream: true` + ReadableStream 解析 SSE
- [x] 4.2 更新 `core/chat/chat-service.js`：新增 `sendMessageStream(sessionId, content, options, onEvent)` 方法，逐源上报 agent 状态 + 流式 token 推送
- [x] 4.3 更新 `main/ipc/chat.handler.js`：新增 `chat:sendMessageStream` 通道（ipcMain.on）+ `chat:streamEvent` 推送（event.sender.send）
- [x] 4.4 更新 `preload/index.js`：新增 `chat.sendMessageStream(sessionId, content, isHotTopic, callbacks)` 桥接

## 5. 前端页面与组件

- [x] 5.1 创建 `renderer/features/assistant/index.vue`：集成侧边栏、消息区、输入区、热点入口的单页面
- [x] 5.2 实现侧边栏：新建对话按钮、历史会话列表、会话切换、删除会话
- [x] 5.3 实现消息流：用户/assistant 消息气泡、加载指示器、错误提示、自动滚动
- [x] 5.4 实现输入区：textarea 输入框、发送按钮、禁用状态管理、Enter 发送
- [x] 5.5 实现热点快捷入口：展示热点问题卡片、点击触发对话
- [x] 5.6 创建 `renderer/stores/use-chat-store.js`：管理会话列表、当前会话、消息发送状态
- [x] 5.7 更新 `renderer/stores/use-chat-store.js`：新增 `agentStatus`、`streamingContent` 状态，改造 sendMessage 为流式调用
- [x] 5.8 更新 `renderer/features/assistant/index.vue`：打字机效果展示 + Agent 状态行 + 可点击新闻卡片组件

## 6. 路由与导航集成

- [x] 6.1 更新 `renderer/router/index.js`：添加 `/assistant` 路由指向 `renderer/features/assistant/index.vue`
- [x] 6.2 更新应用导航栏：添加 K-Ai 入口（桌面导航栏 + 移动底部导航）

## 7. 主题适配

- [x] 7.1 确保对话页面复用现有 `.theme-light` / `.theme-dark` CSS 变量体系，消息气泡、侧边栏、输入区均适配双主题

## 8. 注册时自动创建内部 MCP API Key

- [x] 8.1 新增数据库迁移：`api_key` 表添加 `is_default` 布尔字段（默认 `false`）；遍历所有已有用户，为尚无 default key 的用户按其 level 创建一条 `is_default = true` 的 MCP API Key，默认数据源为 `['douyin', 'weibo', 'github', 'toutiao']`，限流参数取 `LEVEL_PERMISSIONS[level]` 最大值
- [x] 8.2 更新 `core/user/user-service.js`：`syncUser` 创建新用户后，自动调用 `ApiKeyRepository` 创建一条 `is_default = true` 的 MCP API Key，名称为 UUID，默认数据源为 `['douyin', 'weibo', 'github', 'toutiao']`，限流参数取 `LEVEL_PERMISSIONS[level]` 最大值
- [x] 8.3 更新 `core/auth/api-key-repository.js`：新增 `findByUserIdAndDefault(userId)` 方法查找用户的 default key
- [x] 8.4 更新 `core/subscription/subscription-service.js`：`_syncApiKeyPermissions` 已遍历所有 active key，确认 default key 也被覆盖
- [x] 8.5 更新 `main/ipc/admin.handler.js`：`admin:deleteApiKey` 增加 `is_default` 检查，拒绝删除 default key；`admin:listApiKeys` 返回 `is_default` 字段；`admin:createApiKey` 保持不变
- [x] 8.6 更新前端 API Key 管理页面：default key 隐藏删除按钮，显示数据源编辑入口；非 default key 保持原有行为
