## Context

kNews 是一个 Electron 桌面应用，使用 Vue 3 + Pinia 管理前端状态，Supabase 作为认证后端。当前支持两种登录方式：GitHub Device Flow OAuth 和邮箱 OTP 验证码。OTP 流程需要用户在 popover 中输入邮箱 → 收到验证码 → 手动输入 6 位数字，体验较繁琐。登录入口是 header 右上角的一个 GitHub 图标圆形按钮，未登录用户难以发现。

Header 结构：品牌 Logo → 标签页（仅首页）→ 桌面导航（主题切换、刷新）→ 用户菜单（圆形头像按钮）。

用户菜单 popover 当前内嵌了 OTP 表单，空间拥挤，不适合更复杂的登录 UI。

## Goals / Non-Goals

**Goals:**
- 将邮箱 OTP 登录替换为 Magic Link：用户输入邮箱 → 收到包含登录链接的邮件 → 应用内检测到登录成功
- 未登录时 header 显示"登录"文字按钮替代 GitHub 图标
- 点击"登录"弹出模态框，整合邮箱 Magic Link 和 GitHub 登录
- 登录后：GitHub 用户显示 GitHub 头像，邮箱用户显示默认头像图标
- 登录模态框遵循用户提供的设计稿风格（Material Design 色彩体系、圆角、渐变按钮）

**Non-Goals:**
- 不修改 GitHub Device Flow 登录流程本身
- 不修改后端用户模型或数据库 schema
- 不做暗色模式适配登录模态框（用户设计稿仅提供亮色版本，后续迭代处理）
- 不增加第三方 OAuth 提供商

## Decisions

### 1. Magic Link 实现：使用 Supabase `signInWithOtp` + `emailRedirectTo`

Supabase 的 `signInWithOtp` 在配置 `emailRedirectTo` 后，发送的不是 OTP 验证码而是包含 token 的登录链接。点击链接后，Supabase 处理验证，应用通过 Deep Link 或轮询获取 session。

**替代方案**：自建 Magic Link 服务（生成 token → 存 DB → 发邮件 → 验证）。成本太高且 Supabase 已原生支持。

**实现路径**：
1. 调用 `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'knews://auth/callback' } })`，Supabase 发送 Magic Link 邮件
2. 注册 Electron deep link 协议 `knews://`，捕获回调 URL 中的 token
3. 用 `supabase.auth.getSessionFromUrl()` 或直接从 URL 提取 token 完成验证
4. 后端创建应用 session 并持久化

**备选轮询方案**：如果不注册 deep link，可在用户点击"发送"后进入轮询状态，定期调用 Supabase 检查是否有新 session。这更简单但 UX 稍差（需要保持模态框打开等待）。考虑到这是 Electron 桌面应用且已有注册自定义协议的惯例，采用 deep link 方案。

### 2. 登录模态框作为独立 Vue 组件

将登录 UI 从 `App.vue` 的 popover 中提取为独立 `login-modal.vue` 组件。使用 `v-model:visible` 控制显示/隐藏，遵循 `base-modal.vue` 的模式（如果有的话）或自行实现 Teleport + 过渡动画。

### 3. "登录"按钮样式

未登录时，将圆形 `user-trigger` 按钮替换为类似 `refresh-btn` 的文字按钮（显示"登录"文字），保持与现有 header 按钮风格一致。登录后恢复为圆形头像按钮。

### 4. 默认头像

邮箱登录用户无 GitHub 头像。使用现有的 `avatar-fallback` 但图标改为通用用户图标（`i-tabler-user`）替代 GitHub 图标。根据 `userStore.loginType` 判断显示哪个图标。

## Risks / Trade-offs

- **Deep Link 注册**：需要在 Electron main 进程中注册 `knews://` 协议，可能需要处理 macOS 和 Windows 的差异 → 使用 `app.setAsDefaultProtocolClient` 统一处理
- **Supabase Magic Link 配置**：需要在 Supabase Dashboard 中配置 redirect URL 为 `knews://auth/callback`，否则链接无法打开应用 → 文档说明配置步骤
- **轮询 vs Deep Link**：如果 deep link 注册失败（某些系统环境），回退到轮询方案 → 两种方案都实现，优先 deep link
- **模态框样式差异**：用户设计稿使用 Tailwind + Material Design 色彩，但应用使用 UnoCSS + CSS 变量 → 需要将设计稿的视觉效果翻译为应用的 CSS 变量体系，或在模态框内使用自定义样式
