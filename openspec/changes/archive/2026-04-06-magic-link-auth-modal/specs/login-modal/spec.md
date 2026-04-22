## ADDED Requirements

### Requirement: 未登录状态显示登录按钮
系统 SHALL 在用户未登录时，在 header 右侧显示"登录"文字按钮，替代当前的 GitHub 图标圆形按钮。

#### Scenario: 未登录状态 header
- **WHEN** 用户未登录（`userStore.authToken` 和 `userStore.profile` 均为空）
- **THEN** header 右侧 SHALL 显示"登录"文字按钮，样式与现有 header 按钮一致

#### Scenario: 已登录状态 header
- **WHEN** 用户已登录
- **THEN** header 右侧 SHALL 显示用户头像（圆形按钮），行为与当前一致

### Requirement: 登录模态框组件
系统 SHALL 提供独立的登录模态框组件 `login-modal.vue`，包含邮箱 Magic Link 登录和 GitHub 登录两种方式。具体布局、色彩、尺寸和交互样式 SHALL 参照 `docs/login-modal-template.html` 实现。

**实现参考**：`docs/login-modal-template.html` — 定义了模态框的完整视觉规范，包括 Material Design 3 色彩体系、圆角、渐变按钮、分割线、字体等。

#### Scenario: 模态框布局
- **WHEN** 用户点击"登录"按钮
- **THEN** 系统 SHALL 弹出模态框，包含以下结构（参照 `docs/login-modal-template.html`）：
  - **Backdrop**：半透明遮罩 `bg-on-surface/5 backdrop-blur-sm`，z-index 40
  - **Modal 容器**：最大宽度 480px，白色背景 `bg-surface-container-lowest`，圆角 `rounded-xl`，阴影 `shadow-[0_32px_32px_-8px_rgba(24,28,33,0.04)]`
  - **Header 区域**：锁图标（12x12 圆形 `bg-primary-fixed` 背景）、标题"安全访问"（Manrope 3xl extrabold）、副标题"选择您的身份验证方式以继续"
  - **邮箱区域**：标签"工作邮箱"（sm semibold）、邮箱输入框（h-12，ghost-border，placeholder "name@company.com"）、"发送验证码"渐变按钮（`primary-gradient`：`linear-gradient(135deg, #0060a9, #409eff)`，白色文字，带 send 图标）
  - **分割线**：水平线 + "或" 文字（xs bold uppercase tracking-widest）
  - **GitHub 按钮**：`bg-surface-container` 背景，GitHub SVG 图标 + "使用 GitHub 登录"文字
  - **Footer**：`bg-surface-container-low` 背景，隐私政策和服务条款链接（12px，primary 色）

#### Scenario: 模态框关闭
- **WHEN** 用户点击模态框外部遮罩区域或按 Escape 键
- **THEN** 系统 SHALL 关闭模态框

#### Scenario: 模态框过渡动画
- **WHEN** 模态框打开或关闭
- **THEN** 系统 SHALL 显示淡入淡出过渡动画（backdrop blur 效果）

### Requirement: 模态框内 Magic Link 流程
用户 SHALL 在模态框内完成 Magic Link 登录流程。

#### Scenario: 输入邮箱并发送
- **WHEN** 用户输入邮箱并点击"发送验证码"
- **THEN** 按钮状态变为加载中，发送成功后显示"请查收邮件"提示，邮箱输入框和按钮变为已发送状态

#### Scenario: 等待验证中
- **WHEN** Magic Link 已发送但用户尚未点击链接
- **THEN** 模态框 SHALL 显示等待状态提示，用户可以重新发送

### Requirement: 模态框内 GitHub 登录
用户 SHALL 可以在模态框内发起 GitHub Device Flow 登录。

#### Scenario: 点击 GitHub 登录
- **WHEN** 用户在模态框中点击"使用 GitHub 登录"按钮
- **THEN** 系统 SHALL 关闭登录模态框，触发 GitHub Device Flow 流程（复用现有 `github-device-dialog`）

### Requirement: 登录后头像显示
系统 SHALL 根据登录方式显示不同的用户头像。

#### Scenario: GitHub 登录用户头像
- **WHEN** 用户通过 GitHub 登录成功
- **THEN** header 用户按钮 SHALL 显示用户的 GitHub 头像图片

#### Scenario: 邮箱登录用户头像
- **WHEN** 用户通过 Magic Link 邮箱登录成功
- **THEN** header 用户按钮 SHALL 显示默认用户图标（`i-tabler-user`）作为头像

#### Scenario: 无头像的已登录用户
- **WHEN** 用户已登录但无头像 URL（`userStore.profile.avatar` 为空）
- **THEN** 系统 SHALL 根据 `userStore.loginType` 显示对应图标：GitHub 用户显示 GitHub 图标，邮箱用户显示通用用户图标
