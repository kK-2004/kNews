## ADDED Requirements

### Requirement: 用户表结构
系统 SHALL 在 Supabase 中创建 `public.users` 表，包含以下字段：
- `id` (BIGINT, GENERATED ALWAYS AS IDENTITY, PRIMARY KEY)
- `email` (TEXT, 可空)
- `github_id` (TEXT, 可空)
- `nickname` (TEXT, NOT NULL)
- `level` (INTEGER, NOT NULL, 默认 0，取值：0=普通用户, 1=plus, 2=pro)
- `balance` (DECIMAL(10,2), NOT NULL, 默认 0)
- `created_at` (TIMESTAMPTZ, NOT NULL, 默认 now())
- `updated_at` (TIMESTAMPTZ, NOT NULL, 默认 now())

#### Scenario: 用户表创建
- **WHEN** 执行数据库迁移
- **THEN** `public.users` 表按上述结构创建成功，`level` 默认为 0，`balance` 默认为 0

### Requirement: 首次登录自动创建用户
用户首次通过 GitHub OAuth 或 Email OTP 登录时，系统 SHALL 自动在 `public.users` 表中创建用户记录。

#### Scenario: GitHub 首次登录创建用户
- **WHEN** GitHub OAuth 认证成功且 `github_id` 在 users 表中不存在
- **THEN** 系统创建新用户记录：`github_id` 设为 GitHub 用户 ID，`nickname` 设为 GitHub 用户名（login），`email` 和 `level` 使用默认值

#### Scenario: Email OTP 首次登录创建用户
- **WHEN** Email OTP 认证成功且 `email` 在 users 表中不存在
- **THEN** 系统创建新用户记录：`email` 设为验证通过的邮箱，`nickname` 设为邮箱前缀（@ 之前的部分），`github_id` 使用默认值 NULL

#### Scenario: 重复登录不重复创建
- **WHEN** 已有用户再次登录
- **THEN** 系统 SHALL 更新 `updated_at` 时间戳，不创建新记录。如果 GitHub 用户信息（如 nickname）发生变化，SHALL 同步更新

### Requirement: UserRepository 数据访问
系统 SHALL 提供 `UserRepository` class，封装用户表的 CRUD 操作。

#### Scenario: 按条件查找用户
- **WHEN** 调用 `userRepository.findByGithubId(id)` 或 `userRepository.findByEmail(email)`
- **THEN** 返回匹配的用户对象或 null

#### Scenario: 创建用户
- **WHEN** 调用 `userRepository.create(userData)`
- **THEN** 在数据库中插入新用户记录并返回包含 `id` 的完整用户对象

#### Scenario: 更新用户
- **WHEN** 调用 `userRepository.update(id, userData)`
- **THEN** 更新指定用户的字段并更新 `updated_at` 时间戳

### Requirement: UserService 业务逻辑
系统 SHALL 提供 `UserService` class，封装用户相关的业务逻辑，包括 `syncUser`（认证时调用）和用户信息查询。

#### Scenario: syncUser - GitHub 用户同步
- **WHEN** 调用 `userService.syncUser({ provider: 'github', github_id: '12345', nickname: 'alice' })`
- **THEN** 若 `github_id` 已存在则更新 nickname 和 updated_at；若不存在则创建新用户并返回用户对象

#### Scenario: syncUser - Email 用户同步
- **WHEN** 调用 `userService.syncUser({ provider: 'email', email: 'bob@example.com' })`
- **THEN** 若 `email` 已存在则更新 updated_at；若不存在则创建新用户（nickname 为 'bob'）并返回用户对象
