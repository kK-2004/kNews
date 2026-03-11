<template>
  <section v-if="!isAdmin" class="admin-datasources">
    <p class="access-denied">仅管理员可访问数据源管理</p>
  </section>
  <section v-else class="admin-datasources">
    <header class="section-header">
      <h3>数据源管理</h3>
      <p>管理系统数据源的启用状态</p>
    </header>

    <div class="search-bar">
      <base-input v-model="keyword" placeholder="搜索数据源名称..." />
    </div>

    <div v-if="filteredDatasources.length === 0" class="empty-state">
      <p>暂无匹配的数据源</p>
    </div>

    <ul v-else class="datasource-list">
      <li v-for="source in filteredDatasources" :key="source.id" class="datasource-item">
        <div class="meta">
          <p class="name">{{ source.name }}</p>
          <p class="id">ID: {{ source.id }}</p>
        </div>
        <el-switch
          class="datasource-switch"
          :model-value="source.enabled"
          :disabled="pendingId === source.id"
          @change="toggleEnabled(source, $event)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import BaseInput from '@/shared/components/base-input.vue'
import { useAdminMode } from '@/shared/composables/useAdminMode'
import { useAdminApi } from '@/shared/composables/useAdminApi'

defineOptions({
  name: 'AdminDatasourcesSettings'
})

const { isAdmin } = useAdminMode()
const adminApi = useAdminApi()

const keyword = ref('')
const datasources = ref([])
const pendingId = ref('')

const filteredDatasources = computed(() => {
  return datasources.value.filter((item) => {
    const matchKeyword = !keyword.value || item.name.toLowerCase().includes(keyword.value.toLowerCase())
    return matchKeyword
  })
})

const normalizeEnabled = (value) => {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true'
  }
  return false
}

const load = async () => {
  const res = await adminApi.listDatasources()
  datasources.value = Array.isArray(res?.items)
    ? res.items.map((item) => ({
      ...item,
      enabled: normalizeEnabled(item.enabled)
    }))
    : []
}

const toggleEnabled = async (source, value) => {
  const enabled = Boolean(value)
  const previous = source.enabled
  pendingId.value = source.id
  try {
    await adminApi.updateDatasource(source.id, {
      ...source,
      enabled
    })
    source.enabled = enabled
  } catch (err) {
    console.error('更新数据源状态失败:', err)
    source.enabled = previous
  } finally {
    pendingId.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.admin-datasources {
  display: grid;
  gap: 1rem;
}

.section-header h3 {
  font-size: 1.15rem;
  margin: 0;
}

.section-header p {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 0.3rem 0 0;
}

.access-denied {
  color: var(--muted);
  margin: 0;
}

.search-bar {
  margin: 0.5rem 0;
}

.empty-state {
  color: var(--muted);
  text-align: center;
  padding: 2rem 0;
}

.empty-state p {
  margin: 0;
}

.datasource-list {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, 1fr);
  list-style: none;
  margin: 0;
  padding: 0;
}

.datasource-item {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  transition: border-color 0.16s ease;
}

.datasource-item:hover {
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

.id {
  color: var(--muted);
  font-size: 0.75rem;
  margin: 0.2rem 0 0;
}

:deep(.datasource-switch) {
  --el-switch-on-color: #67c23a;
  --el-switch-off-color: #f56c6c;
  align-self: flex-start;
}

@media (max-width: 1024px) {
  .datasource-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .datasource-list {
    grid-template-columns: 1fr;
  }
}
</style>
