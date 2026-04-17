## Context

当前 `LEVEL_PERMISSIONS` 常量在三个文件中硬编码重复定义：
- `core/user/user-service.js:9-13`
- `core/subscription/subscription-service.js:6-10`
- `main/ipc/admin.handler.js:7-11`

已存在 `settings` 表（migration 006）和 `SettingsRepository`（`core/config/settings-repository.js`），支持 `get(key)` / `set(key, value)` / `getAll()` 方法，值以 TEXT 存储即可存 JSON。

## Goals / Non-Goals

**Goals:**
- 将 level 权益配置（rate_limit / max_count）统一存储到 settings 表，消除硬编码重复
- 管理端可通过 UI 实时修改各 level 权益
- 权益更新后自动同步到所有已激活 API Key

**Non-Goals:**
- 不新增 settings 表（复用现有表结构）
- 不做权限变更审计日志
- 不做权益变更历史版本管理
- 不影响 MCP Server 运行时的限流逻辑（限流仍从 api_key 表读取 rate_limit 字段）

## Decisions

### D1: 使用 settings 表的 `level_permissions` 键存储 JSON

存储格式：
```json
{
  "0": { "rate_limit": 3, "max_count": 5 },
  "1": { "rate_limit": 20, "max_count": 10 },
  "2": { "rate_limit": -1, "max_count": 50 }
}
```

**理由**: settings 表已存在且在用（如 `github_client_id`），无需新增表。JSON TEXT 存储足够灵活，level 数量少（3 个），不需要独立表。

**备选方案**: 新建 `level_permissions` 独立表（level/rate_limit/max_count 三列）——对于 3 行数据过度设计。

### D2: 运行时从 SettingsRepository 读取，不缓存

所有消费方（UserService / SubscriptionService / admin.handler）在需要权限时直接调用 `settingsRepo.get('level_permissions')`，解析 JSON 后使用。

**理由**: 权益读取频率低（注册、订阅变更、创建 Key），不需要内存缓存。每次读取保证拿到最新值。

**备选方案**: 启动时加载到内存 + 更新时刷新——增加复杂度，当前规模无性能收益。

### D3: 权益更新时批量同步所有已激活 API Key

`admin:updateLevelPermissions` IPC handler 保存新值到 settings 后，遍历 `api_key` 表所有 `is_active = true` 记录，按所属用户的 level 更新 rate_limit / max_count。

**理由**: 保证管理端修改权益后立即生效，不依赖用户下次订阅变更才同步。

### D4: SettingsRepository 注入到 UserService / SubscriptionService

通过构造函数依赖注入，与现有 Repository 注入模式一致。bootstrap.js 负责组装。

### D5: admin.handler 中移除硬编码，改为接收 settingsRepo 依赖

admin.handler 的 `register` 函数签名新增 `settingsRepo` 参数，`createApiKey` 等方法运行时读取权限。

## Risks / Trade-offs

- **[性能]** 每次创建用户/订阅/Key 都有一次 settings 表查询 → 权益读取不在热路径，影响可忽略
- **[一致性]** 管理员修改权益后，批量同步期间如有并发订阅变更可能短暂不一致 → 同步在同一个 IPC handler 中串行执行，窗口极小，可接受
- **[默认值]** 如果 settings 表中 level_permissions 被误删或损坏 → 在 `get` 返回 null 时使用代码中的 fallback 默认值（与当前硬编码一致），确保系统可用
