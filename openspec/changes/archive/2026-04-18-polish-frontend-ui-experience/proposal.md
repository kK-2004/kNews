## Why

当前首页、K-Ai 助手、设置/后台等前端界面已经完成一轮连续的视觉与交互微调，但这些需求仍停留在对话记录和代码实现里，没有同步进入 OpenSpec 与 SRS。需要把这轮已经确认的 UI 约束、交互规则和“不改后端逻辑”的边界补齐为正式规格，便于后续继续迭代和验收。

## What Changes

- 将应用外壳补充为统一的黑白主题与中文界面规范，统一首页、助手、设置三处导航的 active 视觉语言，并明确一键刷新与主题切换按钮的布局和样式约束。
- 补充首页热点/时事等 tab 的即时加载反馈要求，明确切换时必须立即进入骨架屏或等价加载态，避免长时间停留旧内容。
- 补充首页新闻卡片的来源主题色点缀、来源头部垂直居中和间距约束，保持来源识别度但不破坏黑白主基调。
- 补充 K-Ai 助手在当前“全局单流”架构下的前端保护规则：响应中再次发送、新建、切换或删除会话时必须阻止并弹出统一错误提示。
- 补充 K-Ai 助手的 UI polish 要求，包括会话删除二次确认、热点速览卡序号跟随来源色、消息列表与输入区的合理安全距离，以及避免消息气泡出现明显的固定空白区域。
- 补充设置页与后台分析页的视觉要求，包括设置导航选中态、深色模式下开关可见性，以及后台排行榜模块在加载前也需显示占位或空状态，不得出现整块空白。
- 明确本次 change 仅涉及前端体验与规格同步，不改变既有后端接口、权限逻辑和数据契约。

## Capabilities

### New Capabilities
- `global-shell-ui-polish`: 定义全局黑白主题、中文界面、顶部导航 active 样式，以及刷新/主题切换按钮的统一外壳规则。
- `home-feed-ui-polish`: 定义首页 tab 切换即时反馈、来源主题色新闻卡片、来源头部对齐与首页卡片间距等体验要求。
- `settings-console-ui-polish`: 定义设置导航、深色模式控件可见性与后台分析页预加载占位等设置/后台界面 polish 规则。

### Modified Capabilities
- `llm-chat-ui`: 在保持现有聊天能力不变的前提下，补充单客户端单会话保护、会话删除确认、热点速览卡来源色、消息列表底部间距与消息气泡布局约束。

## Impact

- **全局外壳 / 导航 / 主题**: `renderer/App.vue`, `renderer/styles/main.css`
- **首页**: `renderer/features/home/index.vue`, `renderer/features/home/components/source-board.vue`
- **K-Ai 助手**: `renderer/features/assistant/index.vue`, `renderer/stores/use-chat-store.js`
- **设置 / 后台**: `renderer/features/settings/index.vue`, `renderer/features/settings/components/feed-settings.vue`, `renderer/features/settings/components/admin/api-keys-settings.vue`
- **需求文档**: `docs/需求文档.md`
