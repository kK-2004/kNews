## ADDED Requirements

### Requirement: 会话文件持久化
系统 SHALL 将每个会话及其消息持久化为独立的 JSON 文件，存储在 `~/.knews/chat/` 目录。

#### Scenario: 保存会话
- **WHEN** 用户发送消息或 assistant 回复完成
- **THEN** 系统将最新会话内容和 updatedAt 时间戳写入 `~/.knews/chat/<sessionId>.json`

#### Scenario: 文件格式
- **WHEN** 系统写入会话文件
- **THEN** 文件 SHALL 包含：`id`、`title`、`createdAt`、`updatedAt`、`messages` 数组（每条含 role、content、timestamp）

### Requirement: 重启恢复
应用重启后，系统 SHALL 恢复本地保存的会话列表和消息历史。

#### Scenario: 恢复会话列表
- **WHEN** 应用启动后前端请求 `chat:listSessions`
- **THEN** 系统读取 `~/.knews/chat/` 目录下所有 JSON 文件，返回按 updatedAt 倒序排列的会话元数据列表

#### Scenario: 恢复会话消息
- **WHEN** 前端请求 `chat:getSession(sessionId)`
- **THEN** 系统读取对应 JSON 文件，返回完整的消息历史

### Requirement: 自动生成标题
新会话收到第一条用户消息时，系统 SHALL 基于该消息自动生成简短标题。

#### Scenario: 首条消息生成标题
- **WHEN** 新会话收到第一条用户消息且标题为空
- **THEN** 系统截取消息前 20 个字符作为标题，追加省略号（如超过 20 字符），并持久化

### Requirement: 删除会话
用户删除历史会话时，系统 SHALL 同时删除对应的持久化文件。

#### Scenario: 删除会话文件
- **WHEN** 用户通过 `chat:deleteSession` 删除会话
- **THEN** 系统删除 `~/.knews/chat/<sessionId>.json` 文件

### Requirement: 未登录可用
未登录用户在同一设备上 SHALL 仍可使用聊天功能并恢复记录。

#### Scenario: 未登录用户聊天
- **WHEN** 未登录用户打开对话页面
- **THEN** 系统正常提供聊天功能，记录持久化到设备本地
