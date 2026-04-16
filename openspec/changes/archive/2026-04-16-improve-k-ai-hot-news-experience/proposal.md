## Why

当前 K-Ai 热点问答链路已经可用，但在消息气泡样式、热点拉取过程可视化、Thinking 展示和回答深度上仍然偏粗糙，影响产品观感和可理解性。同时，后端出现了已全局关闭数据源仍被请求的异常日志，说明启用态约束在某些路径上还不够严密，需要通过规格和实现一起收口。

## What Changes

- 调整 K-Ai 助手中“气泡新闻”消息样式，参考 `docs/k-ai-screen.html` 的热点气泡视觉，压缩无效高度、优化信息密度和卡片层次。
- 将热点拉取前端展示改为“多渠道逐条追加”的实时事件流，而不是复用单条状态文本反复替换；用户能连续看到“开始拉取 / 成功 / 跳过 / 失败”等渠道级进展。
- 在 LLM 回复阶段新增 Thinking 实时展示区，仅展示模型正在流出的实时思考片段，不回放完整历史 Thinking。
- 调整热点问答提示词与输出约束：热点请求不再只返回新闻模块，还要包含对新闻的见解、趋势判断、影响分析和不确定性说明。
- 增加“禁用数据源不得进入热点抓取链路”的一致性约束，排查并修复已全局关闭源仍被调度、刷新或注入到聊天上下文中的问题。

## Capabilities

### New Capabilities
<!-- 无新增 capability -->

### Modified Capabilities
- `llm-chat-ui`: 调整热点消息气泡样式，新增逐条追加的渠道状态流与实时 Thinking 展示，提升聊天过程可读性。
- `llm-chat-engine`: 调整热点问答 prompt 与流式事件模型，使回复同时覆盖新闻事实和分析见解，并输出可增量展示的 Thinking 片段。
- `scraper-engine`: 强化“仅允许启用源进入抓取/刷新链路”的约束，避免全局关闭数据源仍被请求。

## Impact

- **前端页面/状态管理**: `renderer/features/assistant/index.vue`、`renderer/stores/use-chat-store.js`
- **聊天编排与流式协议**: `core/chat/chat-service.js`、`core/chat/llm-client.js`、`main/ipc/chat.handler.js`、`preload/index.js`
- **数据源启用态约束**: `core/scraper/scraper-engine.js`、`core/feed/feed-service.js`、`core/source/source-repository.js` 及相关管理链路
- **需求文档**: 同步更新 `docs/需求文档.md` 中现有 F05、F12、F13 章节
