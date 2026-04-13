## Why

用户表已预留 `level` 和 `balance` 字段，MCP API Key 已有 `rate_limit` / `max_count` 机制，前端刷新按钮也已按 level 做了权限控制（level >= 1 可用）。但当前缺少完整的订阅管理闭环：用户无法查看/切换方案、无法付费升级、订阅状态变更无法自动反映到权限。需要实现从前端订阅页面到后端权限生效的完整订阅功能。

## What Changes

- 新增订阅页面组件（三级定价卡），参照 `docs/subscribe.html` 设计稿实现
- 新增订阅管理 Service / Repository，处理订阅状态查询与变更
- 新增模拟支付流程（setTimeout 3s 模拟），点击确认支付 3 秒后返回支付成功
- 新增 Supabase 订阅相关表（subscriptions）
- 根据 level 自动设置 MCP API Key 的 rate_limit / max_count
- 用户菜单 popover 增加订阅入口，显示当前方案与到期时间
- IPC 新增订阅相关通道

## Capabilities

### New Capabilities

- `subscription-ui`: 前端订阅页面组件，三级定价卡（Free / Plus / Pro），参照设计稿实现，集成支付流程
- `subscription-management`: 后端订阅管理，包括订阅创建、续费、取消、状态查询、level 同步
- `payment-integration`: 模拟支付集成，使用 setTimeout 3s 延迟模拟支付过程，后续替换为真实支付网关

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **database/**: 新增 subscriptions 表迁移脚本
- **core/**: 新增 subscription service/repository，修改 user service 增加 level 同步逻辑
- **main/ipc/**: 新增 subscription handler
- **preload/**: 新增订阅相关 IPC 方法
- **renderer/**: 新增订阅页面组件、用户菜单增加订阅入口