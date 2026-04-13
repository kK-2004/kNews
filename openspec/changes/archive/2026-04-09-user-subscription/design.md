## Context

kNews Desktop 用户表已有 `level`（0=free, 1=plus, 2=pro）和 `balance`（余额）字段。前端刷新按钮已按 level 做了权限控制（`level >= 1` 可手动刷新）。MCP API Key 表已有 `rate_limit` 和 `max_count` 字段，但目前是按 Key 独立设置，未与用户 level 关联。

当前缺少：
- 订阅页面 UI（用户无法查看或选择方案）
- 后端订阅管理逻辑（创建/取消/查询订阅）
- 支付流程（本期用 setTimeout 模拟，3s 延迟后返回成功）
- level 变更后自动同步 MCP API Key 权限

## Goals / Non-Goals

**Goals:**
- 实现三级定价订阅页面，参照 `docs/subscribe.html` 设计稿
- 实现模拟支付流程（setTimeout 3s），后续可替换为真实支付网关
- 订阅成功后自动更新用户 level，立即生效到功能权限
- 用户菜单增加订阅入口，显示当前方案信息
- level 变更后同步更新 MCP API Key 的 rate_limit / max_count
- 复用现在的白天、黑夜主题切换

**Non-Goals:**
- 不接入真实支付网关（Stripe / 支付宝等），仅模拟
- 不实现自动续费逻辑（用户到期后需手动续费）
- 不实现退款功能
- 不实现发票 / 收据生成

## Decisions

### 1. 订阅页面作为独立 Vue 路由页面

**选择**: 新增 `/subscribe` 路由，创建 `subscribe-page.vue` 作为独立页面

**替代方案**:
- 作为模态框弹出 → 空间不够展示三级定价卡
- 作为设置页子页 → 定价页面需独立访问

**理由**: 三级定价卡需要足够宽度和垂直空间，独立页面最合适。参照 `docs/subscribe.html` 原始设计也是全页面布局。从用户菜单 popover 中点击"订阅方案"跳转到该页面。

### 2. 订阅数据模型 — 新增 subscriptions 表

**选择**: 在 Supabase 中新增 `subscriptions` 表记录订阅状态

```
subscriptions
├── id (TEXT PK)
├── user_id (BIGINT FK → users.id)
├── plan (TEXT: 'free' | 'plus' | 'pro')
├── level (INTEGER: 0 | 1 | 2)
├── status (TEXT: 'active' | 'expired')
├── started_at (TIMESTAMPTZ)
├── expires_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

**理由**: 与 users 表分离，保留订阅历史。users.level 始终反映当前生效等级（冗余字段，用于快速查询）。

### 3. 模拟支付流程设计

**选择**: 前端点击"升级"按钮 → 弹出确认对话框 → 确认后 IPC 调用 `subscription:create` → Main Process 中 setTimeout 3s → 更新 level → 返回成功

```
Renderer                    Preload                     Main Process
────────                    ───────                     ────────────
点击"升级到 Plus"     →
  confirm 对话框        →
  window.api.subscription
    .create({ plan })    →  ipcRenderer.invoke          subscriptionService
                          ('subscription:create')       .createSubscription()
                                                        → setTimeout(3000)
                                                        → update users.level
                                                        → insert subscriptions
                                                        ← return success
  收到成功回调          ←
  更新 userStore.profile.level
  跳转回首页
```

**理由**: 最简模拟。真实支付替换时只需将 setTimeout 替换为支付网关调用，其余流程不变。

### 4. Level 与 MCP 权限映射

**选择**: 硬编码 level → rate_limit / max_count 映射表

```
level 0 (Free):  rate_limit = 3,   max_count = 10
level 1 (Plus):  rate_limit = 100, max_count = 50
level 2 (Pro):   rate_limit = -1,  max_count = -1  (无限制)
```

**理由**: 简单直接，映射关系稳定。后续如需动态调整可改为从配置读取。

### 5. 前端订阅状态管理

**选择**: 复用现有 `useUserStore` 的 `profile.level` 字段，新增 `subscription` 字段存储当前订阅详情

**理由**: 避免新增独立 store，level 和订阅信息紧密关联。登录后通过 IPC `subscription:getCurrent` 获取当前订阅信息。

## Risks / Trade-offs

- **[模拟支付无安全性]** → 本期仅模拟，无真实交易风险。后续替换时需要服务端验签和幂等处理
- **[level 冗余同步]** → users.level 和 subscriptions.level 可能不一致 → 以 subscriptions 表为准，每次订阅变更同步更新 users.level
- **[到期自动降级]** → 本期不实现后台定时检查过期订阅，需手动或后续版本实现
- **[并发订阅创建]** → 用户快速重复点击可能创建多条订阅 → IPC handler 中加防重判断（检查当前 status）