## Context

当前应用在 [home/index.vue](renderer/features/home/index.vue) 中通过 `watch(() => userStore.authToken, ...)` 监听认证状态变化。当用户登出时，`userStore.clearAuth()` 将 `authToken` 置空，触发 watcher 调用 `buildBoards()` 全量重建——包括清空已有 boards、显示 loading 骨架屏、重新获取所有数据源。这导致不必要的网络请求和 UI 闪烁。

后端已有完善的文件缓存机制（[local-cache-repository.js](core/cache/local-cache-repository.js)），每个数据源独立缓存为 JSON 文件，包含 `fetchedAt` 时间戳，且 `isStale()` 方法支持自定义过期阈值（默认 1 小时）。但前端未充分利用此缓存，在多数场景下仍触发全量重建。

## Goals / Non-Goals

**Goals:**
- 修复登出后不必要的数据重载和 UI 闪烁
- 建立缓存优先的数据加载策略：有缓存且未过期直接使用，过期则后台静默刷新
- 手动"一键刷新"按钮基于用户 level 做权限控制

**Non-Goals:**
- 不改动后端缓存机制本身（已有且可靠）
- 不实现完整的订阅付费界面（仅占位提示）
- 不改变数据源的获取逻辑和解析方式

## Decisions

### 1. 前端缓存时间判断由 IPC 查询后端缓存元数据

**选择**: 前端通过 IPC 调用后端 `localCacheRepository.read()` 获取 `fetchedAt`，与当前时间比较判断是否过期。

**理由**: 缓存数据存储在主进程的文件系统中，renderer 进程无法直接访问。后端已有 `read()` 和 `isStale()` 方法，只需新增 IPC handler 暴露缓存元数据查询。

**替代方案**:
- 前端维护独立的缓存时间状态 → 状态同步复杂，可能不一致
- 每次都让后端判断 → 后端已支持，但需要新增"带缓存判断的获取"接口

### 2. authToken watcher 仅同步偏好设置，不触发 buildBoards

**选择**: 将 `watch(authToken)` 中的 `buildBoards()` 移除，仅保留 `loadPreferences()`。偏好加载后如果需要更新 boards，由 preferences watcher 自身处理。

**理由**: 登出时用户偏好可能回到默认值，需要重新加载偏好设置。但数据本身不受认证状态影响——缓存不与用户绑定。`buildBoards()` 仅在以下情况触发：tab 切换、偏好变化、手动刷新、首次加载。

### 3. buildBoards 增加 cache-first 路径

**选择**: 在 `buildBoards()` 中，获取数据源列表后先查询后端缓存状态。如果所有选中源都有未过期缓存，直接使用缓存数据构建 boards，跳过 loading 状态。如果有部分或全部过期，走正常获取流程。

**理由**: 避免在已有缓存时的 loading 骨架屏闪烁。后端 `ScraperEngine` 已有缓存读取逻辑，前端只需通过 `fetchSourceItems(id, { latest: false })` 即可获取缓存数据。

### 4. 手动刷新按钮的权限控制在 UI 层实现

**选择**: 在 `App.vue` 的"一键刷新"按钮上增加 `v-if` 判断 `userStore.profile?.level >= 1`，未登录或 level 不足时隐藏按钮或改为显示升级提示。

**理由**: 最小改动，不影响已有的刷新事件机制。权限判断所需数据已在 `userStore.profile` 中。

## Risks / Trade-offs

- [缓存一致性问题] 如果后端缓存文件被外部修改或删除，前端可能使用过期数据 → 后端 `isStale()` 已处理此场景，返回 null 视为 stale
- [频繁 IPC 调用] 每次检查缓存状态需要 IPC → 缓存查询是轻量的文件读取操作，开销可忽略
- [level 判断时机] 用户 profile 可能在登录后异步获取，level 字段可能有短暂为空 → 默认 level 为 0，未获取到 profile 时不允许手动刷新，行为安全
