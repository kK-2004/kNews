## 1. 修复 authToken watcher 的全量重建问题

- [x] 1.1 修改 `renderer/features/home/index.vue` 中 `watch(() => userStore.authToken)` 回调：移除 `buildBoards()` 调用，仅保留 `loadPreferences()`
- [x] 1.2 验证偏好变化引起 boards 更新的链路仍然正常（由 preferences 自身的 watcher 驱动）

## 2. 引入缓存优先数据加载策略

- [x] 2.1 新增 IPC handler（如 `scraper:cache-status`），前端可查询指定数据源列表的缓存状态（是否存在、fetchedAt 时间戳）
- [x] 2.2 在 `buildBoards()` 中，获取数据源列表后先查询缓存状态：全部有缓存且未过期则直接用缓存数据构建 boards，跳过 loading 骨架屏
- [x] 2.3 对于缓存过期但有旧数据的情况，先展示缓存数据再后台静默刷新（复用 `silentRefreshLoadedBoards` 逻辑）
- [x] 2.4 确保无缓存时仍走正常获取流程，显示 loading 状态并将数据写入后端缓存

## 3. 手动刷新按钮权限控制

- [x] 3.1 修改 `renderer/App.vue` 中"一键刷新"按钮：添加用户 level >= 1 的判断条件
- [x] 3.2 为未登录或 level < 1 的用户添加升级订阅占位提示（toast 通知形式）
- [x] 3.3 确保移动端底部导航栏（如有刷新入口）也同步应用相同权限逻辑

## 4. 验证与测试

- [x] 4.1 验证 GitHub 登录后退出不再触发数据重载和 loading 闪烁
- [x] 4.2 验证 Magic Link 登录后退出行为保持正确（不重载）
- [x] 4.3 验证首次加载（无缓存）→ 正常获取并缓存 → 二次加载直接使用缓存的完整流程
- [x] 4.4 验证缓存超过 1 小时后的静默后台刷新行为
- [x] 4.5 验证手动刷新按钮在 level >= 1 / level < 1 / 未登录三种状态下的表现
