## ADDED Requirements

### Requirement: 刷新时间标签定时重算
source-board 组件的刷新时间标签 SHALL 每分钟自动重新计算，确保相对时间文字持续更新。

#### Scenario: 时间从"刚刚更新"变为"1分钟前更新"
- **WHEN** 数据刚刚获取（updatedTime 距当前 ≤ 1 分钟），标签显示"刚刚更新"
- **THEN** 经过 1 分钟后，标签 SHALL 自动变为"1分钟前更新"

#### Scenario: 超过10分钟不再每分钟计算
- **WHEN** 某个源的数据获取时间超过 10 分钟
- **THEN** 该源的标签 SHALL 直接显示"10分钟前更新"并停止对该源的每分钟重算（固定文字）

#### Scenario: 单个模块刷新后重新开始计时
- **WHEN** 用户手动刷新某个源（如点击单个模块的刷新按钮）
- **THEN** 该源的 updatedTime 更新，标签从"刚刚更新"重新开始每分钟重算

#### Scenario: 组件卸载时清理定时器
- **WHEN** 父组件（home/index.vue）卸载
- **THEN** 共享定时器 SHALL 被清理，不造成内存泄漏

### Requirement: 父组件提供共享时间源
父组件（home/index.vue）SHALL 维护一个共享的 `now` ref，每分钟更新，通过 provide 传递给所有 source-board 子组件。每个子组件用各自的 `updatedTime` + 共享 `now` 独立计算相对时间。

#### Scenario: 多个 source-board 共享一个定时器
- **WHEN** 页面上有多个 source-board 组件
- **THEN** 所有组件 SHALL 共享同一个 `now` 值，各自根据 updatedTime 独立计算相对时间