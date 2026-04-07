## ADDED Requirements

### Requirement: Cache-first data loading strategy
数据加载 SHALL 优先使用文件系统缓存。系统 MUST 检查每个数据源的缓存状态（是否存在、`fetchedAt` 时间戳），基于缓存新鲜度决定数据获取行为。

#### Scenario: All sources have fresh cache (under 1 hour)
- **WHEN** 所有当前选中数据源均有缓存且 `fetchedAt` 距当前时间 ≤ 1 小时
- **THEN** 系统 SHALL 直接使用缓存数据构建 boards，不显示 loading 骨架屏，不发起新的网络请求

#### Scenario: Some sources have stale cache (over 1 hour)
- **WHEN** 部分或全部数据源缓存不存在或 `fetchedAt` 距当前时间 > 1 小时
- **THEN** 系统 SHALL 对过期/缺失的数据源发起新的获取请求，对未过期的数据源使用缓存数据

#### Scenario: No cache exists for any source
- **WHEN** 所有数据源均无缓存
- **THEN** 系统 SHALL 正常发起获取请求，显示 loading 状态，获取完成后将数据写入缓存

### Requirement: Auth state changes must not trigger full data rebuild
用户认证状态变化（登录/登出）SHALL NOT 触发全量数据重建（`buildBoards()`）。认证状态变化仅触发偏好设置重新加载。

#### Scenario: User logs out via GitHub
- **WHEN** 用户通过 GitHub 登录后点击退出
- **THEN** 系统 SHALL 仅清除认证状态并重新加载用户偏好，不触发 buildBoards，不显示 loading 骨架屏，不重新获取数据

#### Scenario: User logs out via Magic Link
- **WHEN** 用户通过 Magic Link 登录后点击退出
- **THEN** 系统 SHALL 仅清除认证状态并重新加载用户偏好，不触发 buildBoards，不显示 loading 骨架屏，不重新获取数据

#### Scenario: User logs in
- **WHEN** 用户登录成功（GitHub 或 Magic Link）
- **THEN** 系统 SHALL 重新加载用户偏好设置。如果偏好变更影响 boards（如关注列表变化），则由偏好 watcher 触发 buildBoards

### Requirement: Background silent refresh for stale cache
当检测到缓存过期时，系统 SHALL 在后台静默刷新数据，不阻塞 UI 展示。用户先看到缓存的旧数据，刷新完成后自动更新。

#### Scenario: Cached data displayed while refreshing in background
- **WHEN** 用户打开应用且缓存数据超过 1 小时
- **THEN** 系统 SHALL 先展示缓存数据，同时后台静默获取最新数据，获取完成后无闪烁地更新 boards
