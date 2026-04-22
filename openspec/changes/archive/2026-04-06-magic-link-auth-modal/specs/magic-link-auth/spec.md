## ADDED Requirements

### Requirement: 发送 Magic Link 邮件
系统 SHALL 允许用户输入邮箱地址并发送包含登录链接的邮件。发送成功后 SHALL 在 UI 上显示确认提示。

#### Scenario: 成功发送 Magic Link
- **WHEN** 用户在登录模态框中输入有效邮箱并点击"发送验证码"按钮
- **THEN** 系统 SHALL 调用 Supabase `signInWithOtp` 发送 Magic Link 邮件，并显示"邮件已发送"提示

#### Scenario: 无效邮箱格式
- **WHEN** 用户输入不符合邮箱格式的字符串
- **THEN** 系统 SHALL 禁用发送按钮或显示邮箱格式错误提示

#### Scenario: 发送失败
- **WHEN** Supabase API 返回错误
- **THEN** 系统 SHALL 显示错误信息，允许用户重试

### Requirement: 通过 Deep Link 完成 Magic Link 登录
系统 SHALL 注册 Electron 自定义协议 `knews://`，在用户点击邮件中的 Magic Link 时自动唤起应用并完成登录。

#### Scenario: Deep Link 登录成功
- **WHEN** 用户点击邮件中的 Magic Link，系统捕获 `knews://auth/callback?token=xxx` 回调
- **THEN** 系统 SHALL 验证 token，创建用户 session，更新 UI 为已登录状态，关闭登录模态框

#### Scenario: Deep Link token 过期
- **WHEN** 用户点击已过期的 Magic Link
- **THEN** 系统 SHALL 显示"链接已过期，请重新发送"的错误提示

#### Scenario: Deep Link token 无效
- **WHEN** 用户点击的链接中包含无效或篡改的 token
- **THEN** 系统 SHALL 显示"链接无效"的错误提示，不创建 session

### Requirement: Magic Link 后端策略
系统 SHALL 新增 `email-magic-link-strategy.js` 认证策略，遵循 `AuthTemplate` 模板方法模式，provider 标识为 `magic-link`。

#### Scenario: 策略注册到 AuthFactory
- **WHEN** 调用 `AuthFactory.create('magic-link', deps)`
- **THEN** 系统 SHALL 返回 `EmailMagicLinkStrategy` 实例

#### Scenario: Magic Link 验证流程
- **WHEN** 策略的 `validate` 方法接收到 deep link 中的 token
- **THEN** 系统 SHALL 通过 Supabase 验证 token 并提取用户邮箱信息

### Requirement: IPC 通道支持 Magic Link
系统 SHALL 提供 `auth:sendMagicLink` 和 `auth:verifyMagicLink` IPC 通道。

#### Scenario: auth:sendMagicLink 通道
- **WHEN** 渲染进程调用 `window.api.auth.sendMagicLink(email)`
- **THEN** 主进程 SHALL 调用 Supabase 发送 Magic Link 邮件并返回结果

#### Scenario: auth:verifyMagicLink 通道
- **WHEN** 渲染进程或 deep link 回调触发 `auth:verifyMagicLink(token)`
- **THEN** 主进程 SHALL 验证 token 并返回 session 或错误

### Requirement: 移除 OTP 登录
系统 SHALL 移除旧的 OTP 相关代码：`EmailOTPStrategy`、`auth:sendOtp` / `auth:loginOtp` IPC 通道、以及前端 OTP 表单。

#### Scenario: OTP 通道不可用
- **WHEN** 应用启动
- **THEN** 不再注册 `auth:sendOtp` 和 `auth:loginOtp` IPC 处理器

#### Scenario: OTP 前端代码已移除
- **WHEN** 检查 App.vue 或其他组件
- **THEN** 不存在 OTP 相关的表单、状态变量和处理函数
