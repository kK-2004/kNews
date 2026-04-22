## 1. 后端 Magic Link 策略

- [x] 1.1 创建 `core/auth/email-magic-link-strategy.js`，继承 `AuthTemplate`，实现 `initiate`（调用 Supabase `signInWithOtp` 发送 Magic Link）和 `validate`（通过 token 验证并提取邮箱）
- [x] 1.2 修改 `core/auth/auth-factory.js`，注册 `magic-link` 策略类型
- [x] 1.3 删除 `core/auth/email-otp-strategy.js`

## 2. Electron Deep Link 注册

- [x] 2.1 在 Electron main 进程中注册 `knews://` 自定义协议（`app.setAsDefaultProtocolClient`）
- [x] 2.2 实现 deep link 回调处理：解析 `knews://auth/callback?token=xxx`，调用 Magic Link 策略验证 token 并创建 session
- [x] 2.3 处理 macOS 和 Windows 的 deep link 差异（macOS 通过 `open-url` 事件，Windows 通过命令行参数）

## 3. IPC 通道更新

- [x] 3.1 在 `main/ipc/auth.handler.js` 中新增 `auth:sendMagicLink` 处理器
- [x] 3.2 在 `main/ipc/auth.handler.js` 中新增 `auth:verifyMagicLink` 处理器（deep link 回调触发）
- [x] 3.3 移除 `auth:sendOtp` 和 `auth:loginOtp` 处理器
- [x] 3.4 在 `preload/index.js` 中新增 `sendMagicLink` 和 `verifyMagicLink` 方法，移除 `sendOtp` 和 `loginOtp` 方法

## 4. 登录模态框组件

- [x] 4.1 创建 `renderer/shared/components/login-modal.vue`，实现模态框结构（标题、邮箱输入、发送按钮、分隔线、GitHub 按钮、底部链接），严格按照 `docs/login-modal-template.html` 的 HTML 结构和布局实现
- [x] 4.2 实现模态框样式，将 `docs/login-modal-template.html` 中的 Tailwind 类和 Material Design 3 色彩翻译为应用 CSS 变量体系（`primary-gradient` 渐变、`ghost-border`、Material Symbols 图标等）
- [x] 4.3 实现模态框过渡动画（淡入淡出 + backdrop blur）
- [x] 4.4 实现 Magic Link 发送逻辑：邮箱验证 → 调用 `window.api.auth.sendMagicLink` → 显示发送成功状态
- [x] 4.5 实现等待验证状态：发送后显示"请查收邮件"提示，提供重新发送选项
- [x] 4.6 实现 GitHub 登录按钮：点击后关闭模态框并触发 GitHub Device Flow

## 5. Header 登录按钮与头像逻辑

- [x] 5.1 修改 `renderer/App.vue` header 区域：未登录时显示"登录"文字按钮（替代 GitHub 图标圆形按钮）
- [x] 5.2 点击"登录"按钮打开 `login-modal`，点击模态框内 GitHub 登录后打开 `github-device-dialog`
- [x] 5.3 修改头像 fallback 逻辑：根据 `userStore.loginType` 显示不同图标（GitHub → `i-tabler-brand-github-filled`，magic-link → `i-tabler-user`）
- [x] 5.4 移除 `App.vue` 中 OTP 相关的状态变量（`otpEmail`、`otpCode`、`otpSent`、`otpSending`、`otpVerifying`）和处理函数（`sendOtp`、`verifyOtp`）
- [x] 5.5 移除 `App.vue` user-popover 中的 OTP 表单 HTML 和相关 CSS

## 6. Supabase 配置

- [x] 6.1 配置 Supabase 项目 redirect URL 为 `knews://auth/callback`（文档说明）
