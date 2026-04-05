<template>
  <Teleport to="body">
    <Transition name="login-fade">
      <div v-if="visible" class="login-backdrop" @click.self="$emit('close')">
        <div class="login-modal" role="dialog" aria-modal="true" @click.stop>
          <div class="login-modal-header">
              <div class="login-icon-badge">
                <span class="i-tabler-lock login-icon" aria-hidden="true"></span>
              </div>
              <h1 class="login-title">安全访问</h1>
              <p class="login-subtitle">选择您的身份验证方式以继续。</p>
            </div>

            <div class="login-modal-content">
              <div class="login-email-section">
                <div class="login-email-field">
                  <label class="login-label" for="login-email">邮箱</label>
                  <input
                    id="login-email"
                    v-model="email"
                    type="email"
                    class="login-input"
                    placeholder="name@company.com"
                    :disabled="emailSent"
                    required
                    @keydown.enter="sendMagicLink"
                  />
                </div>
                <button
                  class="login-send-btn"
                  type="button"
                  :disabled="sending || !emailValid || cooldown > 0"
                  @click="sendMagicLink"
                >
                  <template v-if="cooldown > 0">
                    <span>{{ cooldown }}s 后可重新发送</span>
                  </template>
                  <template v-else-if="sending">
                    <span>发送中...</span>
                    <span class="login-spinner"></span>
                  </template>
                  <template v-else>
                    <span>{{ emailSent ? '重新发送' : '发送验证码' }}</span>
                    <span class="i-tabler-send login-send-icon" aria-hidden="true"></span>
                  </template>
                </button>
              </div>

              <div v-if="emailSent" class="login-sent-hint">
                <span class="i-tabler-mail-check" aria-hidden="true"></span>
                <span>邮件已发送，请查收并点击链接完成登录。</span>
              </div>

              <div v-if="errorMsg" class="login-error-hint">
                <span class="i-tabler-alert-circle" aria-hidden="true"></span>
                <span>{{ errorMsg }}</span>
              </div>

              <div class="login-divider">
                <div class="login-divider-line"></div>
                <span class="login-divider-text">或</span>
                <div class="login-divider-line"></div>
              </div>

              <button class="login-github-btn" type="button" @click="emit('close'); emit('github-login')">
                <svg class="login-github-icon" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>使用 GitHub 登录</span>
              </button>
            </div>

            <div class="login-modal-footer">
              <p class="login-footer-text">
                登录即表示您同意我们的
                <a class="login-footer-link" href="#">隐私政策</a>
                和
                <a class="login-footer-link" href="#">服务条款</a>。
              </p>
            </div>
          </div>
        </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'github-login', 'login-success'])

const email = ref('')
const sending = ref(false)
const emailSent = ref(false)
const errorMsg = ref('')
const cooldown = ref(0)

let cooldownTimer = null

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))

const startCooldown = () => {
  cooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) {
      cooldown.value = 0
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

const sendMagicLink = async () => {
  if (!emailValid.value || sending.value || cooldown.value > 0) return
  errorMsg.value = ''
  sending.value = true

  try {
    const result = await window.api.auth.sendMagicLink(email.value)
    if (result?.error) {
      errorMsg.value = result.error
      return
    }
    emailSent.value = true
    startCooldown()
  } catch {
    errorMsg.value = '发送失败，请稍后重试'
  } finally {
    sending.value = false
  }
}

let unsubscribeSuccess = null
let unsubscribeError = null

const onMagicLinkSuccess = async (session) => {
  if (session && !session.error) {
    emit('login-success', session)
  }
}

const onMagicLinkError = (message) => {
  errorMsg.value = message || '链接无效或已过期，请重新发送'
  emailSent.value = false
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      email.value = ''
      emailSent.value = false
      errorMsg.value = ''
      sending.value = false
      cooldown.value = 0
      if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }

      if (window.api?.auth?.onMagicLinkSuccess) {
        unsubscribeSuccess = window.api.auth.onMagicLinkSuccess(onMagicLinkSuccess)
      }
      if (window.api?.auth?.onMagicLinkError) {
        unsubscribeError = window.api.auth.onMagicLinkError(onMagicLinkError)
      }
    } else {
      if (unsubscribeSuccess) { unsubscribeSuccess(); unsubscribeSuccess = null }
      if (unsubscribeError) { unsubscribeError(); unsubscribeError = null }
      if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
    }
  },
)

const onKeydown = (event) => {
  if (event.key === 'Escape' && props.visible) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (unsubscribeSuccess) unsubscribeSuccess()
  if (unsubscribeError) unsubscribeError()
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<style scoped>
.login-fade-enter-active,
.login-fade-leave-active {
  transition: opacity 0.2s ease;
}
.login-fade-enter-from,
.login-fade-leave-to {
  opacity: 0;
}

.login-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
}

.login-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  box-shadow: 0 32px 32px -8px rgba(0, 0, 0, 0.15);
  max-width: 480px;
  overflow: hidden;
  width: calc(100vw - 2rem);
}

.login-modal-header {
  padding: 2.5rem 2rem 1.5rem;
  text-align: center;
}

.login-icon-badge {
  align-items: center;
  background: color-mix(in srgb, #409eff 18%, var(--surface));
  border-radius: 999px;
  display: inline-flex;
  height: 3rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  width: 3rem;
}

.login-icon {
  color: #409eff;
  font-size: 1.5rem;
}

.login-title {
  color: var(--text);
  font-size: 1.875rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
}

.login-subtitle {
  color: var(--muted);
  font-weight: 500;
  margin: 0;
}

.login-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0 2rem 2rem;
}

.login-email-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-email-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-label {
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 600;
  padding-left: 0.25rem;
}

.login-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  color: var(--text);
  font-size: 0.95rem;
  height: 3rem;
  padding: 0 1rem;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
}

.login-input::placeholder {
  color: var(--muted);
}

.login-input:focus {
  outline: none;
  border-color: color-mix(in srgb, #409eff 40%, var(--border));
  box-shadow: 0 0 0 2px color-mix(in srgb, #409eff 20%, transparent);
}

.login-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-send-btn {
  align-items: center;
  background: linear-gradient(135deg, #0060a9 0%, #409eff 100%);
  border: 0;
  border-radius: 0.25rem;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  font-size: 0.95rem;
  font-weight: 600;
  gap: 0.5rem;
  height: 3rem;
  justify-content: center;
  transition: all 0.2s ease;
  width: 100%;
}

.login-send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.login-send-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.login-send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.login-send-icon {
  font-size: 1.2rem;
}

.login-spinner {
  animation: login-spin 0.8s linear infinite;
  border: 2px solid color-mix(in srgb, var(--border) 60%, transparent);
  border-top-color: var(--text);
  border-radius: 50%;
  display: inline-block;
  height: 1rem;
  width: 1rem;
}

@keyframes login-spin {
  to { transform: rotate(360deg); }
}

.login-sent-hint,
.login-error-hint {
  align-items: center;
  display: flex;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.login-sent-hint {
  color: #409eff;
}

.login-error-hint {
  color: #ba1a1a;
}

.login-divider {
  align-items: center;
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
}

.login-divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.login-divider-text {
  color: var(--muted);
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.login-github-btn {
  align-items: center;
  background: color-mix(in srgb, var(--border) 50%, transparent);
  border: 0;
  border-radius: 0.25rem;
  color: var(--text);
  cursor: pointer;
  display: flex;
  font-size: 0.95rem;
  font-weight: 600;
  gap: 0.75rem;
  height: 3rem;
  justify-content: center;
  transition: all 0.2s ease;
  width: 100%;
}

.login-github-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--border) 80%, transparent);
}

.login-github-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.login-github-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.login-github-icon {
  fill: currentColor;
  height: 1.25rem;
  width: 1.25rem;
}

.login-modal-footer {
  background: color-mix(in srgb, var(--surface) 92%, var(--border));
  padding: 1.5rem 2rem;
  text-align: center;
}

.login-footer-text {
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.6;
  margin: 0;
}

.login-footer-link {
  color: #409eff;
  font-weight: 600;
  text-decoration: none;
}

.login-footer-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
