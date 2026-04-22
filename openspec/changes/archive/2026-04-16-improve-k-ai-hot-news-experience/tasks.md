## 1. 流式协议与热点编排

- [x] 1.1 更新 `core/chat/llm-client.js`，解析模型返回的 Thinking/reasoning 增量字段，并与正文 token 分离输出
- [x] 1.2 更新 `core/chat/chat-service.js`，把热点拉取状态改为结构化事件流（start/success/skipped/failed），不再拼接单条覆盖式状态文案
- [x] 1.3 调整热点场景 system prompt，要求模型在新闻事实之外输出见解、趋势、影响和不确定性说明
- [x] 1.4 更新 `main/ipc/chat.handler.js` 与 `preload/index.js`，让 `chat:streamEvent` 支持 `thinking` 事件并保持现有 `status/token/done/error` 兼容

## 2. 禁用源约束与异常排查

- [x] 2.1 排查 `sputniknewscn` 等已关闭源仍被请求的调用链，确认是候选源筛选、状态同步还是执行前 guard 缺失
- [x] 2.2 更新 `core/chat/chat-service.js`，热点候选源只从全局启用源中选取，再与默认 MCP key 的 `source_scope` 求交集
- [x] 2.3 更新 `core/feed/feed-service.js` 与 `core/scraper/scraper-engine.js`，在缺缓存补拉、过期同步刷新和 `refreshOne()` 前统一执行 enabled 二次校验
- [x] 2.4 为禁用源跳过逻辑补充日志与返回状态，确保前端可展示 skipped/disabled 结果且不会继续发起网络请求

## 3. Assistant 前端体验

- [x] 3.1 更新 `renderer/stores/use-chat-store.js`，新增当前请求的状态事件列表与 `streamingThinking` 状态，并在完成/失败/中断时清理实时 Thinking
- [x] 3.2 更新 `renderer/features/assistant/index.vue`，将热点拉取过程渲染为逐条追加的渠道状态流，而不是单条状态文本
- [x] 3.3 参考 `docs/k-ai-screen.html` 改造热点新闻气泡和新闻卡片样式，压缩无效高度并优化多条新闻的视觉层次
- [x] 3.4 在 assistant 消息区域新增实时 Thinking 展示区，只显示本轮流式新增片段，未返回 Thinking 时自动隐藏

## 4. 验证与文档

- [x] 4.1 验证普通聊天、热点聊天、用户中断、无 Thinking 返回、禁用源切换后再次提问等关键场景
- [x] 4.2 补充或更新与聊天流式事件、热点状态流、禁用源 guard 相关的测试或回归脚本
- [x] 4.3 运行 OpenSpec 状态检查，确认 `improve-k-ai-hot-news-experience` 所需 artifacts 全部完成并可进入 `/opsx:apply`
