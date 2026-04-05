## ADDED Requirements

### Requirement: ScraperEngine 定时刷新
系统 SHALL 提供 `ScraperEngine` class，默认每 10 分钟自动刷新所有已启用的新闻源。定时器 SHALL 在应用启动时自动开始。

#### Scenario: 自动定时刷新
- **WHEN** 应用启动完成
- **THEN** ScraperEngine 启动定时器，每 10 分钟执行一次全源刷新

#### Scenario: 手动刷新全部源
- **WHEN** 用户通过前端点击"刷新"按钮
- **THEN** 系统 SHALL 立即触发一次全源刷新，前端显示刷新状态（loading）

#### Scenario: 手动刷新单个源
- **WHEN** 用户针对某个源点击刷新
- **THEN** 系统 SHALL 只刷新该源的数据

#### Scenario: 应用退出时停止
- **WHEN** 应用关闭
- **THEN** ScraperEngine SHALL 停止定时器，取消所有进行中的抓取任务

### Requirement: 并发抓取控制
系统 SHALL 使用并发控制（最大并发数 5），避免同时发起过多请求。

#### Scenario: 60+ 源并发限制
- **WHEN** 触发全源刷新
- **THEN** 系统最多同时执行 5 个抓取任务，其余排队等待

#### Scenario: 单个源超时
- **WHEN** 某个源抓取超过 30 秒
- **THEN** 系统 SHALL 中止该请求，标记为失败，不影响其他源的抓取

### Requirement: SourceFetcher 源抓取
系统 SHALL 提供 `SourceFetcher` class，负责单个新闻源的数据抓取。每个源 SHALL 对应一个抓取方法，返回统一的新闻数据格式。

#### Scenario: RSS 源抓取
- **WHEN** 抓取 RSS 类型的源
- **THEN** 系统解析 RSS feed，返回标准化的新闻列表（title、url、date、source）

#### Scenario: 自定义抓取器
- **WHEN** 抓取需要 HTML 解析的源
- **THEN** 系统使用 Cheerio 解析页面，按源定义的规则提取新闻数据

#### Scenario: 抓取结果缓存
- **WHEN** 源抓取成功
- **THEN** 结果 SHALL 写入 Supabase cache 表，以 source_id 为键

#### Scenario: 抓取失败处理
- **WHEN** 源抓取失败（网络错误、解析错误）
- **THEN** 系统 SHALL 保留上次缓存数据，记录错误日志，不中断其他源的抓取

### Requirement: 现有源定义复用
系统 SHALL 复用现有 `shared/newsnow-sources.json` 中的源定义和 `server/sources/` 中的抓取实现。

#### Scenario: 加载源配置
- **WHEN** ScraperEngine 初始化
- **THEN** 系统从 `newsnow-sources.json` 读取源列表，只加载 enabled 的源

#### Scenario: 源模块适配
- **WHEN** 源模块使用 `defineSource`、`defineRSSSource` 等现有 API
- **THEN** 系统 SHALL 提供兼容的运行时环境，使现有源代码无需修改即可运行
