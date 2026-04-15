<template>
  <section v-if="!isAdmin" class="admin-users">
    <p class="access-denied">仅管理员可访问用户管理</p>
  </section>
  <section v-else class="admin-users">
    <header class="section-header">
      <h3>用户管理</h3>
      <p>管理系统用户、黑名单和登录审计</p>
    </header>

    <div class="filter-bar">
      <div class="filter-inputs">
        <base-input v-model="username" class="username-input" placeholder="搜索用户名..." />
        <el-select
          v-model="status"
          class="status-select"
          placeholder="全部状态"
        >
          <el-option label="全部状态" value="" />
          <el-option label="正常" value="normal" />
          <el-option label="黑名单" value="blacklist" />
        </el-select>
      </div>
      <div class="filter-actions">
        <base-button variant="secondary" @click="exportUsers">导出用户</base-button>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <span class="loading-spinner" />
      <p>加载中…</p>
    </div>
    <div v-else-if="users.length === 0" class="empty-state">
      <p>暂无用户数据</p>
    </div>

    <div v-else class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>API Keys</th>
            <th>总调用</th>
            <th>状态</th>
            <th>最近活跃</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username || '未知用户' }}</td>
            <td>{{ user.apikeyCount || 0 }}</td>
            <td>{{ user.totalCalls || 0 }}</td>
            <td>
              <span :class="['badge', user.status]">
                {{ user.status === 'blacklist' ? '黑名单' : '正常' }}
              </span>
            </td>
            <td>{{ formatLastActive(user.lastActive) }}</td>
            <td>
              <button class="action-btn" @click="viewKeys(user)">查看</button>
              <button
                :class="['action-btn', user.status === 'blacklist' ? 'btn-secondary' : 'btn-danger']"
                @click="toggleBlacklist(user)"
              >
                {{ user.status === 'blacklist' ? '移出黑名单' : '加入黑名单' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">上一页</button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页（共 {{ totalItems }} 条）</span>
      <button :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一页</button>
    </div>

    <div v-if="loginAudits.length > 0" class="audit-section">
      <h4>GitHub 登录审计（最近）</h4>
      <div class="audit-list">
        <div v-for="audit in loginAudits" :key="audit.id" class="audit-item">
          <div class="audit-main">
            <p class="audit-user">{{ audit.github_login || '未知用户' }}</p>
            <p class="audit-meta">用户 ID: {{ audit.user_id }}</p>
          </div>
          <p class="audit-time">{{ formatDate(audit.logged_in_at) }}</p>
        </div>
      </div>
    </div>

    <base-modal :open="drawerVisible" title="用户 API Keys" @close="drawerVisible = false">
      <div v-if="userKeys.length === 0" class="modal-empty">
        <p>该用户暂无 API Key</p>
      </div>
      <div v-else class="keys-list">
        <div v-for="key in userKeys" :key="key.id" class="key-item">
          <div class="key-main">
            <p class="key-name">{{ key.name || '未命名 Key' }}</p>
            <div class="key-stats">
              <span class="key-stat">限流: {{ key.rateLimitRph || '-' }}/h</span>
              <span class="key-stat">调用: {{ key.callCount || 0 }}</span>
              <span class="key-stat">最后: {{ formatLastUsed(key.lastUsed) }}</span>
            </div>
          </div>
        </div>
      </div>
    </base-modal>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import BaseButton from '@/shared/components/base-button.vue'
import BaseInput from '@/shared/components/base-input.vue'
import BaseModal from '@/shared/components/base-modal.vue'
import { useAdminMode } from '@/shared/composables/useAdminMode'
import { useAdminApi } from '@/shared/composables/useAdminApi'

defineOptions({
  name: 'AdminUsersSettings'
})

const { isAdmin } = useAdminMode()
const adminApi = useAdminApi()

const username = ref('')
const status = ref('')
const users = ref([])
const loading = ref(true)
const loginAudits = ref([])
const drawerVisible = ref(false)
const userKeys = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(1)
const totalItems = ref(0)

const load = async () => {
  loading.value = true
  try {
    const res = await adminApi.listUsers({
      username: username.value,
      status: status.value,
      page: currentPage.value,
      pageSize: pageSize.value
    })
    users.value = Array.isArray(res?.users) ? res.users : []
    loginAudits.value = Array.isArray(res?.loginAudits) ? res.loginAudits : []
    totalPages.value = res?.pagination?.totalPages || 1
    totalItems.value = res?.pagination?.total || 0
  } finally {
    loading.value = false
  }
}

const debouncedLoad = useDebounceFn(() => {
  currentPage.value = 1
  load()
}, 300)

watch([username, status], debouncedLoad)

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  load()
}

const exportUsers = () => {
  const csv = ['username,status,apikeyCount,totalCalls,lastActive']
  for (const user of users.value) {
    csv.push([user.username, user.status, user.apikeyCount, user.totalCalls, user.lastActive || ''].join(','))
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `admin-users-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const viewKeys = async (user) => {
  const res = await adminApi.listUserKeys(user.id)
  userKeys.value = Array.isArray(res?.keys) ? res.keys : []
  drawerVisible.value = true
}

const toggleBlacklist = async (user) => {
  const toBlacklist = user.status !== 'blacklist'
  const message = toBlacklist
    ? '加入黑名单会禁用该用户的所有API Key'
    : '移出黑名单会恢复该用户的所有API Key'

  if (!confirm(`${message}\n\n确定要继续吗？`)) {
    return
  }

  try {
    await adminApi.setUserBlacklist(user.id, toBlacklist)
    user.status = toBlacklist ? 'blacklist' : 'normal'
  } catch (err) {
    console.error('更新黑名单状态失败:', err)
    alert('操作失败，请稍后重试')
  }
}

const formatLastActive = (value) => {
  if (!value) return '从未'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (value) => {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatLastUsed = (value) => {
  if (!value) return '从未'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(load)
</script>

<style scoped>
.admin-users {
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

.filter-bar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  justify-content: space-between;
}

.filter-inputs {
  display: flex;
  flex: 1;
  gap: 0.6rem;
  min-width: 0;
}

.filter-inputs > * {
  flex: 1;
  min-width: 120px;
}

.filter-inputs :deep(.username-input) {
  flex: 2 1 22rem;
  min-width: 220px;
}

.filter-inputs :deep(.username-input .input) {
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid var(--border);
  color: var(--text);
}

.filter-inputs :deep(.username-input .input::placeholder) {
  color: color-mix(in srgb, var(--muted) 88%, var(--text));
}

.filter-inputs :deep(.username-input .input:focus) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #0b63ff 36%, transparent);
}

.filter-inputs :deep(.status-select) {
  flex: 0 0 11rem;
  min-width: 10rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  color: var(--muted);
  text-align: center;
  padding: 2rem 0;
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
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state p {
  margin: 0;
}

.table-container {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow-x: auto;
}

.users-table {
  border-collapse: collapse;
  width: 100%;
}

.users-table th,
.users-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  text-align: center;      /* 水平居中 */
  vertical-align: middle;  /* 垂直居中 */
}

.users-table th {
  background: color-mix(in srgb, var(--muted) 10%, transparent);
  border-bottom: 2px solid var(--border);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--muted);
}

.users-table td {
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.users-table tr:last-child td {
  border-bottom: none;
  text-align: center;      /* 水平居中 */
  vertical-align: middle;  /* 垂直居中 */
}

.users-table tbody tr:hover {
  background: color-mix(in srgb, var(--muted) 5%, transparent);
}

.badge {
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  display: inline-block;
}

.badge.normal {
  background: color-mix(in srgb, #10b981 16%, transparent);
  color: #10b981;
}

.badge.blacklist {
  background: color-mix(in srgb, #ef4444 16%, transparent);
  color: #ef4444;
}

.action-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  cursor: pointer;
  font-size: 0.8rem;
  margin-right: 0.4rem;
  padding: 0.35rem 0.65rem;
  transition: all 0.16s ease;
}

.action-btn:hover {
  background: color-mix(in srgb, var(--muted) 10%, transparent);
  border-color: color-mix(in srgb, #0b63ff 30%, var(--border));
}

.action-btn.btn-secondary:hover {
  border-color: color-mix(in srgb, #10b981 30%, var(--border));
}

.action-btn.btn-danger:hover {
  border-color: color-mix(in srgb, #ef4444 30%, var(--border));
}

.pagination {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 1rem 0;
}

.pagination button {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  transition: all 0.16s ease;
}

.pagination button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--muted) 10%, transparent);
  border-color: color-mix(in srgb, #0b63ff 30%, var(--border));
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  color: var(--muted);
  font-size: 0.9rem;
}

.audit-section {
  display: grid;
  gap: 0.7rem;
}

.audit-section h4 {
  font-size: 1rem;
  margin: 0;
}

.audit-list {
  display: grid;
  gap: 0.5rem;
}

.audit-item {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: 1fr auto;
  padding: 0.6rem 0.8rem;
}

.audit-user {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}

.audit-meta {
  color: var(--muted);
  font-size: 0.75rem;
  margin: 0.1rem 0 0;
}

.audit-time {
  color: var(--muted);
  font-size: 0.8rem;
  text-align: right;
}

.modal-empty {
  padding: 2rem 0;
  text-align: center;
}

.modal-empty p {
  color: var(--muted);
  margin: 0;
}

.keys-list {
  display: grid;
  gap: 0.6rem;
}

.key-item {
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  padding: 0.7rem;
}

.key-name {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.3rem;
}

.key-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.key-stat {
  color: var(--muted);
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-inputs {
    flex-direction: column;
  }

  .filter-inputs :deep(.username-input),
  .filter-inputs :deep(.status-select) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .filter-actions {
    width: 100%;
  }

  .filter-actions > * {
    flex: 1;
  }

  .users-table {
    font-size: 0.8rem;
  }

  .users-table th,
  .users-table td {
    padding: 0.6rem 0.5rem;
  }

  .table-container {
    border-radius: 0.5rem;
  }

  .action-btn {
    display: block;
    margin-bottom: 0.3rem;
    width: 100%;
  }

  .pagination {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
