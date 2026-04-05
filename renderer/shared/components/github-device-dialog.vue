<template>
  <Teleport to="body">
    <div v-if="visible" class="device-dialog-overlay" @click.self="$emit('cancel')">
      <div class="device-dialog">
        <h3 class="device-dialog-title">GitHub 身份验证</h3>
        <div class="device-dialog-body">
          <p class="device-dialog-hint">请将以下验证码复制到浏览器中完成授权：</p>
          <template v-if="userCode">
            <div class="device-code-box">
              <code class="device-code-text">{{ userCode }}</code>
              <button class="device-copy-btn" type="button" :class="{ copied }" @click="copyCode">
                <span v-if="copied" class="i-tabler-check device-copy-check"></span>
                <span v-else class="i-tabler-copy"></span>
                <span>{{ copied ? '已复制' : '复制' }}</span>
              </button>
            </div>
          </template>
          <template v-else-if="!error">
            <div class="device-loading">
              <span class="device-spinner"></span>
              <span>正在获取验证码...</span>
            </div>
          </template>
          <p v-if="userCode" class="device-dialog-instructions">
            浏览器已自动打开验证页面。<br>
            如果没有自动打开，请手动访问：
            <a href="https://github.com/login/device" target="_blank" rel="noreferrer" class="device-link">github.com/login/device</a>
          </p>
          <div v-if="polling" class="device-polling">
            <span class="device-spinner"></span>
            <span>等待授权中...</span>
          </div>
          <p v-if="error" class="device-error">{{ error }}</p>
        </div>
        <div class="device-dialog-footer">
          <button class="device-cancel-btn" type="button" @click="$emit('cancel')">
            {{ polling ? '取消登录' : '关闭' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  userCode: { type: String, default: '' },
  polling: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

defineEmits(['cancel'])

const copied = ref(false)

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.userCode)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* ignore */ }
}

// Auto-copy code when it becomes available
watch(
  () => props.userCode,
  async (code) => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
      } catch { /* ignore */ }
    }
  },
)
</script>

<style scoped>
.device-dialog-overlay {
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 2000;
}

.device-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.85rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  max-width: 26rem;
  padding: 1.6rem;
  width: 90vw;
}

.device-dialog-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.device-dialog-body {
  display: grid;
  gap: 0.75rem;
}

.device-dialog-hint {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
}

.device-code-box {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
}

.device-code-text {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.device-copy-btn {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 85%, transparent);
  border: 1px solid var(--border);
  border-radius: 0.45rem;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.85rem;
  gap: 0.3rem;
  padding: 0.3rem 0.7rem;
  transition: all 0.25s ease;
}

.device-copy-btn:hover {
  background: color-mix(in srgb, #0b63ff 12%, var(--surface));
  border-color: color-mix(in srgb, #0b63ff 38%, var(--border));
}

.device-copy-btn.copied {
  background: color-mix(in srgb, #22c55e 12%, transparent);
  border-color: #22c55e;
  color: #22c55e;
}

.device-copy-check {
  animation: check-pop 0.3s ease;
}

@keyframes check-pop {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.device-dialog-instructions {
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.6;
  margin: 0;
}

.device-link {
  color: #0b63ff;
  text-decoration: none;
}

.device-link:hover {
  text-decoration: underline;
}

.device-loading {
  align-items: center;
  color: var(--muted);
  display: flex;
  font-size: 0.9rem;
  gap: 0.5rem;
  justify-content: center;
  padding: 1rem 0;
}

.device-polling {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.device-spinner {
  animation: device-spin 0.8s linear infinite;
  border: 2px solid var(--border);
  border-top-color: #0b63ff;
  border-radius: 50%;
  display: inline-block;
  height: 1rem;
  width: 1rem;
}

@keyframes device-spin {
  to { transform: rotate(360deg); }
}

.device-error {
  color: #d14343;
  font-size: 0.85rem;
  margin: 0;
}

.device-dialog-footer {
  margin-top: 1.2rem;
  display: flex;
  justify-content: flex-end;
}

.device-cancel-btn {
  background: color-mix(in srgb, var(--surface) 85%, transparent);
  border: 1px solid var(--border);
  border-radius: 0.55rem;
  color: var(--text);
  cursor: pointer;
  font-size: 0.88rem;
  padding: 0.45rem 1.1rem;
  transition: background-color 0.15s ease;
}

.device-cancel-btn:hover {
  background: color-mix(in srgb, var(--surface) 70%, transparent);
}
</style>
