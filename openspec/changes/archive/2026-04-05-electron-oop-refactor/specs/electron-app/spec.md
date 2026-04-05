## ADDED Requirements

### Requirement: Electron 应用启动
系统 SHALL 提供 Electron Main Process 入口，启动时创建主窗口并加载 Vue 3 前端页面。主窗口 SHALL 支持最小宽度和高度限制。

#### Scenario: 正常启动应用
- **WHEN** 用户启动应用
- **THEN** 系统创建 Electron 主窗口（最小宽度 1024px，最小高度 700px），加载 Vue 3 前端页面，并初始化 IPC 通信层、Supabase 连接、爬虫引擎和 MCP Server

#### Scenario: 窗口关闭行为
- **WHEN** 用户关闭主窗口
- **THEN** 应用完全退出（包括 MCP Server 和爬虫引擎定时器）

### Requirement: IPC 通信层
系统 SHALL 通过 Electron preload script 的 `contextBridge` 暴露类型安全的 API 给 Renderer Process。所有 IPC 通道 SHALL 按领域分组（auth、feeds、sources、scraper、user、mcp）。

#### Scenario: 前端调用后端方法
- **WHEN** 前端通过 `window.api.feeds.get(params)` 调用
- **THEN** preload 层通过 `ipcRenderer.invoke('feeds:get', params)` 发送到 Main Process，Main Process handler 处理后返回结果

#### Scenario: IPC 错误处理
- **WHEN** Main Process handler 抛出异常
- **THEN** 异常 SHALL 被捕获并作为 rejected Promise 返回给前端，前端收到包含错误信息的响应

### Requirement: 桌面应用打包
系统 SHALL 支持 electron-builder 打包，生成 Windows exe（NSIS 安装包）和 Mac app（DMG）。

#### Scenario: Windows 打包
- **WHEN** 执行 Windows 打包命令
- **THEN** 生成 .exe 安装包，包含应用图标、应用名称 "kNews"

#### Scenario: Mac 打包
- **WHEN** 执行 Mac 打包命令
- **THEN** 生成 .dmg 安装包，包含应用图标、应用名称 "kNews"

### Requirement: 前端 API 层适配
现有 Vue 3 前端的 HTTP fetch 调用 SHALL 改为通过 Electron IPC 调用。API composable 层 SHALL 统一替换，接口签名保持不变。

#### Scenario: feeds 接口迁移
- **WHEN** 前端调用 `useFeedsApi` 获取新闻列表
- **THEN** 请求通过 IPC 发送到 Main Process，而非 HTTP fetch 到后端 API

#### Scenario: 现有 fetch 工具的缓存和重试机制保留
- **WHEN** IPC 调用失败
- **THEN** 前端 SHALL 保留现有的重试逻辑（3 次重试，指数退避）
