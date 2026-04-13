## ADDED Requirements

### Requirement: 订阅按钮按 level 等级禁用
订阅页面的方案卡片按钮 SHALL 根据用户当前 level 禁用所有低于或等于当前等级的方案。

#### Scenario: Pro 用户查看所有方案
- **WHEN** level=2（Pro）用户访问订阅页面
- **THEN** Free 和 Plus 卡片的按钮 SHALL 显示为禁用状态，文字显示"已包含"；Pro 卡片显示"当前方案"

#### Scenario: Plus 用户查看所有方案
- **WHEN** level=1（Plus）用户访问订阅页面
- **THEN** Free 卡片按钮 SHALL 显示为禁用状态，文字显示"已包含"；Plus 卡片显示"当前方案"；Pro 卡片正常显示"立即获取专业版"

#### Scenario: Free 用户查看所有方案
- **WHEN** level=0（Free）用户访问订阅页面
- **THEN** Free 卡片显示"当前方案"（禁用）；Plus 和 Pro 卡片正常显示升级按钮

#### Scenario: 未登录用户查看所有方案
- **WHEN** 未登录用户访问订阅页面
- **THEN** 所有卡片按钮 SHALL 正常显示（Free 显示"开始使用"，Plus 显示"升级到高级版"，Pro 显示"立即获取专业版"），点击时提示先登录