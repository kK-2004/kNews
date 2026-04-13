## Why

订阅页面和刷新时间显示存在两个 bug：

1. **订阅页面禁用逻辑错误**：当前只有精确匹配当前方案的卡片显示"当前方案"并禁用按钮。但用户已订阅高级方案时，低级方案也应禁用（不能降级）。例如 Pro 用户不应能点击 Free 或 Plus 卡片。

2. **刷新时间显示不更新**：`source-board.vue` 的 `updatedLabel` 使用 `Date.now()` 计算相对时间，但 computed 属性不会因时间流逝自动重算，导致"5分钟前更新"永远停留在初次渲染时的文字。

## What Changes

- 修复订阅页面按钮禁用逻辑：当前 level 对应的所有低级方案卡片均显示禁用
- 修复刷新时间标签：引入定时器每分钟触发重算，使相对时间持续更新

## Capabilities

### New Capabilities

- `subscribe-level-guards`: 订阅页面按钮按 level 等级禁用，当前 level 及以下均不可操作
- `refresh-time-ticker`: 新闻模块刷新时间的定时重算机制

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- `renderer/features/subscribe/subscribe-page.vue`: 修改按钮禁用逻辑
- `renderer/features/home/components/source-board.vue`: 新增定时器驱动 updatedLabel 重算