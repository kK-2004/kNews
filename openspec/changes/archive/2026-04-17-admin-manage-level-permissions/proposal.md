## Why

`LEVEL_PERMISSIONS` 在 `user-service.js`、`subscription-service.js`、`admin.handler.js` 三处硬编码重复定义，修改权益需要同步改动多个文件，容易遗漏且无法动态调整。将权益配置迁移到 Supabase `settings` 表后，管理员可在后台实时调整各级别 rate_limit / max_count，无需改代码重新发布。

## What Changes

- 新增 settings 表键 `level_permissions`，值为 JSON 格式的 level→权限映射，启动时自动写入默认值（仅 INSERT，不覆盖已有）
- 新增 `admin:getLevelPermissions` / `admin:updateLevelPermissions` IPC 通道，管理端可读取和修改权益配置
- 管理设置页（admin）新增「权益配置」区块，可视化编辑各 level 的 rate_limit / max_count
- 移除 `user-service.js`、`subscription-service.js`、`admin.handler.js` 中的硬编码 `LEVEL_PERMISSIONS`，统一从 `SettingsRepository` 读取
- `SubscriptionService._syncApiKeyPermissions`、`UserService._createDefaultApiKey`、`admin.handler.js createApiKey` 改为运行时从 settings 读取权限

## Capabilities

### New Capabilities
- `level-permissions-config`: 基于 settings 表的 level 权益动态配置，含后端读取/管理端编辑/前端 UI

### Modified Capabilities

## Impact

- `core/user/user-service.js`：移除硬编码 LEVEL_PERMISSIONS，改为接收 SettingsRepository 依赖
- `core/subscription/subscription-service.js`：同上
- `main/ipc/admin.handler.js`：移除硬编码 LEVEL_PERMISSIONS，新增两个 IPC handler
- `main/bootstrap.js`：将 SettingsRepository 注入到 UserService / SubscriptionService
- `renderer/features/settings/components/admin/`：新增权益配置 UI 区块
- `database/migrations/`：新增 INSERT level_permissions 默认值
- `docs/需求文档.md`：新增 F17 章节
