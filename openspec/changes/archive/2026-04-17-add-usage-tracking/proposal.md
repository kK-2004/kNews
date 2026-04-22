## Why

当前 MCP API 调用仅在 `api_key` 表上维护一个累计 `call_count`，没有按小时粒度的调用记录。管理后台的「每小时调用趋势」ECharts 图表始终返回空数组 `hourly: []`，无法绘制任何趋势数据，管理员无法观察 API 使用的时间分布和流量波动。

## What Changes

- 新增 `usage` 表，按 `api_key_id + hour` 维度记录每小时调用次数
- 在 MCP Server 每次成功处理请求时，异步写入/累加对应小时的 usage 记录
- 新增 `usage-repository` 封装 usage 表的 CRUD 操作
- 修改 `admin:getAnalytics` IPC handler，从 usage 表查询小时级数据填充 `hourly` 数组
- 新增数据库迁移 `009_create_usage.sql`

## Capabilities

### New Capabilities
- `usage-tracking`: 按小时粒度记录 MCP API 调用次数，为管理后台趋势图表提供数据源

### Modified Capabilities
<!-- 无已有 spec 需要修改 -->

## Impact

- **数据库**: 新增 `usage` 表（迁移 009），`api_key_id` 外键关联 `api_key.id`
- **后端**: `McpServer._withAuth` 中增加 usage 写入逻辑；新增 `UsageRepository` 类
- **IPC**: `admin:getAnalytics` handler 增加按时间范围聚合查询
- **前端**: 已有 ECharts 图表代码无需修改，`hourly` 数组有数据后自动渲染
- **性能**: usage 写入为异步 fire-and-forget，不阻塞 MCP 请求响应

---

## Bug Fix: `api_key.call_count` 重复统计

### Why
MCP Server 的 `_withAuth` 在每次 HTTP 请求时都调用 `apiKeyRepository.updateUsage()` 将 `call_count` +1。但 MCP Streamable HTTP transport 下，一次 query 会触发多次 HTTP 请求（initialize + tools/call），导致 `call_count` 被重复累加。而 `usage` 表通过 `_billedSessions` Set 实现了正确的去重（每 session 只计一次）。需要复用 usage 的去重机制来同步更新 `api_key.call_count`。

### What Changes
- 修改 `McpServer._withAuth`：移除每次请求直接调用 `apiKeyRepository.updateUsage()` 的逻辑
- 修改 `McpServer._recordUsageOncePerSession`：在 usage 去重计数的同时，同步更新 `api_key.call_count`（同一 billing key 去重，仅首次计次时 +1）

### Impact
- **后端**: `_withAuth` 不再每次请求调用 `updateUsage`；`_recordUsageOncePerSession` 同时负责 `call_count` 和 usage 表
- **数据**: `api_key.call_count` 将与 usage 表一致，准确反映去重后的调用次数

## Bug Fix: MCP 设置页权益来源错误

### Why
`mcp-settings.vue` 使用 `userStore.profile?.level` 显示当前权益等级，但 profile.level 来自登录时的 session 快照或持久化的 Pinia state。用户通过订阅升级后，session 和 Pinia 中的 level 未及时同步，导致 Pro 用户仍显示 Free 权益。

### What Changes
- 修改 `mcp-settings.vue` 的 `load()` 函数：加载权益信息时，调用 `subscription:getCurrent` IPC 获取最新的订阅等级，而非仅依赖 Pinia 持久化的 profile.level
- 将获取到的最新 level 写回 `userStore.profile.level`

### Impact
- **前端**: MCP 设置页权益显示将始终反映最新的订阅等级
- **IPC**: 复用已有的 `subscription:getCurrent` 通道，无需新增