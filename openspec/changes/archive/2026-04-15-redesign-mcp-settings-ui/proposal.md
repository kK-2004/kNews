## Why

当前 MCP 设置页面（`mcp-settings.vue`）将「账号信息」「创建 Key 表单」「模块选择」「Key 列表」全部纵向堆叠在一个页面中，信息密度高、视觉层次不清晰。用户需要创建 Key 时，模块选择（可检索板块）直接暴露在主表单中占据大量空间，且与参考设计（k-ai-screen.png）的简洁卡片式布局差距较大。需要重新设计 UI，使页面更加清晰、模块选择改为创建 Key 时的 Modal 弹出交互。

## What Changes

- 重新设计 MCP 设置页面的整体布局，采用卡片式分区设计，参照 k-ai-screen.png 的视觉风格
- 将「模块选择」（可检索新闻板块）从主表单中移出，改为创建 Key 时作为 Modal 弹出
- 优化 Key 列表的展示样式，使其更紧凑美观
- 账号信息区域精简，与整体设计风格统一
- 创建 Key 表单简化：主页面仅保留「创建 Key」按钮，点击后弹出 Modal 完成全部配置

## Capabilities

### New Capabilities
- `mcp-settings-redesign`: MCP 设置页面 UI 重设计，包含新的卡片布局、模块选择 Modal 交互、Key 列表优化展示

### Modified Capabilities

（无需修改既有 spec 层面的需求，本次为纯 UI 层重构，不改变后端接口和数据模型）

## Impact

- `renderer/features/settings/components/mcp-settings.vue` — 主要修改文件，重写模板和样式
- `renderer/shared/components/base-modal.vue` — 复用现有 Modal 组件，可能需要调整宽度
- 不影响后端 API、IPC 通道或数据库结构
- 不影响其他设置子页面
