## ADDED Requirements

### Requirement: Subscriptions 数据表
系统 SHALL 在 Supabase 中创建 `subscriptions` 表，记录用户订阅状态。

#### Scenario: Subscriptions 表结构
- **WHEN** 迁移执行完成
- **THEN** `subscriptions` 表包含字段：id (TEXT PK)、user_id (BIGINT → users.id)、plan (TEXT: 'free'/'plus'/'pro')、level (INTEGER: 0/1/2)、status (TEXT: 'active'/'expired')、started_at (TIMESTAMPTZ)、expires_at (TIMESTAMPTZ)、created_at (TIMESTAMPTZ)、updated_at (TIMESTAMPTZ)

### Requirement: SubscriptionRepository 数据访问
系统 SHALL 提供 SubscriptionRepository class，封装 subscriptions 表的查询与操作。

#### Scenario: 查询用户当前有效订阅
- **WHEN** 调用 `subscriptionRepo.findActiveByUserId(userId)`
- **THEN** 返回 status 为 'active' 的最新订阅记录，无则返回 null

#### Scenario: 创建订阅记录
- **WHEN** 调用 `subscriptionRepo.create({ user_id, plan, level, status, started_at, expires_at })`
- **THEN** 插入新订阅记录并返回完整对象

### Requirement: SubscriptionService 业务逻辑
系统 SHALL 提供 SubscriptionService class，封装订阅管理的业务逻辑。

#### Scenario: 创建订阅（升级）
- **WHEN** 调用 `subscriptionService.createSubscription(userId, plan)`
- **THEN** 系统 SHALL 将用户当前有效订阅标记为 expired，创建新订阅记录（status = active），更新 users.level 为对应等级，同步更新用户 MCP API Key 的 rate_limit/max_count

#### Scenario: 查询当前订阅
- **WHEN** 调用 `subscriptionService.getCurrentSubscription(userId)`
- **THEN** 返回用户当前有效订阅记录，含 plan、level、status、expires_at；无有效订阅则返回 Free 方案默认信息

#### Scenario: Level 与权限映射
- **WHEN** 订阅创建或变更导致 level 变化
- **THEN** 系统 SHALL 按映射表更新 MCP API Key 权限：level 0 → rate_limit=3, max_count=10；level 1 → rate_limit=100, max_count=50；level 2 → rate_limit=-1(无限), max_count=-1(无限)

#### Scenario: 防止重复订阅创建
- **WHEN** 用户已有 active 的相同 plan 订阅
- **THEN** 系统 SHALL 返回当前订阅信息，不创建新记录

### Requirement: 订阅 IPC 通道
系统 SHALL 提供订阅相关的 IPC 通道。

#### Scenario: subscription:getCurrent 通道
- **WHEN** 渲染进程调用 `window.api.subscription.getCurrent()`
- **THEN** 主进程 SHALL 返回当前用户的订阅信息（plan、level、status、expires_at）

#### Scenario: subscription:create 通道
- **WHEN** 渲染进程调用 `window.api.subscription.create({ plan })`
- **THEN** 主进程 SHALL 执行模拟支付（3 秒延迟），成功后创建订阅并返回结果