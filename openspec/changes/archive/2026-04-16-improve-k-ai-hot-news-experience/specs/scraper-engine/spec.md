## ADDED Requirements

### Requirement: 禁用源双重校验
系统 SHALL 对全局禁用数据源执行候选筛选和执行前二次校验，确保禁用源不会被定时刷新、手动刷新或热点问答补拉链路触发。

#### Scenario: 定时刷新跳过禁用源
- **WHEN** ScraperEngine 执行全量定时刷新
- **THEN** 系统 SHALL 仅调度全局启用源，并将禁用源标记为跳过而不是发起抓取请求

#### Scenario: 单源刷新前再次校验
- **WHEN** 任意调用链请求 `refreshOne(sourceId)`
- **THEN** 系统 SHALL 在真正发起网络请求前查询该源的最新 enabled 状态；若为禁用，则直接返回 `disabled/skipped` 结果

#### Scenario: 启用态变化及时生效
- **WHEN** 管理员在应用运行期间将某个源切换为禁用
- **THEN** 后续定时刷新、手动刷新和聊天热点补拉 SHALL 立即以数据库中的最新 enabled 状态为准，不继续请求旧状态下的源
