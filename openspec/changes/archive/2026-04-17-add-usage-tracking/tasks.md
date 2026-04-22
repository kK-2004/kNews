## 1. 数据库迁移

- [x] 1.1 创建迁移脚本 `database/migrations/009_create_usage.sql`：建 `usage` 表（id/api_key_id/hour/call_count/created_at/updated_at），添加 `(api_key_id, hour)` 联合唯一约束和 `api_key_id` 外键
- [x] 1.2 创建 RPC 函数 `increment_usage(api_key_id TEXT, hour_str TEXT)`：upsert 到 usage 表，冲突时 `call_count = call_count + 1`

## 2. UsageRepository

- [x] 2.1 创建 `core/usage/usage-repository.js`：构造函数注入 Supabase 客户端
- [x] 2.2 实现 `incrementHourly(apiKeyId)` 方法：获取当前 UTC 小时字符串，调用 RPC `increment_usage`，fallback 到 JS 端 upsert
- [x] 2.3 实现 `findByRange(startHour, endHour, options)` 方法：查询 usage 表按 hour 范围，支持 `keyId` 过滤，按 hour 分组 SUM(call_count) 返回 `[{hour, calls}]`

## 3. 集成到 MCP Server

- [x] 3.1 修改 `McpServer` 构造函数，接受 `usageRepository` 依赖
- [x] 3.2 在 `_withAuth` 中 `apiKeyRepository.updateUsage()` 之后追加 `usageRepository.incrementHourly(apiKeyRow.id)` 调用（fire-and-forget）

## 4. 修改 admin.handler 查询逻辑

- [x] 4.1 修改 `admin.handler.js` 的 `register` 函数签名，接受 `usageRepo` 依赖
- [x] 4.2 重写 `admin:getAnalytics` handler：将前端传入的 start/end 时间戳转为 UTC 小时格式，调用 `usageRepo.findByRange()` 查询小时级数据填充 `hourly` 数组

## 5. Bootstrap 依赖注入

- [x] 5.1 修改 `main/bootstrap.js`：实例化 `UsageRepository`，传入 Supabase 客户端
- [x] 5.2 将 `usageRepository` 注入到 `McpServer` 和 `admin.handler.register` 的依赖中

## 6. Bug Fix: `api_key.call_count` 重复统计

- [x] 6.1 修改 `McpServer._withAuth`：移除对 `apiKeyRepository.updateUsage()` 的调用
- [x] 6.2 修改 `McpServer._recordUsageOncePerSession`：在 billing key 首次出现时，同时调用 `usageRepository.incrementHourly()` 和 `apiKeyRepository.updateUsage()`，复用 `_billedSessions` 去重机制

## 7. Bug Fix: MCP 设置页权益来源错误

- [x] 7.1 修改 `renderer/features/settings/components/mcp-settings.vue`：权益信息直接从 default API Key 的 `rate_limit`/`max_count` 字段读取，不再依赖 `userStore.profile.level` 缓存