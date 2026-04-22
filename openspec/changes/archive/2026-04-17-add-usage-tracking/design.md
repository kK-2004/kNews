## Context

当前 MCP API 调用仅在 `api_key.call_count` 上做原子自增（通过 `increment_api_key_usage` RPC），没有按时间维度拆分的调用记录。管理后台「每小时调用趋势」ECharts 图表的 `hourly` 数组始终为空（`admin:getAnalytics` 返回 `hourly: []`），前端已实现图表渲染逻辑但无数据可展示。

数据库使用 Supabase PostgreSQL，已有 8 个迁移脚本（001~008）。MCP Server 每次成功处理请求时已在 `_withAuth` 中调用 `apiKeyRepository.updateUsage()` 进行累计计数。

## Goals / Non-Goals

**Goals:**
- 新增 `usage` 表，按 `api_key_id + hour` 维度记录每小时调用次数
- 在 MCP 请求链路中异步写入 usage 记录，不增加请求延迟
- 修改 `admin:getAnalytics` IPC handler 从 usage 表聚合数据填充 `hourly` 数组
- 前端已有的 ECharts 图表自动获得数据并渲染

**Non-Goals:**
- 不做 usage 数据的自动清理/归档（后续迭代）
- 不做按用户维度的 usage 查询（本次仅按 key 维度）
- 不修改前端图表组件代码（已就绪）

## Decisions

### 1. usage 表设计：按 `(api_key_id, hour)` 联合唯一

`hour` 字段存储 UTC 时间字符串（格式 `YYYY-MM-DD HH`），与现有 `leaderboardHour` 格式一致，无需前端时区转换。

**备选方案**：
- (a) `TIMESTAMPTZ` 存整点时间戳 → 需额外格式化，增加查询复杂度
- (b) 按 `(user_id, hour)` → 一个用户多个 key 时无法区分，与现有 leaderboard 逻辑不一致

选择字符串格式因为与前端 `parseUtcHourString` 解析逻辑完全匹配，零转换成本。

### 2. 写入策略：Supabase upsert + RPC fallback

MCP `_withAuth` 中已有 `apiKeyRepository.updateUsage()` 调用点。在该调用之后追加 `usageRepository.incrementHourly(keyId)` 调用。

使用 Supabase 的 upsert 能力：按 `(api_key_id, hour)` 冲突时 `call_count = call_count + 1`。优先使用 RPC 函数 `increment_usage`（原子操作），fallback 到 JS 端 read-then-write。

**备选方案**：
- (a) 批量定时刷盘 → 增加状态管理复杂度，进程崩溃丢数据
- (b) 纯内存 + 定期持久化 → 同上

选择 upsert 因为每次请求一次写入，逻辑简单，Supabase 能轻松承载。

### 3. 查询策略：按时间范围聚合

`admin:getAnalytics` 接收 `start`/`end` 时间戳，查询 usage 表中 `hour BETWEEN start AND end` 的记录，按 `hour` 分组 SUM 聚合。支持 `keyId` 过滤。

### 4. 依赖注入

新增 `UsageRepository` 注入到 `McpServer` 和 `admin.handler`，复用现有 bootstrap 的依赖注入模式。

## Risks / Trade-offs

- **[写入频率]** 每次 MCP 请求触发一次 upsert → 风险低：单次操作轻量，Supabase 免费额度足够
- **[数据积累]** usage 记录无限增长 → 后续迭代添加定期清理（如保留 90 天）
- **[时钟漂移]** `hour` 字段由应用服务器生成 → 可接受：管理后台趋势图精度为小时级

---

## Bug Fix 1: `api_key.call_count` 重复统计

### 问题根因

MCP Streamable HTTP 协议下，客户端的「一次查询」会产生多次 HTTP 请求：
1. `POST /mcp` → initialize（建立 session）
2. `POST /mcp` → tools/call（携带 Mcp-Session-Id）

当前 `_withAuth` 对**每次** HTTP 请求都调用 `apiKeyRepository.updateUsage()`，导致 `call_count` 被累加多次。

而 usage 表通过 `_billedSessions` Set（key = `hour:apiKeyId:sessionId`）实现了正确的去重——同一 session 在同一小时内只计一次。

### 修复方案

将 `api_key.call_count` 的更新纳入 `_recordUsageOncePerSession` 的去重机制中：

1. **移除** `_withAuth` 中对 `apiKeyRepository.updateUsage()` 的调用
2. **修改** `_recordUsageOncePerSession`：在 billing key 首次出现时，同时调用 `usageRepository.incrementHourly()` 和 `apiKeyRepository.updateUsage()`。后续重复请求被 `_billedSessions` Set 拦截，不再更新任何计数器。

```
_before:_
_withAuth → updateUsage (每次 +1) ❌ 重复
_handleMcpRequest → _recordUsageOncePerSession → incrementHourly (去重 ✓)

_after:_
_withAuth → (无计数操作)
_handleMcpRequest → _recordUsageOncePerSession → incrementHourly + updateUsage (去重 ✓)
```

### 涉及文件
- `core/mcp/mcp-server.js`：修改 `_withAuth` 和 `_recordUsageOncePerSession`

## Bug Fix 2: MCP 设置页权益来源错误

### 问题根因

`mcp-settings.vue` 中 `currentLevel` 直接取 `userStore.profile?.level`，但该值来自 Pinia 持久化，可能是过期的旧值。用户通过订阅升级后，DB 中的 level 已更新，但本地 Pinia 缓存的 `profile.level` 仍为旧值。

### 修复方案：缓存优先 + 订阅更新时删缓存

采用「查询时缓存优先，miss 查 DB 回填；订阅变更时删缓存」模式：

1. **缓存层**：使用前端 Pinia `userStore.profile.level` 作为本地缓存
2. **查询时**：打开 MCP 设置页时优先使用缓存值；缓存 miss（`profile.level` 为 undefined/null）时调用 `subscription:getCurrent` IPC 从 DB 获取权威值 → 回填 `userStore.profile.level`
3. **订阅升级时（`subscription.handler`）**：落库成功后，清除 Pinia 持久化的 `profile.level`（设为 null），确保下次查询触发缓存 miss → DB 重新加载

### 涉及文件
- `main/ipc/subscription.handler.js`：创建订阅成功后通知前端清除 level 缓存
- `renderer/features/settings/components/mcp-settings.vue`：修改 `load()` 函数，增加缓存优先 + DB fallback 逻辑