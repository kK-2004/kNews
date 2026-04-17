<template>
  <nav class="settings-nav">
    <RouterLink to="/settings/feed">板块</RouterLink>
    <RouterLink to="/settings/auth">MCP</RouterLink>
    <RouterLink v-if="isAdmin" to="/settings/admin/datasources">后台-数据源</RouterLink>
    <RouterLink v-if="isAdmin" to="/settings/admin/users">后台-用户</RouterLink>
    <RouterLink v-if="isAdmin" to="/settings/admin/api-keys">后台-APIKey</RouterLink>
    <RouterLink v-if="isAdmin" to="/settings/admin/permissions">后台-权益配置</RouterLink>
  </nav>
</template>

<script setup>
import { useAdminMode } from '@/shared/composables/useAdminMode'

const { isAdmin } = useAdminMode()
</script>

<style scoped>
.settings-nav {
  background: var(--surface-container-low);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.2rem;
  padding: 0.3rem;
}

.settings-nav a {
  align-items: center;
  color: var(--on-surface-variant);
  display: inline-flex;
  font-size: 0.88rem;
  font-weight: 600;
  justify-content: center;
  border-radius: var(--radius);
  min-height: 2rem;
  padding: 0.2rem 0.8rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.settings-nav a:hover {
  background: var(--surface-container-high);
  color: var(--text);
}

.settings-nav a.router-link-active {
  background: var(--surface-container-highest);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}
</style>
