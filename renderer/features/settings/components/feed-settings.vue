<template>
  <section class="feed-settings">
    <header>
      <h3>新闻模块</h3>
      <p>管理首页显示的模块</p>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="empty-state">
      <span class="loading-spinner" />
      <p>加载中…</p>
    </div>
    <div v-else-if="sources.length === 0" class="empty-state">
      <p>暂无可用的模块</p>
      <small>所有数据源已在后台禁用</small>
    </div>

    <ul v-else class="modules">
      <li v-for="source in sources" :key="source.id" class="module-item" :class="{ 'module-disabled': !isGloballyEnabled(source) }">
        <div class="meta">
          <p class="name">{{ source.name }}</p>
          <p class="desc">{{ source.title || source.id }}</p>
        </div>
        <el-switch
          class="module-switch"
          :model-value="isGloballyEnabled(source) && !disabledSourceIds.includes(source.id)"
          :disabled="pendingId === source.id || !isGloballyEnabled(source)"
          @change="toggleSource(source, $event)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, toRaw } from 'vue'
import { useSourcesApi } from '@/shared/composables/useSourcesApi'
import { usePreferencesApi } from '@/shared/composables/usePreferencesApi'
import { useUserStore } from '@/stores/use-user-store'

defineOptions({
  name: 'FeedSettings'
})

const sourcesApi = useSourcesApi()
const preferencesApi = usePreferencesApi()
const userStore = useUserStore()
const sources = ref([])
const pendingId = ref('')
const error = ref('')
const loading = ref(true)
const disabledSourceIds = ref([])

const currentUserId = computed(() => userStore.profile?.userId || 'anonymous')
const localKey = computed(() => `knews:board-preferences:${currentUserId.value}`)

const isGloballyEnabled = (source) => {
  if (source.enabled === true) return true
  if (source.enabled === false) return false
  return source.enabled === 1
}

const uniqueIds = (arr) => [...new Set((Array.isArray(arr) ? arr : []).map(String).filter(Boolean))]

const readLocalPreferences = () => {
  try {
    const raw = localStorage.getItem(localKey.value)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const writeLocalPreferences = (data) => {
  try {
    localStorage.setItem(localKey.value, JSON.stringify(data))
  } catch { /* ignore */ }
}

const canUseRemotePreferences = () => Boolean(userStore.profile?.userId)

const loadDisabledSourceIds = async () => {
  if (canUseRemotePreferences()) {
    try {
      const result = await preferencesApi.getPreferences()
      const boardPrefs = result?.preferences?.board || {}
      disabledSourceIds.value = uniqueIds(boardPrefs.disabledSourceIds)
      writeLocalPreferences({ ...readLocalPreferences(), disabledSourceIds: disabledSourceIds.value })
      return
    } catch { /* fallback to local */ }
  }
  const local = readLocalPreferences()
  disabledSourceIds.value = uniqueIds(local.disabledSourceIds)
}

const load = async () => {
  error.value = ''
  loading.value = true
  try {
    const [items] = await Promise.all([
      sourcesApi.fetchSources(),
      loadDisabledSourceIds()
    ])
    sources.value = [...(items || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN'))
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载模块失败'
  } finally {
    loading.value = false
  }
}

const toggleSource = async (source, value) => {
  const enable = Boolean(value)
  const previousDisabled = disabledSourceIds.value.includes(source.id)
  pendingId.value = source.id
  error.value = ''
  try {
    const next = enable
      ? disabledSourceIds.value.filter((id) => id !== source.id)
      : [...disabledSourceIds.value, source.id]
    disabledSourceIds.value = uniqueIds(next)

    // Save to local cache immediately
    writeLocalPreferences({ ...readLocalPreferences(), disabledSourceIds: disabledSourceIds.value })

    // Sync to remote if authenticated
    if (canUseRemotePreferences()) {
      await preferencesApi.savePreferences({ board: { disabledSourceIds: [...disabledSourceIds.value] } })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新模块失败'
    // Revert local state on failure
    disabledSourceIds.value = previousDisabled
      ? [...new Set([...disabledSourceIds.value, source.id])]
      : disabledSourceIds.value.filter((id) => id !== source.id)
  } finally {
    pendingId.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.feed-settings {
  display: grid;
  gap: 0.85rem;
}

.feed-settings header h3 {
  margin: 0;
}

.feed-settings header p {
  color: var(--muted);
  margin: 0.35rem 0 0;
}

.empty-state {
  color: var(--muted);
  text-align: center;
  padding: 3rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.loading-spinner {
  animation: spin 0.8s linear infinite;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  height: 16px;
  width: 16px;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state p {
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
}

.empty-state small {
  display: block;
  font-size: 0.85rem;
}

.modules {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, 1fr);
  list-style: none;
  margin: 0;
  padding: 0;
}

.module-item {
  background: var(--surface-container-low);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  transition: background 0.15s, border-color 0.15s;
}

.module-item:hover {
  background: var(--surface-container);
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
}

.module-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.meta {
  min-width: 0;
  flex: 1;
}

.name {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}

.desc {
  color: var(--muted);
  font-size: 0.8rem;
  margin: 0.2rem 0 0;
}

:deep(.module-switch) {
  --el-switch-on-color: var(--primary);
  --el-switch-off-color: color-mix(in srgb, var(--surface-container-highest) 92%, var(--surface));
  align-self: flex-start;
}

:deep(.module-switch .el-switch__core) {
  border: 1px solid color-mix(in srgb, var(--primary) 18%, var(--border));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 10%, transparent);
}

:deep(.module-switch.is-checked .el-switch__core) {
  border-color: color-mix(in srgb, var(--primary) 28%, transparent);
}

:deep(.module-switch .el-switch__action) {
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.theme-dark :deep(.module-switch .el-switch__core) {
  border-color: color-mix(in srgb, #ffffff 14%, var(--border));
}

.theme-dark :deep(.module-switch .el-switch__action) {
  background: #f5f5f5;
}

.error {
  color: var(--error);
  margin: 0;
}

@media (max-width: 1024px) {
  .modules {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .modules {
    grid-template-columns: 1fr;
  }
}
</style>
