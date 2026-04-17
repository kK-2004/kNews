## ADDED Requirements

### Requirement: Level permissions storage in settings table
系统 SHALL 在 `settings` 表中存储键 `level_permissions`，值为 JSON 格式的 level→权限映射。启动时自动通过 migration 写入默认值（INSERT ON CONFLICT DO NOTHING），不覆盖已有配置。

默认值：
```json
{"0":{"rate_limit":3,"max_count":5},"1":{"rate_limit":20,"max_count":10},"2":{"rate_limit":-1,"max_count":50}}
```

#### Scenario: 首次启动写入默认权益
- **WHEN** 应用首次启动，settings 表中不存在 `level_permissions` 键
- **THEN** migration 自动插入默认值，包含 level 0/1/2 的 rate_limit 和 max_count

#### Scenario: 已有配置不受 migration 影响
- **WHEN** 应用启动，settings 表中已存在 `level_permissions` 键
- **THEN** migration 不覆盖已有值

### Requirement: Runtime level permissions resolution
系统 SHALL 在 UserService、SubscriptionService、admin.handler 中移除硬编码的 `LEVEL_PERMISSIONS` 常量，改为运行时通过 `SettingsRepository.get('level_permissions')` 读取并解析。当 settings 表中无值或 JSON 解析失败时，SHALL 使用代码内置 fallback 默认值。

#### Scenario: 创建用户时读取权益
- **WHEN** 新用户注册，系统为其创建默认 API Key
- **THEN** 系统从 settings 表读取 `level_permissions`，按用户 level 取对应权限写入 API Key

#### Scenario: Settings 读取失败使用 fallback
- **WHEN** settings 表中 `level_permissions` 不存在或 JSON 格式错误
- **THEN** 系统使用内置 fallback 默认值 `{0:{rate_limit:3,max_count:5}, 1:{rate_limit:20,max_count:10}, 2:{rate_limit:-1,max_count:50}}`

### Requirement: Admin get level permissions IPC
系统 SHALL 提供 `admin:getLevelPermissions` IPC 通道，从 settings 表读取 `level_permissions` JSON 并返回解析后的对象。

#### Scenario: 管理端读取权益配置
- **WHEN** 前端调用 `admin:getLevelPermissions`
- **THEN** 返回 `{ ok: true, data: { "0": {...}, "1": {...}, "2": {...} } }`

### Requirement: Admin update level permissions IPC
系统 SHALL 提供 `admin:updateLevelPermissions` IPC 通道，接收新的 level 权益 JSON，更新 settings 表后批量同步所有已激活 API Key 的权限。

#### Scenario: 管理端更新权益配置
- **WHEN** 前端调用 `admin:updateLevelPermissions` 并传入 `{ "0": {"rate_limit": 5, "max_count": 10}, "1": {"rate_limit": 50, "max_count": 20}, "2": {"rate_limit": -1, "max_count": 100} }`
- **THEN** settings 表中 `level_permissions` 值更新为新的 JSON，所有 `is_active = true` 的 API Key 按其所属用户的 level 更新 rate_limit 和 max_count

#### Scenario: 更新权益时批量同步 API Key
- **WHEN** 管理员将 level 1 的 rate_limit 从 20 改为 50
- **THEN** 所有 level = 1 的用户的已激活 API Key 的 rate_limit 字段更新为 50

#### Scenario: 传入非法 JSON 格式
- **WHEN** 前端传入的 JSON 中包含非数字的 rate_limit 或 max_count
- **THEN** 返回 `{ error: "参数格式错误" }`，不更新 settings 表

### Requirement: Admin UI for level permissions management
管理设置页 SHALL 新增「权益配置」区块，以表格形式展示各 level 的 rate_limit 和 max_count，支持编辑和保存。rate_limit 为 -1 表示不限。

#### Scenario: 管理员查看权益配置
- **WHEN** 管理员进入管理设置页
- **THEN** 页面显示「权益配置」区块，表格包含 level 0/1/2 三行，每行显示 level 名称、rate_limit、max_count

#### Scenario: 管理员修改并保存权益
- **WHEN** 管理员修改某 level 的 rate_limit 或 max_count 后点击保存
- **THEN** 调用 `admin:updateLevelPermissions` IPC，成功后显示保存成功提示
