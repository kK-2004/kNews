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
      <li v-for="source in sources" :key="source.id" class="module-item">
        <div class="meta">
          <p class="name">{{ source.name }}</p>
          <p class="desc">{{ source.title || source.id }}</p>
        </div>
        <el-switch
          class="module-switch"
          :model-value="source.enabled !== 0"
          :disabled="pendingId === source.id"
          @change="toggleSource(source, $event)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useSourcesApi } from '@/shared/composables/useSourcesApi'

defineOptions({
  name: 'FeedSettings'
})

const sourcesApi = useSourcesApi()
const sources = ref([])
const pendingId = ref('')
const error = ref('')
const loading = ref(true)

const load = async () => {
  error.value = ''
  loading.value = true
  try {
    const items = await sourcesApi.fetchSources()
    sources.value = [...(items || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN'))
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载模块失败'
  } finally {
    loading.value = false
  }
}

const toggleSource = async (source, value) => {
  const enabled = Boolean(value)
  const previous = source.enabled
  pendingId.value = source.id
  error.value = ''
  try {
    const response = await sourcesApi.updateSource(source.id, { enabled })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    source.enabled = enabled ? 1 : 0
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新模块失败'
    source.enabled = previous
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
  border-top-color: #0b63ff;
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
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  transition: border-color 0.16s ease;
}

.module-item:hover {
  border-color: color-mix(in srgb, #0b63ff 30%, var(--border));
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
  --el-switch-on-color: #67c23a;
  --el-switch-off-color: #f56c6c;
  align-self: flex-start;
}

.error {
  color: #d14343;
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
