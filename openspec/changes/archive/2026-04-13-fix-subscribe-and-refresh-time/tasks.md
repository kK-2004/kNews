## 1. 修复订阅页面按钮禁用逻辑

- [x] 1.1 修改 `renderer/features/subscribe/subscribe-page.vue`：按钮禁用条件从 `currentPlan === plan` 改为 `currentLevel >= planLevel`
- [x] 1.2 低于当前 level 的方案按钮文字改为"已包含"，精确匹配当前方案显示"当前方案"

## 2. 修复刷新时间标签不更新

- [x] 2.1 修改 `renderer/features/home/index.vue`：新增共享 `now` ref，每分钟通过 setInterval 更新，provide 给子组件
- [x] 2.2 修改 `renderer/features/home/components/source-board.vue`：inject 父组件的 `now`，`updatedLabel` computed 改为依赖注入的 `now`（而非直接调用 `Date.now()`）
- [x] 2.3 超过 10 分钟的源直接显示"10分钟前更新"，不再随 now 变化
- [x] 2.4 父组件 onUnmounted 时清理 setInterval

## 3. 同步需求文档

- [x] 3.1 更新 `docs/需求文档.md` F09 相关条目反映按钮禁用逻辑变更