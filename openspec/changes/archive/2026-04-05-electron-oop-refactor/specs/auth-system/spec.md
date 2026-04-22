## ADDED Requirements

### Requirement: 认证模板方法模式
系统 SHALL 提供抽象模板类 `AuthTemplate`，定义固定认证流程骨架：`initiate → validate → syncUser → createSession`。`syncUser` 和 `createSession` 为具体方法，所有策略共享。`initiate` 和 `validate` 为抽象方法，子类 MUST 实现。

#### Scenario: 模板方法执行顺序
- **WHEN** 调用 `strategy.authenticate(params)`
- **THEN** 系统按顺序执行 `initiate → validate → syncUser → createSession`，任一步骤失败则中断并抛出异常

#### Scenario: 子类未实现抽象方法
- **WHEN** 子类未实现 `initiate()` 或 `validate()`
- **THEN** 调用时 SHALL 抛出错误 "必须实现 initiate()" 或 "必须实现 validate()"

### Requirement: GitHub OAuth 策略
系统 SHALL 提供 `GitHubOAuthStrategy`，通过 GitHub OAuth 2.0 流程完成用户认证。Main Process SHALL 启动临时本地 HTTP Server 接收 OAuth callback。

#### Scenario: GitHub OAuth 完整流程
- **WHEN** 用户选择 GitHub 登录
- **THEN** 系统启动临时本地 HTTP Server（随机端口），通过 `shell.openExternal()` 打开 GitHub 授权页，用户授权后 GitHub redirect 到本地 Server，Main Process 获取 code 并换取 access_token，获取 GitHub 用户信息（id、login/name），执行 syncUser，关闭临时 Server

#### Scenario: GitHub OAuth 超时
- **WHEN** 用户在 GitHub 授权页未操作超过 5 分钟
- **THEN** 临时 Server SHALL 自动关闭，前端收到超时错误

#### Scenario: GitHub OAuth 用户拒绝授权
- **WHEN** 用户在 GitHub 授权页点击拒绝
- **THEN** 系统 SHALL 返回认证失败错误给前端

### Requirement: Email OTP 策略
系统 SHALL 提供 `EmailOTPStrategy`，前端通过 Supabase JS SDK 完成 OTP 验证后，将 JWT 通过 IPC 传给 Main Process 进行验证和用户同步。

#### Scenario: Email OTP 完整流程
- **WHEN** 用户选择邮箱验证码登录
- **THEN** 前端调用 `supabase.auth.signInWithOtp({ email })` 发送验证码，用户输入验证码后前端调用 `supabase.auth.verifyOtp({ email, token })` 获取 JWT，JWT 通过 IPC 传给 Main Process，Main Process 验证 JWT 签名和有效期，提取 email，执行 syncUser

#### Scenario: JWT 验证失败
- **WHEN** Main Process 收到无效或过期的 Supabase JWT
- **THEN** 系统 SHALL 拒绝认证并返回 "JWT 验证失败" 错误

### Requirement: 认证工厂
系统 SHALL 提供 `AuthFactory`，根据认证类型字符串创建对应的策略实例。

#### Scenario: 创建 GitHub 策略
- **WHEN** 调用 `AuthFactory.create('github')`
- **THEN** 返回 `GitHubOAuthStrategy` 实例

#### Scenario: 创建 OTP 策略
- **WHEN** 调用 `AuthFactory.create('otp')`
- **THEN** 返回 `EmailOTPStrategy` 实例

#### Scenario: 未知认证类型
- **WHEN** 调用 `AuthFactory.create('unknown')`
- **THEN** 系统 SHALL 抛出 "未知认证类型: unknown" 错误

### Requirement: Session 管理
认证成功后系统 SHALL 创建本地 Session，包含用户信息和 token。Session 信息 SHALL 持久化到本地安全存储，应用重启后自动恢复。

#### Scenario: 登录成功创建 Session
- **WHEN** 认证流程成功完成
- **THEN** 系统创建包含用户 ID、昵称、token 的 Session，并通过 IPC 通知前端更新状态

#### Scenario: 应用重启恢复 Session
- **WHEN** 应用重启
- **THEN** 系统 SHALL 从本地安全存储读取 Session 信息，验证 token 有效性，有效则自动恢复登录状态

#### Scenario: 登出
- **WHEN** 用户点击登出
- **THEN** 系统 SHALL 清除本地 Session 存储，通知前端重置用户状态
