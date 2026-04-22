## 1. 数据库默认值

- [x] 1.1 新增 migration `010_seed_level_permissions.sql`，向 settings 表 INSERT `level_permissions` 键（JSON 默认值 `{0:{rate_limit:3,max_count:5}, 1:{rate_limit:20,max_count:10}, 2:{rate_limit:-1,max_count:50}}`），ON CONFLICT DO NOTHING

## 2. 后端核心改造

- [x] 2.1 `core/user/user-service.js`：移除硬编码 `LEVEL_PERMISSIONS` 常量，构造函数新增 `settingsRepo` 依赖，`_createDefaultApiKey` 改为 `await settingsRepo.get('level_permissions')` 读取权限，解析失败时使用 fallback
- [x] 2.2 `core/subscription/subscription-service.js`：移除硬编码 `LEVEL_PERMISSIONS` 常量，构造函数新增 `settingsRepo` 依赖，`_syncApiKeyPermissions` 改为运行时读取权限，`createSubscription` 中使用同样的动态读取
- [x] 2.3 `main/ipc/admin.handler.js`：移除硬编码 `LEVEL_PERMISSIONS` 常量，`register` 函数签名新增 `settingsRepo` 参数，`createApiKey` 改为运行时读取权限

## 3. 依赖注入

- [x] 3.1 `main/bootstrap.js`：将 `settingsRepo` 实例注入到 `UserService` 和 `SubscriptionService` 构造函数，将 `settingsRepo` 传入 `admin.handler.register`

## 4. 新增 IPC 通道

- [x] 4.1 `main/ipc/admin.handler.js` 新增 `admin:getLevelPermissions` handler：调用 `settingsRepo.get('level_permissions')`，返回解析后的对象
- [x] 4.2 `main/ipc/admin.handler.js` 新增 `admin:updateLevelPermissions` handler：校验 JSON 格式 → 调用 `settingsRepo.set('level_permissions', JSON.stringify(data))` → 遍历所有 `is_active = true` 的 API Key，按用户 level 更新 rate_limit / max_count
- [x] 4.3 `preload` 层桥接新增 `admin:getLevelPermissions` / `admin:updateLevelPermissions` 两个 IPC 调用

## 5. 管理端 UI

- [x] 5.1 管理设置页（admin settings）新增「权益配置」区块，以表格展示 level 0/1/2 的 rate_limit 和 max_count，支持行内编辑
- [x] 5.2 保存按钮调用 `admin:updateLevelPermissions`，成功后显示 toast 提示
- [x] 5.3 页面加载时调用 `admin:getLevelPermissions` 填充表格，loading 状态处理
