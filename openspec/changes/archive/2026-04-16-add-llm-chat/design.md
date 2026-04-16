## Context

kNews Desktop 是一个 Electron + Vue 3 桌面新闻聚合应用。当前架构：

- **Main Process**：通过 `bootstrap.js` 初始化各服务层，IPC handler 按 `main/ipc/<domain>.handler.js` 组织
- **Core 层**：`core/<domain>/` 目录包含 service + repository，如 `core/mcp/mcp-server.js` 提供 HTTP MCP 服务
- **Renderer**：Vue 3 SPA，路由 `renderer/router/index.js`，状态管理 `renderer/stores/`
- **Preload**：`preload/index.js` 通过 `contextBridge` 暴露 `window.api.<domain>` 桥接
- **主题**：CSS 变量体系 `.theme-light` / `.theme-dark`，通过 `document.documentElement.classList` 切换
- **存储**：已有 `~/.knews/` 目录用于 MCP 端口配置和本地缓存

## Goals / Non-Goals

**Goals:**
- 提供独立的 AI 对话页面，复用现有亮暗主题和导航结构
- 通过 OpenAI 兼容协议调用 GLM 模型，配置通过环境变量管理
- 热点场景复用 MCP 已有能力注入新闻上下文
- 聊天记录持久化到本地文件系统，重启后恢复
- **流式响应（SSE streaming）**：LLM 调用使用 `stream: true`，逐 token 推送到前端实现打字机效果
- **流式中断**：用户可在 AI 生成过程中点击停止按钮，已接收内容保留并标记"已中断"
- **Agent 状态展示**：获取热点数据时逐源上报进度状态，前端实时显示当前操作
- **可点击新闻卡片**：AI 回复中的新闻条目渲染为可交互卡片组件
- **缓存优先热点获取**：AI 对话获取热点数据时优先使用本地缓存，遵循 1h 过期阈值
- **Level 权限刷新控制**：检查用户 level 决定是否允许即时刷新过期数据源
- **会话 5 分钟阈值**：页面加载时自动恢复 5 分钟内的最近会话
- **注册时自动创建内部 MCP API Key**：用户首次注册/登录时自动创建 default API Key，专供 K-Ai 内部调用 MCP

**Non-Goals:**
- 不做多用户聊天数据隔离（本期基于设备维度）
- ~~不做流式输出（SSE），使用一次性完整响应~~（已变更为流式）
- 不做数据库持久化（使用文件系统 JSON）
- 不做语音/图片输入输出

## Decisions

### D1: 文件系统持久化而非数据库

**选择**: 会话和消息存储为 `~/.knews/chat/<sessionId>.json` 独立文件

**理由**:
- 无需新增数据库表和迁移
- 与现有 `~/.knews/` 目录约定一致
- 单文件读写简单，无需 ORM
- 不依赖网络和 Supabase

**替代方案**: Supabase 表存储 — 需新增迁移、增加网络延迟、未登录用户无法使用

### D2: OpenAI 兼容协议封装为 LlmClient

**选择**: 独立 `core/chat/llm-client.js` 模块，封装 fetch 调用

**理由**:
- 不引入 openai SDK 依赖，保持轻量
- 与现有项目风格一致（无重外部 SDK）
- 配置通过 `process.env` 注入，前端不可读

**替代方案**: 使用 openai npm 包 — 引入重依赖，协议简单无需

### D3: MCP 热点注入策略

**选择**: 在 `ChatService` 中判断是否命中热点场景，通过 `LocalCacheRepository` 直接读取本地缓存，注入 system message

**理由**:
- 复用现有本地缓存体系，避免每次 AI 对话都触发网络爬取
- 不走 HTTP MCP 接口，避免网络开销和认证
- 1h 过期阈值与 ScraperEngine 定时调度一致

**缓存优先策略**:
1. 直接通过 `localCache.read(sourceId)` 读取每个数据源的缓存
2. 使用 `localCache.isStale(sourceId)` 判断是否过期（默认 1h）
3. 缓存未过期 → 直接使用，返回 `fetchedAt` 更新时间
4. 缓存已过期但存在数据 → 先用过期数据返回，后台静默触发 `refreshOne()`
5. 缓存完全缺失 → 同步等待 `refreshOne()` 完成

**Level 权限刷新控制**:
- 用户 level >= 1（Plus/Pro）：有即时刷新资格，可对过期数据源同步触发爬取后返回
- 用户 level 0（Free）：无即时刷新资格，仅使用现有缓存数据（即使过期），后台静默刷新供下次使用
- 权限来源：`authContext.getSession()` 获取当前用户信息，查询 `LEVEL_PERMISSIONS` 对照
- 两条路径均返回数据的 `fetchedAt` 时间戳，前端可展示数据时效性

### D4: 前端路由与组件结构

**选择**: `/assistant` 路由，`renderer/features/assistant/` 目录，参照 Stitch 设计稿实现

**理由**:
- 与现有 features 目录约定一致（home/reader/settings/subscribe）
- 独立路由，不影响现有页面
- 复用主题 CSS 变量体系

### D5: IPC 通道设计

**选择**: `chat` 领域 IPC，通道前缀 `chat:`

| 通道 | 方向 | 说明 |
|------|------|------|
| `chat:listSessions` | renderer→main | 获取会话列表 |
| `chat:getSession` | renderer→main | 获取会话详情（含消息） |
| `chat:createSession` | renderer→main | 新建空会话 |
| `chat:sendMessage` | renderer→main | 发送消息并获取 AI 回复（一次性，兼容保留） |
| `chat:sendMessageStream` | renderer→main→renderer | 流式发送消息，逐事件推送 |
| `chat:streamEvent` | main→renderer | 流式事件推送（status/token/done/error） |
| `chat:abortStream` | renderer→main | 中断当前流式响应 |
| `chat:deleteSession` | renderer→main | 删除会话 |

**流式通道机制**:
- renderer 通过 `ipcRenderer.send('chat:sendMessageStream', ...)` 发起请求
- main 通过 `event.sender.send('chat:streamEvent', { type, ... })` 逐事件推送
- 事件类型: `{ type: 'status', text }` | `{ type: 'token', text }` | `{ type: 'done', userMessage, assistantMessage }` | `{ type: 'error', error }`
- renderer 在 `done`/`error` 后自动移除监听

### D6: Agent 状态上报策略

**选择**: `ChatService` 在 `_fetchHotTopics` 中逐源上报状态

**理由**:
- 热点数据来自 60+ 源，获取耗时较长
- 逐源上报让用户感知到系统正在工作，而非卡死
- 状态文本格式: "正在获取热点数据..." → "正在调用 MCP 获取【抖音】热点..." → "正在调用 MCP 获取【微博】热点..."

### D7: 可点击新闻卡片

**选择**: 前端解析 AI 回复中的 markdown 链接（`[标题](url)` 格式），渲染为可点击卡片

**理由**:
- 通过 system prompt 指导 LLM 以结构化格式输出新闻
- 前端使用正则提取链接，渲染为独立卡片组件
- 卡片点击使用 `window.open(url)` 在系统浏览器中打开

### D8: 注册时自动创建内部 MCP API Key

**选择**: 在 `UserService.syncUser` 创建新用户后，立即为其创建一条 `is_default = true` 的 MCP API Key

**规则**:
- Key 名称：UUID 格式（不暴露给用户）
- 默认数据源：抖音 (`douyin`)、微博 (`weibo`)、GitHub trending (`github`)、今日头条 (`toutiao`)
- 限流参数：取用户当前 level 对应 `LEVEL_PERMISSIONS` 的最大值
  - level 0: `rate_limit = 3`, `max_count = 5`
  - level 1: `rate_limit = 20`, `max_count = 10`
  - level 2: `rate_limit = -1`(无限), `max_count = 50`
- `is_default = true` 标记：该 Key 不可被用户删除（前端隐藏删除按钮），但允许用户修改 `source_scope`（受全局 enabled 数据源约束）
- 用户等级升降时，`SubscriptionService._syncApiKeyPermissions` 同步更新该 Key 的限流参数
- 该 Key 用于 K-Ai 对话内部调用 MCP 服务，不作为外部 API Key 展示给用户

**实现要点**:
- `api_key` 表需新增 `is_default` 布尔字段（迁移脚本）
- `UserService.syncUser` 创建新用户后调用 `ApiKeyRepository` 创建 default Key
- `admin:deleteApiKey` handler 检查 `is_default`，拒绝删除
- 前端 API Key 管理页面：default Key 显示数据源编辑入口，隐藏删除按钮
- `admin:listApiKeys` 返回中包含 `is_default` 字段

**理由**:
- K-Ai 对话需要通过 MCP API Key 鉴权才能调用 `get_hotest_latest_news` 等工具
- 自动创建降低用户门槛，无需手动配置即可使用 AI 对话功能
- 允许修改数据源让用户能自定义 AI 获取的新闻范围
- 不可删除保证 K-Ai 功能始终可用

### D9: 流式中断

**选择**: 前端 stop 按钮 + `AbortController` 链路

**机制**:
- 前端 `chatStore.abortSending()` 调用 `window.api.chat.abortStream()` IPC
- Main Process `chatService.abortStream()` → `llmClient.abortActive()` 终止活跃 HTTP 请求
- 前端保留已接收的 `streamingContent`，追加"_[已中断]_"标记后存入消息列表
- 生成期间发送按钮替换为停止按钮（方块图标），点击即可中断

### D10: 缓存优先与 Level 权限刷新控制

**选择**: `_fetchHotTopics` 方法直接使用 `LocalCacheRepository`，根据用户 level 决定刷新策略

**理由**:
- 避免每次 AI 对话都触发网络爬取，减轻源站压力
- Level 权限区分免费/付费用户体验：免费用户使用缓存即可满足基本需求，付费用户获得更实时的数据

**实现要点**:
- `ChatService` 构造函数注入 `localCache` 依赖
- 通过 `authContext.getSession()` 获取用户 level
- level 0：仅 `localCache.read()`，过期也不阻塞等待
- level >= 1：允许 `scraperEngine.refreshOne()` 同步刷新过期源
- 所有场景返回 `fetchedAt` 时间戳

### D11: 会话 5 分钟阈值

**选择**: `loadSessions()` 中检查最近会话的 `updatedAt`，5 分钟内自动选中

**理由**:
- 用户频繁切换页面时无需每次新建会话
- 5 分钟阈值足够覆盖一次完整的浏览-对话周期

### D12: 设置页加载状态

**选择**: 所有设置页统一使用 `loading` ref + spinner 过渡

**实现**:
- `loading = ref(true)`，`load()` 函数 `finally { loading.value = false }`
- 模板 `v-if="loading"` 显示 spinner，`v-else-if` 显示数据，`v-else` 显示空状态
- 覆盖页面：MCP API Key 管理、管理后台（API Keys、Datasources、Users）、新闻模块

## Risks / Trade-offs

- **[GLM API 可用性]** → 前端展示可读错误信息，不丢失已有消息；配置 fallback 模型名
- **[文件系统并发]** → 单文件 JSON 读写，Main Process 单线程无并发问题
- **[会话数量增长]** → 列表只读元数据（id/title/updatedAt），按需加载消息详情
- **[MCP 热点获取失败]** → 降级为普通对话，提示热点不可用
