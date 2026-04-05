## Why

当前登录体验存在两个问题：1) 邮箱 OTP 登录需要用户手动输入验证码，体验较繁琐，改为 Magic Link 后用户只需点击邮件中的链接即可完成登录，更流畅安全；2) 未登录状态下 header 显示 GitHub 图标作为登录入口，不够直观，应改为明确的"登录"按钮并弹出精美的登录模态框。

## What Changes

- 将邮箱 OTP 登录流程替换为 Magic Link 登录：用户输入邮箱 → 发送包含登录链接的邮件 → 用户点击链接完成登录
- 将 header 未登录状态的 GitHub 图标按钮改为"登录"文字按钮
- 新增登录模态框组件，包含邮箱输入 + Magic Link 发送、GitHub 登录两种方式
- 登录后：GitHub 登录显示 GitHub 头像，邮箱登录显示默认头像
- 移除旧的 OTP 相关 UI 代码（popover 中的 OTP 表单）

## Capabilities

### New Capabilities
- `magic-link-auth`: 邮箱 Magic Link 登录流程，替换现有 OTP 方式
- `login-modal`: 独立的登录模态框组件，整合 Magic Link 和 GitHub 两种登录方式

### Modified Capabilities

（无现有 specs 需修改）

## Impact

- **core/auth**: 新增 `email-magic-link-strategy.js`，可能需调整 `auth-factory.js`、`auth-context.js`
- **preload**: 新增 Magic Link 相关 IPC 方法（`sendMagicLink`、`verifyMagicLink`）
- **renderer/App.vue**: 移除 OTP 表单，添加登录按钮和模态框触发逻辑
- **renderer/shared/components**: 新增 `login-modal.vue` 组件
- **Supabase**: 改用 `auth.signInWithOtp({ email, options: { emailRedirectTo } })` 实现 Magic Link（Supabase 的 OTP 接口本身支持 Magic Link 模式）
- **renderer/shared/composables/useAuthApi.js**: 适配新的 Magic Link API
