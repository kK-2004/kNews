## Why

用户使用 GitHub 登录后退出时，应用会重新请求并加载所有热点数据（出现 loading 闪烁），而 Magic Link 登录退出后不会。根本原因是 `authToken` watcher 在登出时触发 `buildBoards()` 全量重建，无视已有缓存。同时，数据刷新策略应完全由缓存状态（是否存在、是否超过 1 小时）决定，而非用户认证状态。手动刷新按钮需要按用户 level 做权限控制。

## What Changes

- 修复 `authToken` watcher：登出时不再无条件触发 `buildBoards()` 全量重建，改为仅在必要时利用缓存数据
- 引入缓存优先策略：有缓存且未过期（≤1h）直接使用缓存，超过 1 小时才后台静默刷新，无缓存则正常加载
- 手动"一键刷新"按钮增加用户 level ≥ 1 的权限校验，未达标用户展示升级订阅提示界面（占位）
- 解耦刷新逻辑与用户认证状态，确保数据加载行为仅取决于缓存状态

## Capabilities

### New Capabilities

- `cache-first-data-loading`: 缓存优先的数据加载策略，基于缓存时间决定是否刷新（1 小时阈值）
- `refresh-access-control`: 手动刷新按钮的权限控制，基于用户 level 决定是否允许操作

### Modified Capabilities

## Impact

- `renderer/features/home/index.vue`: 核心数据加载逻辑（buildBoards、watch authToken、onMounted）
- `renderer/App.vue`: 一键刷新按钮的权限控制
- `core/cache/local-cache-repository.js`: 可能需要暴露更细粒度的缓存查询方法
- `renderer/stores/`: 可能涉及用户 level 状态的访问
