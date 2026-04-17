<template>
  <section v-if="!isAdmin" class="admin-permissions">
    <p class="access-denied">仅管理员可访问权益配置</p>
  </section>
  <section v-else class="admin-permissions">
    <header class="section-header">
      <h3>权益配置</h3>
      <p>管理各订阅等级的 API 权限参数，修改后自动同步到所有已激活 API Key</p>
    </header>

    <div v-if="loading" class="empty-state">
      <span class="loading-spinner" />
      <p>加载中…</p>
    </div>

    <template v-else>
      <div class="permissions-table-wrap">
        <table class="permissions-table">
          <thead>
            <tr>
              <th>等级</th>
              <th>名称</th>
              <th>rate_limit（次/小时）</th>
              <th>max_count（最大返回条数）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.level">
              <td class="level-badge">{{ row.level }}</td>
              <td>{{ row.label }}</td>
              <td>
                <input
                  v-model.number="row.rate_limit"
                  type="number"
                  min="-1"
                  step="1"
                  class="perm-input"
                >
                <span class="perm-hint">{{ row.rate_limit === -1 ? '不限' : `${row.rate_limit}/h` }}</span>
              </td>
              <td>
                <input
                  v-model.number="row.max_count"
                  type="number"
                  min="-1"
                  step="1"
                  class="perm-input"
                >
                <span class="perm-hint">{{ row.max_count === -1 ? '不限' : `${row.max_count} 条` }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="actions-bar">
        <base-button :disabled="saving" @click="savePermissions">
          {{ saving ? '保存中…' : '保存配置' }}
        </base-button>
        <span v-if="saveMessage" :class="['save-message', saveOk ? 'success' : 'error']">
          {{ saveMessage }}
        </span>
      </div>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import BaseButton from '@/shared/components/base-button.vue'
import { useAdminMode } from '@/shared/composables/useAdminMode'
import { useAdminApi } from '@/shared/composables/useAdminApi'

defineOptions({
  name: 'AdminPermissionsSettings'
})

const { isAdmin } = useAdminMode()
const adminApi = useAdminApi()

const loading = ref(true)
const saving = ref(false)
const saveMessage = ref('')
const saveOk = ref(true)

const LEVEL_LABELS = { 0: 'Free', 1: 'Plus', 2: 'Pro' }

const rows = ref([
  { level: 0, label: 'Free', rate_limit: 3, max_count: 5 },
  { level: 1, label: 'Plus', rate_limit: 20, max_count: 10 },
  { level: 2, label: 'Pro', rate_limit: -1, max_count: 50 }
])

const loadPermissions = async () => {
  loading.value = true
  try {
    const res = await adminApi.getLevelPermissions()
    if (res?.ok && res.data) {
      const data = res.data
      rows.value = Object.entries(data).map(([level, perm]) => ({
        level: Number(level),
        label: LEVEL_LABELS[level] || `Level ${level}`,
        rate_limit: perm.rate_limit,
        max_count: perm.max_count
      }))
    }
  } catch (_e) {
    // use defaults
  } finally {
    loading.value = false
  }
}

const savePermissions = async () => {
  saving.value = true
  saveMessage.value = ''
  try {
    const payload = {}
    for (const row of rows.value) {
      payload[row.level] = { rate_limit: row.rate_limit, max_count: row.max_count }
    }
    const res = await adminApi.updateLevelPermissions(payload)
    if (res?.ok) {
      saveOk.value = true
      saveMessage.value = '保存成功，已同步到所有 API Key'
    } else {
      saveOk.value = false
      saveMessage.value = res?.error || '保存失败'
    }
  } catch (err) {
    saveOk.value = false
    saveMessage.value = err.message || '保存失败'
  } finally {
    saving.value = false
    setTimeout(() => { saveMessage.value = '' }, 4000)
  }
}

onMounted(() => {
  loadPermissions()
})
</script>

<style scoped>
.admin-permissions {
  display: grid;
  gap: 1.2rem;
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

.empty-state {
  color: var(--muted);
  padding: 2rem 0;
  text-align: center;
}

.empty-state p {
  margin: 0;
}

.permissions-table-wrap {
  overflow-x: auto;
}

.permissions-table {
  border-collapse: collapse;
  width: 100%;
}

.permissions-table th,
.permissions-table td {
  border-bottom: 1px solid var(--border);
  padding: 0.7rem 0.8rem;
  text-align: left;
  white-space: nowrap;
}

.permissions-table th {
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.level-badge {
  font-weight: 700;
}

.perm-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  font-size: 0.9rem;
  padding: 0.4rem 0.6rem;
  width: 5.5rem;
}

.perm-hint {
  color: var(--muted);
  font-size: 0.78rem;
  margin-left: 0.4rem;
}

.actions-bar {
  align-items: center;
  display: flex;
  gap: 0.8rem;
}

.save-message {
  font-size: 0.85rem;
  font-weight: 500;
}

.save-message.success {
  color: #22c55e;
}

.save-message.error {
  color: #ef4444;
}

.loading-spinner {
  animation: spin 0.8s linear infinite;
  border: 2px solid var(--border);
  border-top-color: #0b63ff;
  border-radius: 50%;
  display: inline-block;
  height: 16px;
  width: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .permissions-table th:nth-child(2),
  .permissions-table td:nth-child(2) {
    display: none;
  }
}
</style>
