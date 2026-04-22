## ADDED Requirements

### Requirement: Manual refresh button requires user level >= 1
手动"一键刷新"按钮 SHALL 仅对已登录且 `userStore.profile.level >= 1` 的用户可见和可用。

#### Scenario: Logged-in user with level >= 1 clicks refresh
- **WHEN** 已登录用户（level >= 1）点击"一键刷新"按钮
- **THEN** 系统 SHALL 触发全量数据刷新（`knews:refresh-feed` 事件），刷新所有数据源

#### Scenario: Logged-in user with level < 1 clicks refresh
- **WHEN** 已登录用户（level < 1 或 level 为 undefined）尝试手动刷新
- **THEN** 系统 SHALL 显示升级订阅提示界面，告知用户需要升级才能使用此功能

#### Scenario: Not logged-in user attempts refresh
- **WHEN** 未登录用户看到应用界面
- **THEN** "一键刷新"按钮 SHALL 不显示，或显示为灰色禁用状态并提示登录

### Requirement: Upgrade subscription placeholder
当用户 level 不足时，系统 SHALL 显示升级订阅提示，具体订阅界面后续完善。

#### Scenario: Upgrade prompt shown
- **WHEN** 用户因 level 不足被限制手动刷新
- **THEN** 系统 SHALL 显示简短的升级提示信息（如 toast 或弹窗），说明此功能需要升级订阅
