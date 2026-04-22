## 1. 数据库迁移

- [x] 1.1 创建 `database/migrations/007_create_subscriptions.sql`：subscriptions 表（id TEXT PK / user_id BIGINT FK / plan TEXT / level INTEGER / status TEXT / started_at / expires_at / created_at / updated_at）

## 2. 后端 — Repository 层

- [x] 2.1 创建 `core/subscription/subscription-repository.js`：SubscriptionRepository class（注入 Supabase 客户端），实现 findActiveByUserId、create、expireById 方法

## 3. 后端 — PaymentService（模拟支付）

- [x] 3.1 创建 `core/subscription/payment-service.js`：PaymentService class，processPayment 方法使用 setTimeout 3000ms 模拟支付延迟，返回 `{ success: true, transactionId }`

## 4. 后端 — SubscriptionService

- [x] 4.1 创建 `core/subscription/subscription-service.js`：SubscriptionService class（注入 SubscriptionRepository、PaymentService、UserRepository、ApiKeyRepository）
- [x] 4.2 实现 createSubscription(userId, plan)：将当前有效订阅标记为 expired → 调用 PaymentService → 创建新订阅 → 更新 users.level → 同步 MCP API Key 权限
- [x] 4.3 实现 getCurrentSubscription(userId)：返回当前有效订阅或 Free 默认信息

## 5. IPC 通道

- [x] 5.1 创建 `main/ipc/subscription.handler.js`：注册 subscription:getCurrent、subscription:create 通道
- [x] 5.2 更新 `preload/index.js`：在 window.api 新增 subscription 命名空间（getCurrent、create）
- [x] 5.3 更新 `main/bootstrap.js`：初始化 SubscriptionService 及依赖注入

## 6. 前端 — 订阅页面

- [x] 6.1 创建 `renderer/features/subscribe/subscribe-page.vue`：三级定价卡页面，参照 docs/subscribe.html 实现 Material Design 3 风格
- [x] 6.2 实现三级卡片布局（Free/Plus/Pro），包含价格、功能列表、操作按钮
- [x] 6.3 实现当前方案高亮和"当前方案"按钮 disabled 状态
- [x] 6.4 实现升级确认对话框：确认支付按钮 → loading 状态（3s）→ 成功反馈
- [x] 6.5 未登录用户点击升级时提示先登录

## 7. 前端 — 路由与导航

- [x] 7.1 新增 `/subscribe` 路由（如使用 vue-router），或通过事件机制导航到订阅页面
- [x] 7.2 修改 `renderer/App.vue` 用户菜单 popover：新增"订阅方案"入口，附带当前方案标签
- [x] 7.3 修改 `renderer/App.vue`：free 用户点击一键刷新按钮时显示订阅页面（替代当前的 toast 提示）
- [x] 7.4 升级成功后更新 userStore.profile.level 并刷新订阅页面状态

## 8. 验证

- [x] 8.1 验证 Free 用户点击 Plus 升级：3s 模拟支付 → level 变为 1 → 刷新按钮可用
- [x] 8.2 验证 Free 用户点击一键刷新 → 跳转订阅页面
- [ ] 8.3 验证未登录用户访问订阅页面：点击升级提示登录
- [ ] 8.4 验证当前方案卡片显示"当前方案"按钮且不可操作
- [ ] 8.5 验证 level 变更后 MCP API Key 的 rate_limit/max_count 同步更新
