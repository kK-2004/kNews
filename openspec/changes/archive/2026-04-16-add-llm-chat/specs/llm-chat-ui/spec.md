## 设计参考

前端 UI SHALL 参照 Stitch 设计稿实现：
- 设计稿 HTML：`docs/k-ai-screen.html`
- 设计稿截图：`docs/k-ai-screen.png`
- 设计系统：Manrope 标题字体 + Inter 正文字体，Material Symbols Outlined 图标
- 色彩体系：复用现有 `.theme-light` / `.theme-dark` CSS 变量（`--bg`、`--surface`、`--text`、`--muted`、`--border`），不再引入 Stitch 独立色板
- 布局参照：精简侧边栏 w-72 + 主内容区 flex-1，消息气泡圆角 rounded-2xl，渐变发送按钮

## ADDED Requirements

### Requirement: 独立的 AI 对话助手页面
系统 SHALL 提供独立的 `/assistant` 路由页面，包含精简侧边栏（会话列表）、消息主区域、输入区和热点快捷入口。视觉布局参照 `docs/k-ai-screen.html` 设计稿。

#### Scenario: 用户导航到对话页面
- **WHEN** 用户点击导航栏中的 AI 对话入口
- **THEN** 系统导航到 `/assistant` 路由并加载对话助手页面

#### Scenario: 页面复用主题
- **WHEN** 用户当前使用暗色主题并进入对话页面
- **THEN** 页面所有组件（侧边栏、消息区、输入框）SHALL 使用暗色主题样式

### Requirement: 侧边栏会话列表
系统 SHALL 在页面左侧展示精简侧边栏，包含"新建对话"按钮和按 `updatedAt` 倒序排列的历史会话列表。

#### Scenario: 显示会话列表
- **WHEN** 页面加载且有历史会话
- **THEN** 侧边栏 SHALL 按最近更新时间倒序展示所有会话，每项显示自动生成的标题

#### Scenario: 切换会话
- **WHEN** 用户点击侧边栏中的某个历史会话
- **THEN** 主区域 SHALL 加载并显示该会话的全部消息历史

### Requirement: 新建对话
用户点击"新建对话"按钮时，系统 SHALL 创建一个空会话并聚焦输入框。

#### Scenario: 创建新会话
- **WHEN** 用户点击"新建对话"按钮
- **THEN** 系统创建新的空会话，清空主区域消息，聚焦输入框

### Requirement: 消息发送与展示
用户发送消息后，系统 SHALL 立即显示用户消息，禁用重复提交，并展示 assistant 等待状态。

#### Scenario: 发送消息并等待回复
- **WHEN** 用户输入文本并点击发送
- **THEN** 系统立即在消息流中显示用户消息气泡，禁用发送按钮，显示 assistant 加载指示器

#### Scenario: 收到回复
- **WHEN** assistant 回复成功返回
- **THEN** 系统追加 assistant 消息到消息流，自动滚动到最新消息，恢复发送按钮

#### Scenario: 回复失败
- **WHEN** GLM API 请求失败（超时、鉴权失败等）
- **THEN** 系统在消息流中显示用户可理解的错误提示，不丢失已有消息

### Requirement: 删除会话
用户 SHALL 能删除历史会话。

#### Scenario: 删除会话
- **WHEN** 用户选择删除某个历史会话
- **THEN** 系统从会话列表移除该会话，删除持久化记录，如果删除的是当前会话则切换到最近一个会话或新建空会话

### Requirement: 热点快捷入口
页面 SHALL 展示基于当前热点数据的快捷问题，支持用户一键围绕热点发起对话。

#### Scenario: 展示热点快捷入口
- **WHEN** 页面加载且有可用热点数据
- **THEN** 输入区下方 SHALL 展示热点快捷问题卡片

#### Scenario: 点击热点快捷入口
- **WHEN** 用户点击某个热点快捷问题
- **THEN** 系统将该问题作为用户消息发送，并附带热点上下文

### Requirement: 流式响应与打字机效果
系统 SHALL 使用 SSE streaming 调用 LLM，逐 token 推送到前端，实现打字机效果。

#### Scenario: 流式接收回复
- **WHEN** 用户发送消息后等待 AI 回复
- **THEN** 系统 SHALL 立即显示用户消息，然后在 assistant 消息气泡中逐字显示回复内容，形成打字机效果

#### Scenario: 流式完成后持久化
- **WHEN** 流式响应完成
- **THEN** 系统 SHALL 将完整的用户消息和 assistant 回复持久化到会话文件

#### Scenario: 流式中断
- **WHEN** 流式传输过程中发生错误
- **THEN** 系统 SHALL 保留已接收的内容，显示错误提示，不丢失已有消息

### Requirement: Agent 状态展示
系统 SHALL 在消息处理过程中实时展示当前 Agent 操作状态。

#### Scenario: 显示热点获取状态
- **WHEN** 系统判断需要获取热点数据并开始逐源获取
- **THEN** 消息区 SHALL 显示状态指示器，实时更新当前操作（如"正在获取热点数据..."、"正在调用 MCP 获取【抖音】热点..."）

#### Scenario: 状态转为流式输出
- **WHEN** 热点数据获取完成并开始 LLM 流式响应
- **THEN** 状态指示器 SHALL 消失，消息区切换为打字机输出模式

### Requirement: 可点击新闻卡片
系统 SHALL 将 AI 回复中的新闻条目渲染为可点击的卡片组件。

#### Scenario: 新闻条目显示为卡片
- **WHEN** AI 回复中包含新闻标题和链接（markdown 格式）
- **THEN** 系统 SHALL 将其渲染为独立的可点击新闻卡片，显示标题和来源信息

#### Scenario: 点击新闻卡片
- **WHEN** 用户点击某个新闻卡片
- **THEN** 系统 SHALL 在系统默认浏览器中打开该新闻的原文链接
