## ADDED Requirements

### Requirement: 模拟支付流程
系统 SHALL 使用 setTimeout 模拟支付过程，点击确认支付后延迟 3 秒返回成功结果。

#### Scenario: 模拟支付成功
- **WHEN** 用户确认支付，IPC 调用 `subscription:create`
- **THEN** 主进程 SHALL 等待 3 秒（setTimeout），然后返回 `{ success: true, plan, level }`，并创建订阅记录

#### Scenario: 支付过程中前端状态
- **WHEN** 支付进行中（3 秒等待期内）
- **THEN** 确认对话框的确认按钮 SHALL 显示 loading 状态（旋转图标 + "处理中..."文字），禁止重复点击

#### Scenario: 支付完成前端更新
- **WHEN** IPC 返回支付成功结果
- **THEN** 前端 SHALL 更新 `userStore.profile.level` 为新等级，关闭确认对话框，显示成功 toast 提示，刷新订阅页面当前方案高亮

### Requirement: 支付接口抽象
模拟支付逻辑 SHALL 封装为独立模块，提供统一接口，后续可替换为真实支付网关。

#### Scenario: PaymentService 接口
- **WHEN** SubscriptionService 需要处理支付
- **THEN** SHALL 通过 `PaymentService.processPayment({ userId, plan, amount })` 调用，返回 `{ success: boolean, transactionId: string }`

#### Scenario: 当前实现为模拟
- **WHEN** 调用 `PaymentService.processPayment()`
- **THEN** 当前实现 SHALL 使用 `setTimeout(3000)` 模拟延迟，返回 `{ success: true, transactionId: 'mock_<timestamp>' }`