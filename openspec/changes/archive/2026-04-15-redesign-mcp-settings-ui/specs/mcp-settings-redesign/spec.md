## ADDED Requirements

### Requirement: MCP 设置页面卡片式布局
MCP 设置页面 SHALL 采用卡片式分区布局，主页面包含：顶部标题区、账号信息卡片、Key 列表区域。创建 Key 的表单和模块选择 SHALL 通过 Modal 弹出完成，不在主页面中直接展示。

#### Scenario: 已登录用户查看 MCP 设置页面
- **WHEN** 已登录用户进入 MCP 设置页面
- **THEN** 页面展示标题区、账号信息卡片、Key 列表、以及「创建 Key」操作入口

#### Scenario: 未登录用户查看 MCP 设置页面
- **WHEN** 未登录用户进入 MCP 设置页面
- **THEN** 页面展示登录提示，不显示 Key 列表和创建入口

### Requirement: 创建 Key Modal 弹出交互
用户点击「创建 Key」按钮时 SHALL 弹出 Modal，Modal 内包含：Key 名称输入、单次返回条数设置、可检索板块选择（chip grid 形式，带全选/清空快捷按钮）、以及「生成 API Key」确认按钮。

#### Scenario: 点击创建 Key 按钮
- **WHEN** 已登录用户点击「创建 Key」按钮
- **THEN** 弹出 Modal，包含名称输入框、条数输入框、模块选择 chip grid（默认全选）、全选/清空按钮、生成按钮

#### Scenario: Modal 中选择模块
- **WHEN** 用户在 Modal 中点击板块 chip
- **THEN** 该 chip 切换选中/未选中状态，已选中的 chip 高亮显示

#### Scenario: Modal 中全选/清空模块
- **WHEN** 用户点击 Modal 中的「全选」/「清空」按钮
- **THEN** 所有板块 chip 变为全选/全未选中状态

### Requirement: Modal 内生成 API Key
用户在 Modal 中填写完信息并点击「生成 API Key」后，SHALL 调用后端 API 创建 Key，创建成功后展示 API Key 结果（复用现有的 Key 创建成功 Modal），关闭创建 Modal 并刷新 Key 列表。

#### Scenario: 成功创建 Key
- **WHEN** 用户在 Modal 中输入名称并点击「生成 API Key」
- **THEN** 系统调用 API 创建 Key，成功后关闭创建 Modal，弹出结果 Modal 展示 API Key 值和复制按钮，Key 列表刷新

#### Scenario: 创建 Key 名称未填写
- **WHEN** 用户未填写名称就点击「生成 API Key」
- **THEN** 系统显示错误提示「请输入 Key 名称」，不关闭 Modal

### Requirement: Key 列表紧凑展示
Key 列表 SHALL 以行卡片形式展示每个 Key，包含：Key 名称、API Key 值（可点击复制）、已选模块标签（以小 chip 形式）、返回条数上限、调用次数、最后调用时间、删除按钮。

#### Scenario: Key 列表展示模块标签
- **WHEN** Key 关联了指定模块
- **THEN** Key 卡片中以小 chip 标签形式展示已选模块名称

#### Scenario: Key 未关联指定模块
- **WHEN** Key 的 source_ids 为空
- **THEN** Key 卡片中显示「全部板块」标签
