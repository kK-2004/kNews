<template>
  <section class="mcp-settings">
    <header class="hero">
      <h3>MCP API Keys</h3>
      <p>为不同客户端创建独立 API Key，并精细控制可检索板块与返回条数。</p>
    </header>

    <div class="panel account">
      <template v-if="!loginEnabled">
        <p class="hint">登录未配置，无法管理 API Key。</p>
      </template>
      <template v-else-if="!isLoggedIn">
        <p class="hint">请先登录后再创建或管理 API Key。</p>
      </template>
      <template v-else>
        <div class="account-row">
          <div>
            <p class="label">当前账号</p>
            <p class="value">{{ userStore.profile?.name || userStore.loginType || 'GitHub User' }}</p>
          </div>
          <base-button variant="secondary" @click="logout">退出登录</base-button>
        </div>
      </template>
    </div>

    <template v-if="isLoggedIn">
      <div class="panel create">
        <h4>创建 Key</h4>
        <div class="form-grid">
          <base-input v-model="newKeyName" label="Key 名称" placeholder="例如：Cursor / Claude / MCP Server" required />
          <label class="count-field">
            <span>单次返回条数</span>
            <input v-model.number="maxCount" type="number" min="1" max="30" @blur="onMaxCountBlur">
          </label>
        </div>

        <div class="source-head">
          <p>可检索新闻板块</p>
          <div class="source-actions">
            <button type="button" @click="selectAllSources">全选</button>
            <button type="button" @click="clearSources">清空</button>
          </div>
        </div>
        <div class="source-grid">
          <label
            v-for="source in enabledSources"
            :key="source.id"
            class="source-chip"
            :class="{ active: selectedSourceIds.includes(source.id) }"
          >
            <input
              :checked="selectedSourceIds.includes(source.id)"
              type="checkbox"
              @change="toggleSource(source.id)"
            >
            <span>{{ source.name }}</span>
          </label>
        </div>

        <base-button @click="createKey">生成 API Key</base-button>

        <base-modal :open="showKeyModal" @close="showKeyModal = false">
          <template #title>
            <h3 class="modal-title">API Key 创建成功</h3>
          </template>
          <div class="key-modal-content">
            <p class="key-description">您的 API Key 已创建。请妥善保管您的密钥。</p>

            <div class="api-key-box">
              <code class="api-key-text">{{ createdApiKey }}</code>
              <base-button class="copy-button" @click="copyApiKey">
                <span class="i-tabler-copy"></span>
                复制
              </base-button>
            </div>
          </div>
        </base-modal>
      </div>

      <div class="panel list">
        <h4>Key 列表</h4>
        <div v-if="keys.length" class="key-list">
          <article v-for="key in keys" :key="key.id" class="key-item">
            <div class="main">
              <p class="name">{{ key.name || 'Untitled key' }}</p>
              <p class="meta key-row">
                <span class="key-label">API Key：</span>
                <button
                  class="key-pill"
                  type="button"
                  :title="`点击复制 ${key.name || 'API Key'}`"
                  @click="copyKey(key.key_plaintext || key.id)"
                >
                  <code class="key-value">{{ key.key_plaintext || key.id }}</code>
                  <span class="key-copy">
                    <span class="i-tabler-copy"></span>
                    复制
                  </span>
                </button>
              </p>
              <p class="meta">
                可检索：
                <template v-if="(key.source_ids || []).length">{{ mapSourceNames(key.source_ids).join('、') }}</template>
                <template v-else>全部板块</template>
              </p>
              <p class="meta">
                返回条数上限：{{ key.max_count || 12 }} ｜ 调用次数：{{ key.call_count || 0 }} ｜ 最后调用：{{ formatLastUsed(key.last_used) }}
              </p>
            </div>
            <base-button size="sm" variant="secondary" @click="removeKey(key.id)">删除</base-button>
          </article>
        </div>
        <p v-else class="hint">暂无 API Key。</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

defineOptions({
  name: 'McpSettings'
})
import BaseButton from '@/shared/components/base-button.vue'
import BaseInput from '@/shared/components/base-input.vue'
import BaseModal from '@/shared/components/base-modal.vue'
import { useAuthApi } from '@/shared/composables/useAuthApi'
import { useSourcesApi } from '@/shared/composables/useSourcesApi'
import { useUserStore } from '@/stores/use-user-store'
import { useToast } from '@/shared/composables/useToast'

const authApi = useAuthApi()
const sourcesApi = useSourcesApi()
const userStore = useUserStore()
const { success, error } = useToast()

const loginEnabled = ref(false)
const keys = ref([])
const enabledSources = ref([])
const newKeyName = ref('')
const showKeyModal = ref(false)
const createdApiKey = ref('')
const maxCount = ref(5)
const selectedSourceIds = ref([])
const isLoggedIn = computed(() => Boolean(userStore.authToken || userStore.profile))

const sourceNameMap = computed(() => Object.fromEntries(enabledSources.value.map((source) => [source.id, source.name])))

const clampMaxCount = (value) => Math.min(30, Math.max(1, Number(value) || 5))
const onMaxCountBlur = () => {
  maxCount.value = clampMaxCount(maxCount.value)
}

const load = async () => {
  const status = await authApi.getLoginStatus()
  loginEnabled.value = Boolean(status?.enable)

  const allSources = await sourcesApi.fetchSources()
  enabledSources.value = allSources || []

  if (!isLoggedIn.value) return
  const profile = await authApi.getProfile()
  if (profile?.user) {
    userStore.setAuth({
      token: userStore.authToken,
      type: userStore.loginType || 'github',
      profile: {
        ...(userStore.profile || {}),
        name: userStore.profile?.name || profile.nickname || profile.login || '',
        login: profile.nickname || userStore.profile?.login || '',
        userId: profile.id || userStore.profile?.userId,
        level: profile.level ?? userStore.profile?.level ?? 0,
      }
    })
  }
  const res = await authApi.listApiKeys()
  keys.value = (res?.keys || []).map((item) => ({
    ...item,
    source_ids: Array.isArray(item?.source_ids) ? item.source_ids : [],
    max_count: clampMaxCount(item?.max_count)
  }))
}

const loginWithGithub = () => {
  window.location.href = '/api/login'
}

const logout = () => {
  userStore.clearAuth()
  localStorage.removeItem('auth_token')
  keys.value = []
  window.location.href = '/'
}

const toggleSource = (id) => {
  if (selectedSourceIds.value.includes(id)) {
    selectedSourceIds.value = selectedSourceIds.value.filter((item) => item !== id)
    return
  }
  selectedSourceIds.value = [...selectedSourceIds.value, id]
}

const selectAllSources = () => {
  selectedSourceIds.value = enabledSources.value.map((source) => source.id)
}

const clearSources = () => {
  selectedSourceIds.value = []
}

const mapSourceNames = (sourceIds = []) => sourceIds
  .map((id) => sourceNameMap.value[id] || id)
  .filter(Boolean)

const formatLastUsed = (value) => {
  const ts = Number(value || 0)
  if (!ts) return '从未'
  return new Date(ts).toLocaleString()
}

const createKey = async () => {
  if (!newKeyName.value?.trim()) {
    error('请输入 Key 名称')
    return
  }

  try {
    const payload = {
      name: newKeyName.value.trim(),
      maxCount: clampMaxCount(maxCount.value),
      sourceIds: [...selectedSourceIds.value]
    }
    const created = await authApi.createApiKey(payload)
    if (created?.error) {
      error(created.error)
      return
    }
    if (created?.key) {
      createdApiKey.value = created.key
      showKeyModal.value = true
      newKeyName.value = ''
      maxCount.value = 5
      selectedSourceIds.value = []
      await load()
    }
  } catch (err) {
    error(err?.message || '创建失败')
  }
}

const copyApiKey = async () => {
  try {
    await navigator.clipboard.writeText(createdApiKey.value)
    success('API Key 已复制到剪贴板')
    showKeyModal.value = false
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = createdApiKey.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    success('API Key 已复制到剪贴板')
    showKeyModal.value = false
  }
}

const removeKey = async (id) => {
  await authApi.deleteApiKey(id)
  await load()
}

const copyKey = async (apiKey) => {
  try {
    await navigator.clipboard.writeText(apiKey)
    success('API Key 已复制到剪贴板')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = apiKey
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    success('API Key 已复制到剪贴板')
  }
}

onMounted(load)
</script>

<style scoped>
.mcp-settings {
  display: grid;
  gap: 1rem;
}

.hero h3 {
  font-size: 1.25rem;
  margin: 0;
  color: var(--text);
}

.hero p {
  color: var(--muted);
  margin: 0.35rem 0 0;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.panel h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.account-row {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.label {
  color: var(--muted);
  font-size: 0.8rem;
  margin: 0;
}

.value {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.2rem 0 0;
  color: var(--text);
}

.hint {
  color: var(--muted);
  margin: 0;
}

.form-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}

.count-field {
  display: grid;
  gap: 0.3rem;
}

.count-field span {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.count-field input {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.65rem;
  outline: none;
  background: var(--surface);
  color: var(--text);
}

.count-field input:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, #0b63ff 30%, transparent);
  border-color: #0b63ff;
}

.source-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.source-head p {
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.source-actions {
  display: flex;
  gap: 0.4rem;
}

.source-actions button {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.76rem;
  min-height: 1.75rem;
  padding: 0 0.65rem;
  color: var(--text);
  transition: all 0.16s ease;
}

.source-actions button:hover {
  border-color: #0b63ff;
  color: #0b63ff;
}

.source-grid {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  max-height: 12rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* 滚动条样式 */
.source-grid::-webkit-scrollbar {
  width: 6px;
}

.source-grid::-webkit-scrollbar-track {
  background: transparent;
}

.source-grid::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--muted) 40%, transparent);
  border-radius: 3px;
}

.source-grid::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--muted) 60%, transparent);
}

.source-chip {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.55rem;
  cursor: pointer;
  display: inline-flex;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0 0.55rem;
  background: var(--surface);
  color: var(--text);
  transition: all 0.16s ease;
}

.source-chip:hover {
  border-color: color-mix(in srgb, #0b63ff 50%, var(--border));
}

.source-chip.active {
  background: color-mix(in srgb, #0b63ff 15%, transparent);
  border-color: #0b63ff;
  color: #0b63ff;
}

.source-chip input {
  display: none;
}

.created-key {
  margin: 0;
  overflow-wrap: anywhere;
}

.key-list {
  display: grid;
  gap: 0.6rem;
}

.key-item {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.7rem;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: 1fr auto;
  padding: 0.7rem 0.8rem;
  background: var(--surface);
}

.name {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.meta {
  color: var(--muted);
  font-size: 0.8rem;
  margin: 0.15rem 0 0;
}

.key-row {
  align-items: center;
  display: flex;
  gap: 0.4rem;
  min-width: 0;
}

.key-label {
  transform: translateY(-1.5px);
  color: var(--muted);
  font-size: 0.8rem;
  flex: 0 0 auto;
}

.key-pill {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 0;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  gap: 0.45rem;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  transition: color 0.16s ease;
}

.key-pill:hover {
  color: #0b63ff;
}

.key-value {
  font-family: monospace;
  font-size: 0.82rem;
  margin: 0;
  max-width: 20rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.key-copy {
  align-items: center;
  color: var(--muted);
  display: inline-flex;
  font-size: 0.82rem;
  gap: 0.2rem;
  white-space: nowrap;
}

.key-modal-content {
  display: grid;
  gap: 1.25rem;
  padding: 0.5rem;
  max-width: 32rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.key-description {
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
}

.api-key-box {
  align-items: stretch;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  display: flex;
  gap: 0;
  overflow: hidden;
}

.api-key-text {
  background: color-mix(in srgb, var(--muted) 10%, transparent);
  border: none;
  border-radius: 0;
  color: var(--text);
  flex: 1;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-x: auto;
  padding: 0.875rem 1rem;
  user-select: all;
  white-space: nowrap;
  word-break: break-all;
}

.copy-button {
  background: var(--surface);
  border: none;
  border-left: 1px solid var(--border);
  border-radius: 0;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0 1.25rem;
  transition: background 0.16s ease;
  white-space: nowrap;
}

.copy-button:hover {
  background: color-mix(in srgb, var(--muted) 15%, var(--surface));
}

@media (max-width: 900px) {
  .form-grid,
  .key-item {
    grid-template-columns: 1fr;
  }
}
</style>
