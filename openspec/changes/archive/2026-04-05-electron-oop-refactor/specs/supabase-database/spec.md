## ADDED Requirements

### Requirement: Supabase 连接管理
系统 SHALL 通过 `@supabase/supabase-js` 创建 Supabase 客户端实例，使用环境变量中的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 进行连接。客户端实例 SHALL 在应用启动时创建，全局共享。

#### Scenario: 应用启动时初始化连接
- **WHEN** Electron Main Process 启动
- **THEN** 系统读取环境变量，创建 Supabase 客户端并验证连接可用性

#### Scenario: 环境变量缺失
- **WHEN** `SUPABASE_URL` 或 `SUPABASE_ANON_KEY` 未配置
- **THEN** 系统 SHALL 在启动时报错并提示用户配置环境变量

### Requirement: 数据库初始化
系统 SHALL 提供 SQL 初始化脚本，在 Supabase 中创建所有必要的表（users、api_key、source、cache、preference）。这是全新建表，不涉及旧数据迁移。

#### Scenario: 执行初始化
- **WHEN** 运行初始化脚本
- **THEN** 系统在 Supabase 中按序创建 users、api_key、source、cache、preference 表，幂等执行（已存在则跳过），数据库为空初始状态

### Requirement: 数据访问层 Repository 模式
系统 SHALL 为每个数据库表提供 Repository class，封装所有 SQL 操作。Repository SHALL 通过构造函数注入 Supabase 客户端实例。

#### Scenario: Repository 注入 Supabase 客户端
- **WHEN** 创建任意 Repository 实例
- **THEN** 通过 `new XxxRepository(supabaseClient)` 注入共享的 Supabase 客户端

#### Scenario: Repository 查询返回结构化对象
- **WHEN** Repository 执行查询
- **THEN** 返回业务对象（class instance 或 plain object），不暴露原始 Supabase 响应结构

### Requirement: API Key 表
系统 SHALL 在 Supabase 中创建 `api_key` 表，用于 MCP 和 API 访问控制。

#### Scenario: API Key 表结构
- **WHEN** 迁移执行完成
- **THEN** `api_key` 表包含字段：id (TEXT PK)、user_id (BIGINT → users.id)、key_hash (TEXT UNIQUE)、name (TEXT)、is_active (BOOLEAN)、source_scope (TEXT, JSON)、rate_limit (INTEGER)、max_count (INTEGER)、last_used (TIMESTAMPTZ)、call_count (INTEGER)、created_at、updated_at

### Requirement: Source 表
系统 SHALL 在 Supabase 中创建 `source` 表，用于存储新闻源配置。

#### Scenario: Source 表结构
- **WHEN** 迁移执行完成
- **THEN** `source` 表包含字段：id (TEXT PK)、name (TEXT NOT NULL)、url (TEXT)、category (TEXT)、enabled (BOOLEAN DEFAULT true)、config (TEXT, JSON)、created_at、updated_at

### Requirement: Cache 表
系统 SHALL 在 Supabase 中创建 `cache` 表，用于缓存爬虫抓取的新闻数据。

#### Scenario: Cache 表结构
- **WHEN** 迁移执行完成
- **THEN** `cache` 表包含字段：id (TEXT PK)、source_id (TEXT → source.id)、data (JSONB)、updated_at (TIMESTAMPTZ)

### Requirement: Preference 表
系统 SHALL 在 Supabase 中创建 `preference` 表，用于存储用户偏好设置。

#### Scenario: Preference 表结构
- **WHEN** 迁移执行完成
- **THEN** `preference` 表包含字段：id (TEXT PK)、user_id (BIGINT → users.id)、data (JSONB)、updated_at (TIMESTAMPTZ)
