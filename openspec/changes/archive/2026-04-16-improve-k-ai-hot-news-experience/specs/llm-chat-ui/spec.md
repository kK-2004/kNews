## MODIFIED Requirements

### Requirement: Agent 状态展示
系统 SHALL 在消息处理过程中实时展示当前 Agent 操作状态，并将热点拉取进度渲染为可追加的渠道事件流，而不是仅用单条文案覆盖当前状态。

#### Scenario: 显示热点获取状态
- **WHEN** 系统判断需要获取热点数据并开始逐源获取
- **THEN** 消息区 SHALL 显示状态事件流，按时间顺序追加每个渠道的开始、完成、跳过或失败记录

#### Scenario: 多渠道追加展示
- **WHEN** 本轮热点请求依次处理多个数据源
- **THEN** 前端 SHALL 保留已显示的渠道事件，并继续追加新的渠道记录，而不是把上一条状态替换为当前渠道名称

#### Scenario: 状态转为流式输出
- **WHEN** 热点数据获取完成并开始 LLM 流式响应
- **THEN** 状态事件流 SHALL 停止追加新记录，正文区域切换为流式输出模式，已展示的状态记录保留在本轮消息中

### Requirement: 可点击新闻卡片
系统 SHALL 将 AI 回复中的新闻条目渲染为可点击的紧凑卡片组件，并采用更高信息密度的热点气泡样式。

#### Scenario: 新闻条目显示为紧凑卡片
- **WHEN** AI 回复中包含新闻标题和链接（markdown 格式）
- **THEN** 系统 SHALL 将其渲染为紧凑的可点击新闻卡片，减少冗余垂直留白，并展示标题、摘要和来源动作区

#### Scenario: 视觉参考一致
- **WHEN** 前端渲染热点新闻卡片
- **THEN** 卡片整体层次、圆角、分区和间距 SHALL 参考 `docs/k-ai-screen.html` 中的气泡新闻区域进行实现

#### Scenario: 点击新闻卡片
- **WHEN** 用户点击某个新闻卡片
- **THEN** 系统 SHALL 在系统默认浏览器中打开该新闻的原文链接

## ADDED Requirements

### Requirement: 实时 Thinking 展示
系统 SHALL 在 assistant 回复过程中展示与正文分离的实时 Thinking 区，但仅显示当前流式产生的思考片段，不展示完整 Thinking 历史。

#### Scenario: 收到 Thinking 增量
- **WHEN** 前端接收到本轮回复的 Thinking 增量事件
- **THEN** 系统 SHALL 将该增量追加到当前消息的 Thinking 区，并与最终正文区分展示

#### Scenario: Thinking 不持久化
- **WHEN** 本轮回复完成、失败或被用户中断
- **THEN** 系统 SHALL 清空当前会话中的实时 Thinking 缓冲，不在历史消息恢复时重放整段 Thinking

#### Scenario: 无 Thinking 数据时降级
- **WHEN** 模型未返回 Thinking 增量事件
- **THEN** 前端 SHALL 仅展示正文流式输出，不显示空的 Thinking 容器
