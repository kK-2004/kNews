## Context

`subscribe-page.vue` 的 `currentPlan` computed 根据 level 返回 plan 名称（free/plus/pro），按钮通过 `currentPlan === 'free'` 等精确匹配判断是否禁用。当用户 level=2（Pro）时，Free 和 Plus 卡片的按钮仍然可点击，违反了"不能降级"的设计意图。

`source-board.vue` 的 `updatedLabel` 是 computed 属性，内部调用 `Date.now()`。Vue 的 computed 只在响应式依赖变化时重算，`Date.now()` 不是响应式的，所以相对时间文字只在组件首次渲染或 `updatedTime` prop 变化时计算一次。

## Goals / Non-Goals

**Goals:**
- 修复订阅页面：当前 level 对应方案及所有低级方案的卡片按钮均禁用并显示适当文字
- 修复刷新时间：每分钟自动更新相对时间文字（"刚刚更新" → "1分钟前更新" → ...）

**Non-Goals:**
- 不改变订阅页面的视觉设计
- 不改变相对时间的计算规则（仍然用 "刚刚/X分钟/X小时" 三档）

## Decisions

### 1. 订阅按钮禁用：改用 level 比较

将 `currentPlan === plan` 改为 `currentLevel >= planLevel`。level >= 当前等级的方案禁用。

按钮文字逻辑：
- 精确匹配当前 plan → 显示"当前方案"
- level 低于当前 → 显示"已包含在当前方案"或类似提示

### 2. 刷新时间：组件内 setInterval 每分钟触发

在 `source-board.vue` 中新增一个响应式的 `now` ref，通过 `setInterval` 每 60 秒更新。`updatedLabel` computed 依赖 `now.value`，自动重算。

组件 `onUnmounted` 时清理定时器。

**替代方案**：
- 全局时间 ticker → 额外复杂度，组件数量有限不值得
- 使用 `requestAnimationFrame` → 过于频繁，浪费性能

## Risks / Trade-offs

- **[每分钟 60+ 个定时器]** 每个source-board 组件各一个 → 用单一定时器 + provide/inject 或将定时器提升到父组件共享，减少开销。改为父组件维护一个 `now` ref，通过 provide 传递给子组件。