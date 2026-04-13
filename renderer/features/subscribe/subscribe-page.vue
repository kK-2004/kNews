<template>
  <div class="subscribe-page">
    <div class="subscribe-header">
      <h1 class="subscribe-title">选择您的方案</h1>
      <p class="subscribe-subtitle">为您的新闻阅读体验选择合适的方案，精准控制您的 MCP 访问权限。</p>
    </div>

    <div class="pricing-grid">
      <!-- Free -->
      <div class="pricing-card" :class="{ current: isCurrentOrIncluded(0) }">
        <div class="card-header">
          <span class="tier-label">Tier 01</span>
          <h2 class="plan-name">基础版 (Free)</h2>
          <div class="plan-price">
            <span class="price-amount">0</span>
            <span class="price-unit">元</span>
          </div>
        </div>
        <ul class="feature-list">
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>3 次 MCP 请求/小时</li>
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>基础新闻浏览</li>
          <li class="feature-item disabled"><span class="i-tabler-lock check-icon"></span>受限的 API 访问</li>
        </ul>
        <button
          class="card-btn outline"
          :disabled="currentLevel >= 0 && isLoggedIn || processing"
          @click="onSelect('free')"
        >
          {{ getBtnLabel(0) }}
        </button>
      </div>

      <!-- Plus -->
      <div class="pricing-card highlighted" :class="{ current: isCurrentOrIncluded(1) }">
        <div class="popular-badge">最受欢迎</div>
        <div class="card-header">
          <span class="tier-label">Tier 02</span>
          <h2 class="plan-name">高级版 (Plus)</h2>
          <div class="plan-price">
            <span class="price-amount">5</span>
            <span class="price-unit">元 / 月</span>
          </div>
        </div>
        <ul class="feature-list">
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>20 次 MCP 请求/小时</li>
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>一键手动刷新</li>
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>邮件支持 (待实现)</li>
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>自定义标签（待实现）</li>
        </ul>
        <button
          class="card-btn gradient"
          :disabled="currentLevel >= 1 || processing"
          @click="onSelect('plus')"
        >
          {{ getBtnLabel(1) }}
        </button>
      </div>

      <!-- Pro -->
      <div class="pricing-card" :class="{ current: isCurrentOrIncluded(2) }">
        <div class="card-header">
          <span class="tier-label">Tier 03</span>
          <h2 class="plan-name">专业版 (Pro)</h2>
          <div class="plan-price">
            <span class="price-amount">15</span>
            <span class="price-unit">元 / 月</span>
          </div>
        </div>
        <ul class="feature-list">
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>不限次数 MCP 请求</li>
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>优先 API 路由(待实现)</li>
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>Plus的所有权益</li>
          <li class="feature-item"><span class="i-tabler-check check-icon"></span>自定义安全协议（待实现）</li>
        </ul>
        <button
          class="card-btn outline"
          :disabled="currentLevel >= 2 || processing"
          @click="onSelect('pro')"
        >
          {{ getBtnLabel(2) }}
        </button>
      </div>
    </div>

    <!-- Upgrade confirm dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmVisible" class="confirm-overlay" @click.self="confirmVisible = false">
          <div class="confirm-dialog">
            <h3 class="confirm-title">确认升级</h3>
            <p class="confirm-text">
              您即将升级到 <strong>{{ selectedPlanName }}</strong>（{{ selectedPlanPrice }}元/月）
            </p>
            <div class="confirm-actions">
              <button class="confirm-cancel" :disabled="processing" @click="confirmVisible = false">取消</button>
              <button class="confirm-pay" :disabled="processing" @click="onConfirmPay">
                <span v-if="processing" class="i-tabler-loader animate-spin" />
                {{ processing ? '处理中...' : '确认支付' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/use-user-store'
import { useToast } from '@/shared/composables/useToast'

const userStore = useUserStore()
const { success, warning } = useToast()

const currentLevel = computed(() => userStore.profile?.level ?? 0)

const isLoggedIn = computed(() => Boolean(userStore.authToken || userStore.profile))

const isCurrentOrIncluded = (planLevel) => isLoggedIn.value && currentLevel.value >= planLevel

const getBtnLabel = (planLevel) => {
  if (!isLoggedIn.value) {
    return planLevel === 0 ? '开始使用' : planLevel === 1 ? '升级到高级版' : '立即获取专业版'
  }
  if (currentLevel.value === planLevel) return '当前方案'
  if (currentLevel.value > planLevel) return '已包含'
  return planLevel === 1 ? '升级到高级版' : '立即获取专业版'
}

const confirmVisible = ref(false)
const processing = ref(false)
const selectedPlan = ref('')

const planLevels = { free: 0, plus: 1, pro: 2 }
const planNames = { free: '基础版 (Free)', plus: '高级版 (Plus)', pro: '专业版 (Pro)' }
const planPrices = { free: 0, plus: 5, pro: 15 }

const selectedPlanName = computed(() => planNames[selectedPlan.value] || '')
const selectedPlanPrice = computed(() => planPrices[selectedPlan.value] || 0)

const onSelect = (plan) => {
  if (!isLoggedIn.value) {
    warning('请先登录后再升级')
    return
  }
  selectedPlan.value = plan
  confirmVisible.value = true
}

const onConfirmPay = async () => {
  processing.value = true
  try {
    const result = await window.api.subscription.create(selectedPlan.value)
    if (result?.error) {
      warning(result.error)
      return
    }
    if (result?.success) {
      const newLevel = planLevels[selectedPlan.value] ?? 0
      userStore.setAuth({
        token: userStore.authToken,
        type: userStore.loginType,
        profile: { ...userStore.profile, level: newLevel },
      })
      success('升级成功')
      confirmVisible.value = false
    }
  } catch (err) {
    warning(err?.message || '支付失败，请重试')
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.subscribe-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 3rem 1rem 4rem;
}

.subscribe-header {
  text-align: center;
  margin-bottom: 3rem;
}

.subscribe-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 0.75rem;
  color: var(--text);
}

.subscribe-subtitle {
  color: var(--muted);
  font-size: 1rem;
  margin: 0;
  max-width: 480px;
  margin-inline: auto;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.pricing-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.pricing-card.current {
  opacity: 0.75;
}

.pricing-card.highlighted {
  border-color: color-mix(in srgb, #0060a9 30%, var(--border));
  box-shadow: 0 8px 24px rgba(0, 96, 169, 0.08);
  z-index: 1;
}

.popular-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #0060a9, #409eff);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.25rem 0.75rem;
  border-bottom-left-radius: 0.5rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.card-header {
  margin-bottom: 1.5rem;
}

.tier-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0060a9;
}

.plan-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
}

.plan-price {
  margin-top: 0.75rem;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.price-amount {
  font-size: 2rem;
  font-weight: 800;
}

.price-unit {
  color: var(--muted);
  font-size: 0.9rem;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.feature-item.disabled {
  opacity: 0.5;
  font-style: italic;
}

.check-icon {
  font-size: 1rem;
  color: #0060a9;
}

.card-btn {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 2px solid #0060a9;
}

.card-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-btn.outline {
  background: transparent;
  color: #0060a9;
}

.card-btn.outline:not(:disabled):hover {
  background: color-mix(in srgb, #0060a9 8%, transparent);
}

.card-btn.gradient {
  background: linear-gradient(135deg, #0060a9, #409eff);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 96, 169, 0.2);
}

.card-btn.gradient:not(:disabled):hover {
  box-shadow: 0 6px 16px rgba(0, 96, 169, 0.3);
  transform: translateY(-1px);
}

.card-btn.gradient:not(:disabled):active {
  transform: scale(0.98);
}

/* Confirm dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.confirm-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}

.confirm-text {
  color: var(--muted);
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.confirm-cancel {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--muted);
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-weight: 600;
}

.confirm-cancel:hover {
  background: color-mix(in srgb, var(--surface) 80%, var(--border));
}

.confirm-pay {
  background: linear-gradient(135deg, #0060a9, #409eff);
  border: none;
  border-radius: 0.5rem;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.confirm-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
