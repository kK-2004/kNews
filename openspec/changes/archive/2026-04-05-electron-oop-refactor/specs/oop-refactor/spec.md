## ADDED Requirements

### Requirement: Class 体系规范
所有后端业务代码 SHALL 使用 ES6 class 语法组织。每个 class 放在独立文件中，文件名使用 kebab-case，class 名使用 PascalCase。

#### Scenario: 文件命名规范
- **WHEN** 创建一个名为 `ScraperEngine` 的 class
- **THEN** 文件名为 `scraper-engine.js`，导出 `class ScraperEngine`

#### Scenario: 单一职责
- **WHEN** 一个 class 承担多个不相关的职责
- **THEN** SHOULD 拆分为多个 class，每个 class 只有一个变更原因

### Requirement: 继承与抽象模板
需要共享行为的 class SHALL 通过继承（extends）复用逻辑。抽象模板方法通过在基类中 throw Error 实现抽象方法约束。

#### Scenario: 模板方法模式实现
- **WHEN** 基类定义模板方法（concrete method 调用 abstract method）
- **THEN** 子类 MUST 覆写所有 abstract method（基类中 throw Error 的方法），否则运行时抛出异常

### Requirement: 工厂模式
对象的创建逻辑 SHALL 封装在工厂 class 中，调用方不直接 `new` 具体类，而是通过工厂方法获取实例。

#### Scenario: 工厂方法创建对象
- **WHEN** 需要创建策略实例
- **THEN** 调用 `Factory.create(type)` 获取对应实例，调用方只依赖抽象接口

### Requirement: Repository 模式
所有数据库访问 SHALL 通过 Repository class 封装，业务层不直接编写 SQL。Repository 通过构造函数注入 Supabase 客户端。

#### Scenario: Repository 注入
- **WHEN** 创建 Service 实例
- **THEN** Service 通过构造函数接收 Repository 实例：`new UserService(userRepository)`

### Requirement: Service 层封装业务逻辑
复杂业务逻辑 SHALL 封装在 Service class 中。Service 依赖 Repository 进行数据访问，不直接操作数据库。

#### Scenario: Service 调用链
- **WHEN** IPC handler 收到请求
- **THEN** handler 调用 Service 方法，Service 调用 Repository 方法，结果层层返回

### Requirement: 分层架构
代码 SHALL 按层次组织：`main/`（Electron 集成层）→ `core/`（业务层）→ `database/`（数据层）。依赖方向为单向：main → core → database，不得反向依赖。

#### Scenario: 分层依赖
- **WHEN** `core/auth/` 中的 class 需要访问数据库
- **THEN** 通过注入的 Repository 访问，不直接引用 `database/` 层的实现细节

### Requirement: Git 提交规范
业务代码和 openspec/ 变更 MUST 在不同的 commit 中提交，不得混合。`dev` 分支 SHALL 包含 openspec/，`main` 分支 MUST NOT 包含 openspec/。

#### Scenario: 业务代码提交
- **WHEN** 完成业务代码修改（如新增 API、修复 bug）
- **THEN** 只暂存业务代码文件提交，如 `git commit -m "feat: add login api"`，不包含 openspec/ 文件

#### Scenario: openspec 提交
- **WHEN** 更新 openspec 文档（proposal、design、specs、tasks）
- **THEN** 单独提交 openspec/ 目录，如 `git commit -m "docs(dev): update login spec"`，不包含业务代码

#### Scenario: 禁止混合提交
- **WHEN** 同时修改了业务代码和 openspec 文件
- **THEN** MUST 拆分为两个 commit：先提交业务代码，再单独提交 openspec

#### Scenario: 分支管理
- **WHEN** 合并到 `main` 分支
- **THEN** openspec/ 目录 MUST NOT 存在于 `main` 分支中
