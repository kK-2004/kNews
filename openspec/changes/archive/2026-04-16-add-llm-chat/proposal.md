## Why

kNews Desktop 已具备 MCP 服务和 60+ 新闻源爬取能力，但用户无法在应用内直接通过 AI 对话来消费这些数据。新增 LLM 对话功能可将实时热点与 AI 问答无缝结合，提升产品的差异化和用户粘性。

## What Changes

- 新增独立的 K-Ai 对话助手页面（`/assistant` 路由），包含精简侧边栏（会话列表）、消息主区域、输入区和热点快捷入口
- 新增 GLM 对话编排层（Main Process），通过 OpenAI 兼容 Chat Completions 协议调用 `glm-4.7` 模型
- **注册时自动创建内部 MCP API Key**：用户注册后，系统自动为其创建一条 `is_default = true` 的 MCP API Key，名称为 UUID，默认勾选抖音、微博、GitHub trending、今日头条四个数据源，限流参数（`rate_limit`、`max_count`）取当前用户 level 对应的最大值。该 Key 专供 K-Ai 对话内部调用 MCP 使用，不可被用户手动删除（前端隐藏删除按钮），但允许用户修改其数据源范围（受全局 enabled 数据源约束）。用户等级升降时，该 Key 的限流参数随 `_syncApiKeyPermissions` 同步更新
- **流式响应（SSE）**：LLM 调用使用 `stream: true`，通过 IPC 事件逐 token 推送到前端，实现打字机效果
- **流式中断**：用户可在 AI 生成过程中点击停止按钮中断回复，已接收内容保留并标记"已中断"
- **Agent 状态展示**：在获取热点数据时逐源上报状态（如"正在调用 MCP 获取【抖音】热点"），前端实时展示
- **可点击新闻卡片**：AI 回复中的新闻条目渲染为可点击卡片组件（左侧蓝色竖线指示），点击在浏览器中打开原文
- **缓存优先热点获取**：AI 对话获取热点数据时优先读取本地缓存（`LocalCacheRepository`），遵循 1h 过期阈值：缓存未过期直接使用；缓存过期但存在数据则先用旧数据、后台静默刷新；缓存缺失则同步等待爬取完成
- **Level 权限刷新控制**：AI 对话获取热点时检查用户 level：level >= 1 有即时刷新资格，可触发过期数据源同步爬取；level 0 无即时刷新资格，仅使用缓存数据。两条路径均返回数据的 `fetchedAt` 更新时间
- **会话 5 分钟阈值**：页面加载时检查最近会话的最后活跃时间，5 分钟内自动恢复该会话，否则展示空白新对话页
- **设置页加载状态**：所有设置页（MCP API Key、管理后台各页、新闻模块）在数据加载期间显示加载指示器，避免空白闪烁
- 热点场景复用现有 MCP 工具能力（`get_hotest_latest_news`、`get_available_sources`），在请求模型前注入热点上下文
- 新增 `chat` 领域 IPC 通道（会话 CRUD、消息发送、流式消息、流式中断），前端通过 preload 桥接调用
- 聊天记录基于文件系统持久化到 `~/.knews/chat/`，支持重启恢复
- 前端 UI 复用现有亮/暗主题切换系统，视觉参照 Stitch 设计稿
- 主进程新增 `ChatService`、`ChatRepository`、`LlmClient` 模块

## Capabilities

### New Capabilities
- `llm-chat-ui`: K-Ai 对话助手前端页面，包含侧边栏会话列表、消息流、输入区、热点快捷入口，流式打字机效果，Agent 状态展示，可点击新闻卡片，流式中断按钮，复用亮暗主题，会话 5 分钟阈值自动恢复
- `llm-chat-engine`: GLM 对话编排后端，包含 LLM 流式客户端、缓存优先热点获取（Level 权限刷新控制）、逐源 Agent 状态上报、IPC 流式通道注册、流式中断支持
- `chat-persistence`: 对话记录文件系统持久化，会话与消息的 CRUD，重启恢复
- `default-mcp-key`: 用户注册时自动创建内部 MCP API Key，供 K-Ai 对话使用，不可删除但可修改数据源，等级升降时同步限流参数

### Modified Capabilities
<!-- 无需修改已有 spec -->

## Impact

- **新增文件**: `core/chat/` 目录（chat-service.js、chat-repository.js、llm-client.js）、`main/ipc/chat.handler.js`、`renderer/features/assistant/` 目录
- **修改文件**: `preload/index.js`（新增 chat API 桥接）、`renderer/router/index.js`（新增 /assistant 路由）、`main/bootstrap.js`（注册 chat 服务）、`renderer/features/settings/components/`（加载状态指示器）
- **外部依赖**: GLM API（`https://newapi.ksite.xin/v1/chat/completions`），API Key 通过 `.env` 配置
- **存储**: `~/.knews/chat/` 目录用于持久化会话与消息 JSON 文件
