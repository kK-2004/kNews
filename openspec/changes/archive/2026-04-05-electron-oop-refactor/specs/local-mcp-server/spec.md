## ADDED Requirements

### Requirement: 本地 MCP HTTP Server
系统 SHALL 在 Electron Main Process 中启动一个 HTTP Server，提供 MCP（Model Context Protocol）服务。默认端口为 12580，路径为 `/mcp`。

#### Scenario: MCP Server 启动
- **WHEN** Electron Main Process 启动完成
- **THEN** 系统 HTTP Server 开始监听，默认端口 12580，MCP 工具通过 `/mcp` 路径可访问

#### Scenario: 端口占用处理
- **WHEN** 默认端口 12580 被占用
- **THEN** 系统 SHALL 依次尝试 12581、12582... 直到找到可用端口，实际端口写入本地配置文件

#### Scenario: 应用退出时关闭
- **WHEN** 应用关闭
- **THEN** MCP Server SHALL 关闭 HTTP Server，释放端口

### Requirement: MCP 工具 — get_available_sources
系统 SHALL 提供 `get_available_sources` MCP 工具，返回当前可用的新闻源列表及 API Key 允许的最大抓取数量。

#### Scenario: 查询可用源
- **WHEN** MCP 客户端调用 `get_available_sources` 并提供有效的 API Key
- **THEN** 系统返回该 API Key 允许访问的源列表（source_id、name）和 max_count

#### Scenario: 无效 API Key
- **WHEN** MCP 客户端提供的 API Key 无效或已停用
- **THEN** 系统 SHALL 返回 401 错误

### Requirement: MCP 工具 — get_hotest_latest_news
系统 SHALL 提供 `get_hotest_latest_news` MCP 工具，从指定新闻源获取最新热门新闻。

#### Scenario: 获取指定源新闻
- **WHEN** MCP 客户端调用 `get_hotest_latest_news` 指定 source_id 和 count
- **THEN** 系统从缓存中返回该源最新的 count 条新闻（title、url、date）

#### Scenario: 超出允许数量
- **WHEN** 请求的 count 超过 API Key 的 max_count 限制
- **THEN** 系统 SHALL 返回 max_count 条数据

#### Scenario: 源不存在
- **WHEN** 请求的 source_id 不存在
- **THEN** 系统 SHALL 返回错误 "源不存在"

### Requirement: MCP 请求认证
MCP 请求 SHALL 通过 API Key 认证。API Key 存储在 Supabase `api_key` 表中，请求时通过 HTTP Header `Authorization: Bearer knews_xxx` 传递。

#### Scenario: 有效 API Key 认证
- **WHEN** MCP 请求携带有效的 API Key
- **THEN** 系统验证 key_hash 匹配、is_active 为 true、更新 last_used 和 call_count

#### Scenario: API Key 频率限制
- **WHEN** API Key 在 1 小时内的请求次数超过 rate_limit 设置
- **THEN** 系统 SHALL 返回 429 错误 "请求频率超限"

### Requirement: MCP 健康检查
系统 SHALL 提供 `/mcp/health` 端点用于健康检查。

#### Scenario: 健康检查
- **WHEN** 请求 GET `/mcp/health`
- **THEN** 返回 `{ status: "ok", uptime: <seconds>, port: <actual_port> }`
