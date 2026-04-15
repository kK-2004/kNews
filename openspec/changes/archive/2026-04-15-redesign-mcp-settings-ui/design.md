## Context

当前 MCP 设置页面（`renderer/features/settings/components/mcp-settings.vue`）是一个单页面纵向堆叠布局，包含：账号信息、创建 Key 表单（含名称输入、条数设置、模块选择）、Key 列表。模块选择（可检索板块 grid）直接暴露在主表单中，占据大量空间且视觉杂乱。

参考设计 `docs/k-ai-screen.png` 展示了更简洁的卡片式 UI 风格。本次重构目标是将 MCP 设置页面重设计为更清晰的布局，并将模块选择改为 Modal 弹出交互。

当前技术栈：
- Vue 3 + Composition API（`<script setup>`）
- 现有 `base-modal.vue`、`base-button.vue`、`base-input.vue` 组件
- CSS 变量主题系统（`--surface`、`--border`、`--text`、`--muted`、`#0b63ff`）

## Goals / Non-Goals

**Goals:**
- 将模块选择从主表单中移到创建 Key 流程的 Modal 弹出中
- 优化整体页面布局，采用卡片式分区设计
- Key 列表展示更紧凑美观
- 复用现有 `base-modal.vue` 组件

**Non-Goals:**
- 不修改后端 API、IPC 通道或数据模型
- 不修改 `base-modal.vue` 的核心逻辑
- 不涉及其他设置子页面
- 不引入新的 UI 框架

## Decisions

### 1. 页面布局重构为「账号卡片 + Key 列表 + 创建按钮」三区域

主页面只保留账号信息卡片和 Key 列表，右上角/顶部放置「+ 创建 Key」按钮。移除主表单区域的直接展示。

### 2. 创建 Key 流程改为 Modal 内完成

点击「创建 Key」按钮后弹出 Modal，Modal 内包含：名称输入、条数设置、模块选择（可检索板块 chip grid，带全选/清空），全部完成后点击「生成」。不分步向导，一屏内完成所有配置。

### 3. Key 列表采用简洁行卡片

每个 Key 以行卡片形式展示，包含名称、Key 值（可复制）、模块标签（小 chip）、使用统计，右侧删除按钮。

## Risks / Trade-offs

- **Modal 内模块选择空间有限** → 使用 `max-height` + 滚动条
- **Modal 宽度需容纳 chip grid** → 通过 CSS 覆盖 `base-modal` 宽度为 40rem
- **纯前端重构** → 风险低，不涉及后端变更
