## ADDED Requirements

### Requirement: 三级定价订阅页面
系统 SHALL 提供独立订阅页面，展示三级定价卡（Free / Plus / Pro），布局参照 `docs/subscribe.html` 设计稿。

#### Scenario: 订阅页面布局
- **WHEN** 用户访问订阅页面
- **THEN** 页面 SHALL 展示三级定价卡网格（桌面端三列，移动端单列）：Free（0 元）、Plus（5 元/月）、Pro（15 元/月），每张卡包含：方案名称、价格、功能列表、操作按钮

#### Scenario: 当前方案高亮
- **WHEN** 已登录用户访问订阅页面
- **THEN** 当前方案对应的卡片 SHALL 显示高亮状态（边框/阴影区分），操作按钮显示"当前方案"且不可点击

#### Scenario: 未登录用户访问
- **WHEN** 未登录用户访问订阅页面
- **THEN** 所有方案 SHALL 显示操作按钮，点击任意升级按钮 SHALL 提示用户先登录

#### Scenario: Free 方案功能列表
- **WHEN** 用户查看 Free 方案卡片
- **THEN** 功能列表 SHALL 显示：3 次 MCP 请求/小时、基础新闻浏览、受限 API 访问

#### Scenario: Plus 方案功能列表
- **WHEN** 用户查看 Plus 方案卡片
- **THEN** 功能列表 SHALL 显示：100 次 MCP 请求/小时、一键手动刷新、邮件支持，Plus 卡片 SHALL 显示"最受欢迎"标签

#### Scenario: Pro 方案功能列表
- **WHEN** 用户查看 Pro 方案卡片
- **THEN** 功能列表 SHALL 显示：不限次数 MCP 请求、优先 API 路由、专属客户管理、自定义安全协议

### Requirement: 订阅页面入口
系统 SHALL 在用户菜单 popover 中提供订阅页面入口。

#### Scenario: 已登录用户菜单显示订阅入口
- **WHEN** 已登录用户点击头像打开 popover
- **THEN** popover SHALL 显示"订阅方案"入口，附带当前方案标签（如"Free"/"Plus"/"Pro"）

#### Scenario: 点击订阅入口跳转
- **WHEN** 用户点击"订阅方案"入口
- **THEN** 系统 SHALL 关闭 popover 并导航到订阅页面

#### Scenario: free用户点击一键刷新显示订阅页面
- **WHEN** free用户点击一键刷新按钮
- **THEN** 显示订阅页面

### Requirement: 升级确认对话框
用户点击升级按钮时 SHALL 弹出确认对话框，确认后发起模拟支付。

#### Scenario: 点击升级按钮弹出确认
- **WHEN** 已登录用户点击非当前方案的升级按钮
- **THEN** 系统 SHALL 弹出确认对话框，显示目标方案名称、价格、确认和取消按钮

#### Scenario: 确认支付过程
- **WHEN** 用户在确认对话框中点击"确认支付"
- **THEN** 对话框按钮 SHALL 变为加载状态（loading），3 秒后返回支付结果

#### Scenario: 支付成功反馈
- **WHEN** 模拟支付成功（3 秒后）
- **THEN** 系统 SHALL 显示成功提示，更新用户 level，更新当前方案高亮状态

#### Scenario: 当前方案不可操作
- **WHEN** 用户查看当前所在方案的卡片
- **THEN** 操作按钮 SHALL 显示"当前方案"文字且 disabled，点击无响应