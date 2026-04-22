## Why

当前 K-Ai 热点问答虽然已经通过本地 MCP 获取热点，但前端仍主要依赖聊天侧自行整形后的数据来渲染卡片，单条新闻也缺少可渐进补全的一句话说明。这让“热点卡片”和“MCP 返回结果”之间仍有一层易漂移的中间格式，也无法在不改现有卡片样式的前提下并行补充更易读的摘要信息。

## What Changes

- 保持现有热点新闻卡片的视觉样式、层级和交互不变，只把卡片数据源切换为基于 MCP JSON 的结构化渲染。
- 调整聊天热点链路，使 `get_hotest_latest_news` 返回的结构化字段可被 `llm-chat` 直接消费，不再依赖 markdown/text 解析来生成标题、链接、来源和时间信息。
- 在热点卡片中为每条新闻增加一句话描述区域；描述通过 `tool_calls` 方式按新闻项批量异步请求，并与原有 llm-chat 主回答流同时进行。
- 在一句话描述未返回前，卡片标题下方显示加载动画；描述到达后原位更新，不阻塞主回答流和现有状态流展示。
- K-Ai 页面在未登录访问时不跳转，改为停留当前页并弹出“请登录”的 warning toast。
- 优化 K-Ai 流式对话区滚动体验：默认自动跟随最新内容；一旦用户手动上滑，停止强制抢夺滚动，并提供一键到底的悬浮圆形按钮。
- 在消息气泡下方补充时间显示，并按时间层级展示为“当天时分 / 同年非当天月日时分 / 跨年年月日”；时间默认淡显，hover 时加深。
- 热点新闻卡片中的来源标签继续紧跟在标题后，不得误落到摘要占位或 meta 区域。

## Capabilities

### New Capabilities
<!-- 无新增 capability -->

### Modified Capabilities

- `llm-chat-ui`: 热点新闻卡片必须继续沿用现有样式，但改为消费 MCP JSON 并支持单条新闻描述的渐进加载。
- `llm-chat-ui`: K-Ai 入口鉴权、滚动行为、一键到底按钮与消息时间显示需要与新的热点卡片体验一起保持一致。
- `llm-chat-engine`: 热点链路必须输出可供 UI 直接渲染的结构化热点数据，并在主回答流之外并行调度新闻一句话描述的 `tool_calls` 请求。
- `local-mcp-server`: 热点工具返回结果需要为聊天链路提供稳定的结构化 JSON 字段，避免 UI 继续依赖文本解析。

## Impact

- **聊天编排**: `core/chat/chat-service.js`, `core/chat/llm-client.js`
- **聊天 IPC / 流式事件**: `main/ipc/chat.handler.js`
- **聊天状态管理**: `renderer/stores/use-chat-store.js`
- **AI 对话界面**: `renderer/features/assistant/index.vue`
- **路由与入口拦截**: `renderer/router/index.js`
- **本地 MCP 工具契约**: `core/mcp/mcp-tools.js`, `core/mcp/mcp-server.js`
- **需求文档**: `docs/需求文档.md`
