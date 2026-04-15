<template>
  <section class="mcp-settings">
    <header class="hero">
      <div>
        <h3>MCP API Keys</h3>
        <p>为不同客户端创建独立 API Key，并精细控制可检索板块与返回条数。</p>
      </div>
      <base-button v-if="isLoggedIn" @click="openCreateModal">
        <span class="i-tabler-plus" style="font-size:1rem"></span>
        创建 Key
      </base-button>
    </header>

    <div v-if="loading" class="loading-hint">
      <span class="loading-spinner" />
      <span>加载中…</span>
    </div>
    <div v-else-if="!loginEnabled || !isLoggedIn" class="panel account">
      <p v-if="!loginEnabled" class="hint">登录未配置，无法管理 API Key。</p>
      <p v-else class="hint">请先登录后再创建或管理 API Key。</p>
    </div>

    <template v-else-if="isLoggedIn">
      <div class="panel list">
        <div class="list-header">
          <h4>Key 列表</h4>
          <span v-if="keys.length" class="count-badge">{{ keys.length }}</span>
        </div>
        <div v-if="loading" class="loading-hint">
          <span class="loading-spinner" />
          <span>加载中…</span>
        </div>
        <div v-else-if="keys.length" class="key-list">
          <article v-for="key in keys" :key="key.id" class="key-item">
            <div class="key-main">
              <div class="key-top-row">
                <p class="name">{{ key.name || 'Untitled key' }}</p>
                <span v-if="key.is_default" class="badge-default">内置 Key</span>
                <div class="key-chips">
                  <template v-if="(key.source_ids || []).length">
                    <span v-for="sid in key.source_ids" :key="sid" class="source-tag">
                      {{ sourceNameMap[sid] || sid }}
                    </span>
                  </template>
                  <span v-else class="source-tag all">全部板块</span>
                </div>
              </div>
              <p class="meta">
                <span>上限 {{ key.max_count || 12 }} 条</span>
                <span class="sep">·</span>
                <span>调用 {{ key.call_count || 0 }} 次</span>
                <span class="sep">·</span>
                <span>{{ formatLastUsed(key.last_used) }}</span>
              </p>
            </div>
            <div v-if="key.is_default" class="key-actions">
              <button class="action-btn" type="button" @click="editDefaultSources(key)">
                <span class="i-tabler-edit"></span>
              </button>
            </div>
            <button v-else class="delete-btn" type="button" @click="removeKey(key.id)" title="删除">
              <span class="i-tabler-trash"></span>
            </button>
          </article>
        </div>
        <p v-else class="hint">暂无 API Key，点击上方按钮创建。</p>
      </div>
    </template>

    <!-- 创建 Key Modal -->
    <base-modal :open="showCreateModal" @close="showCreateModal = false">
      <template #title>
        <h3 class="modal-title">创建 API Key</h3>
      </template>
      <div class="create-form">
        <base-input v-model="newKeyName" label="Key 名称" placeholder="例如：Cursor / Claude / MCP Server" />
        <label class="count-field">
          <span>单次返回条数</span>
          <input v-model.number="maxCount" type="number" min="1" max="30" @blur="onMaxCountBlur">
        </label>

        <div class="source-section">
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
        </div>

        <base-button class="generate-btn" @click="createKey">生成 API Key</base-button>
      </div>
    </base-modal>

    <!-- API Key 创建成功 Modal -->
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

    <!-- 编辑内置 Key 数据源 Modal -->
    <base-modal :open="showEditSourcesModal" @close="showEditSourcesModal = false">
      <template #title>
        <h3 class="modal-title">编辑内置 Key 数据源</h3>
      </template>
      <div class="key-modal-content">
        <p class="key-description">选择内置 Key 可检索的新闻板块：</p>
        <div class="source-grid">
          <label
            v-for="source in enabledSources"
            :key="source.id"
            class="source-chip"
            :class="{ active: editingSourceIds.includes(source.id) }"
          >
            <input
              :checked="editingSourceIds.includes(source.id)"
              type="checkbox"
              @change="toggleEditSource(source.id)"
            >
            <span>{{ source.name }}</span>
          </label>
        </div>
        <div class="edit-sources-actions">
          <base-button variant="secondary" @click="showEditSourcesModal = false">取消</base-button>
          <base-button @click="saveDefaultSources">保存</base-button>
        </div>
      </div>
    </base-modal>
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
const showCreateModal = ref(false)
const showKeyModal = ref(false)
const createdApiKey = ref('')
const loading = ref(true)

// 创建 Key 表单状态
const newKeyName = ref('')
const maxCount = ref(5)
const selectedSourceIds = ref([])

// 编辑内置 Key
const showEditSourcesModal = ref(false)
const editingKeyId = ref(null)
const editingSourceIds = ref([])

const isLoggedIn = computed(() => Boolean(userStore.authToken || userStore.profile))
const sourceNameMap = computed(() => Object.fromEntries(enabledSources.value.map((s) => [s.id, s.name])))

const clampMaxCount = (value) => Math.min(30, Math.max(1, Number(value) || 5))
const onMaxCountBlur = () => {
  maxCount.value = clampMaxCount(maxCount.value)
}

const openCreateModal = () => {
  newKeyName.value = ''
  maxCount.value = 5
  selectedSourceIds.value = enabledSources.value.map((s) => s.id)
  showCreateModal.value = true
}

const load = async () => {
  loading.value = true
  try {
    const status = await authApi.getLoginStatus()
    loginEnabled.value = Boolean(status?.enable)

    const allSources = await sourcesApi.fetchSources()
    enabledSources.value = allSources || []

    // Sync from main process session (persisted in session.enc, restored on boot)
    const session = await window.api.auth.getSession().catch(() => null)
    if (session?.userId) {
      userStore.setAuth({
        token: userStore.authToken || '',
        type: session.provider || userStore.loginType || 'github',
        profile: {
          ...(userStore.profile || {}),
          name: session.nickname || userStore.profile?.name || '',
          login: session.nickname || userStore.profile?.login || '',
          userId: session.userId,
          level: session.level ?? userStore.profile?.level ?? 0,
        }
      })
    } else {
      userStore.clearAuth()
    }

    // Enrich with DB profile for latest avatar/level
    const profile = await authApi.getProfile().catch(() => null)
    if (profile?.id || profile?.nickname) {
      userStore.setAuth({
        token: userStore.authToken || '',
        type: userStore.loginType || 'github',
        profile: {
          ...(userStore.profile || {}),
          name: profile.nickname || userStore.profile?.name || '',
          login: profile.nickname || userStore.profile?.login || '',
          userId: profile.id || userStore.profile?.userId,
          level: profile.level ?? userStore.profile?.level ?? 0,
        }
      })
    }

    if (!isLoggedIn.value) {
      keys.value = []
      return
    }

    const res = await authApi.listApiKeys()
    keys.value = (res?.keys || []).map((item) => ({
      ...item,
      source_ids: Array.isArray(item?.source_ids) ? item.source_ids : [],
      max_count: clampMaxCount(item?.max_count)
    }))
  } finally {
    loading.value = false
  }
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
  selectedSourceIds.value = enabledSources.value.map((s) => s.id)
}

const clearSources = () => {
  selectedSourceIds.value = []
}

const formatLastUsed = (value) => {
  const ts = Number(value || 0)
  if (!ts) return '从未调用'
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
      showCreateModal.value = false
      showKeyModal.value = true
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

const editDefaultSources = (key) => {
  editingKeyId.value = key.id
  editingSourceIds.value = [...(key.source_ids || [])]
  showEditSourcesModal.value = true
}

const toggleEditSource = (id) => {
  if (editingSourceIds.value.includes(id)) {
    editingSourceIds.value = editingSourceIds.value.filter((item) => item !== id)
  } else {
    editingSourceIds.value = [...editingSourceIds.value, id]
  }
}

const saveDefaultSources = async () => {
  try {
    await authApi.updateApiKey(editingKeyId.value, {
      source_scope: JSON.stringify(editingSourceIds.value)
    })
    showEditSourcesModal.value = false
    success('数据源已更新')
    await load()
  } catch (err) {
    error(err?.message || '更新失败')
  }
}

onMounted(load)
</script>

<style scoped>
.mcp-settings {
  display: grid;
  gap: 1rem;
}

/* Hero */
.hero {
  align-items: center;
  display: flex;
  justify-content: space-between;
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

/* Panel */
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

.hint {
  color: var(--muted);
  margin: 0;
}

/* Account */
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

/* Key list */
.list-header {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.count-badge {
  background: color-mix(in srgb, #0b63ff 12%, transparent);
  color: #0b63ff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}

.key-list {
  display: grid;
  gap: 0.5rem;
}

.key-item {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.7rem;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  background: var(--surface);
  transition: border-color 0.16s ease;
}

.key-item:hover {
  border-color: color-mix(in srgb, var(--muted) 40%, var(--border));
}

.key-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.35rem;
}

.key-top-row {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.name {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.badge-default {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, #0b63ff 12%, transparent);
  color: #0b63ff;
}

.key-chips {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.source-tag {
  background: color-mix(in srgb, var(--muted) 10%, transparent);
  color: var(--muted);
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  white-space: nowrap;
}

.source-tag.all {
  background: color-mix(in srgb, #0b63ff 10%, transparent);
  color: #0b63ff;
}

.key-pill {
  align-items: center;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  gap: 0.4rem;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  transition: color 0.16s ease;
}

.key-pill:hover {
  color: #0b63ff;
}

.key-pill:hover .key-copy {
  color: #0b63ff;
}

.key-value {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-size: 0.8rem;
  margin: 0;
  max-width: 22rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.key-copy {
  color: var(--muted);
  font-size: 0.82rem;
  display: inline-flex;
  transition: color 0.16s ease;
}

.meta {
  color: var(--muted);
  font-size: 0.75rem;
  margin: 0;
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.sep {
  opacity: 0.4;
}

.key-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.16s ease;
}

.action-btn:hover {
  background: color-mix(in srgb, #0b63ff 10%, transparent);
  color: #0b63ff;
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.16s ease;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: color-mix(in srgb, #e53e3e 10%, transparent);
  color: #e53e3e;
}

/* Create Key Modal */
.create-form {
  display: grid;
  gap: 1rem;
  min-width: 0;
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

.source-section {
  display: grid;
  gap: 0.6rem;
}

.source-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.source-head p {
  font-size: 0.85rem;
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
  gap: 0.4rem;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  max-height: 10rem;
  overflow-y: auto;
  padding-right: 0.3rem;
}

.source-grid::-webkit-scrollbar {
  width: 5px;
}

.source-grid::-webkit-scrollbar-track {
  background: transparent;
}

.source-grid::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--muted) 35%, transparent);
  border-radius: 3px;
}

.source-chip {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  cursor: pointer;
  display: inline-flex;
  gap: 0.35rem;
  min-height: 1.85rem;
  padding: 0 0.5rem;
  background: var(--surface);
  color: var(--text);
  transition: all 0.16s ease;
  font-size: 0.82rem;
}

.source-chip:hover {
  border-color: color-mix(in srgb, #0b63ff 50%, var(--border));
}

.source-chip.active {
  background: color-mix(in srgb, #0b63ff 12%, transparent);
  border-color: #0b63ff;
  color: #0b63ff;
}

.source-chip input {
  display: none;
}

.generate-btn {
  margin-top: 0.25rem;
}

/* Key result & edit modals */
.key-modal-content {
  display: grid;
  gap: 1.25rem;
  padding: 0.5rem;
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
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
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

.edit-sources-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
}

/* Loading */
.loading-hint {
  align-items: center;
  color: var(--muted);
  display: flex;
  gap: 0.5rem;
  padding: 1rem 0;
}

.loading-spinner {
  animation: spin 0.8s linear infinite;
  border: 2px solid var(--border);
  border-top-color: #0b63ff;
  border-radius: 50%;
  height: 16px;
  width: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Override modal width for create key */
:deep(.modal) {
  max-width: 40rem;
}

@media (max-width: 900px) {
  .key-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .delete-btn,
  .key-actions {
    align-self: flex-end;
  }
}
</style>
