## MODIFIED Requirements

### Requirement: MCP 请求认证
MCP 请求 SHALL 通过 API Key 认证。外部 MCP 客户端与应用内部聊天客户端都必须通过同一套 API Key 校验、调用计数和限流机制，请求时通过 HTTP Header `Authorization: Bearer <token>` 传递。

#### Scenario: 有效 API Key 认证
- **WHEN** MCP 请求携带有效的 API Key 或 default key 对应的内部认证 token
- **THEN** 系统验证 key_hash 匹配、is_active 为 true，并更新 last_used 和 call_count

#### Scenario: API Key 频率限制
- **WHEN** API Key 在 1 小时内的请求次数超过 rate_limit 设置
- **THEN** 系统 SHALL 返回 429 错误 "请求频率超限"，且应用内部聊天客户端不得绕过该限制

### Requirement: MCP 工具 — get_available_sources
系统 SHALL 提供 `get_available_sources` MCP 工具，返回当前可用的新闻源列表及 API Key 允许的最大抓取数量，并作为后续热点工具调用的前置步骤。

#### Scenario: 查询可用源
- **WHEN** MCP 客户端调用 `get_available_sources` 并提供有效的 API Key
- **THEN** 系统返回该 API Key 允许访问的源列表（source_id、name）和 max_count

#### Scenario: 聊天链路使用前置查询
- **WHEN** 应用内部聊天客户端请求热点上下文
- **THEN** 系统 SHALL 允许其先调用 `get_available_sources` 再调用其他热点工具，并使返回结果与同一 API Key 的外部客户端保持一致

## ADDED Requirements

### Requirement: 应用内部聊天客户端兼容性
本地 MCP Server SHALL 支持应用内部聊天链路作为正式 MCP 客户端接入，并与外部 MCP 客户端共享同一 HTTP 端点、协议行为和工具约束。

#### Scenario: 应用内客户端连接本地 MCP
- **WHEN** Electron Main Process 内的聊天服务以 MCP 客户端身份连接本地 `/mcp`
- **THEN** 系统 SHALL 通过标准 MCP initialize/tool call 流程完成请求，不要求聊天服务使用专用内部接口

#### Scenario: 聊天客户端与外部客户端结果一致
- **WHEN** 应用内部聊天客户端与外部 MCP 客户端使用同一 API Key 对同一 source 调用热点工具
- **THEN** 系统 SHALL 对两者执行相同的鉴权、可用源过滤、max_count 截断与限流规则
