<template>
  <nav class="settings-nav">
    <RouterLink to="/settings/feed">板块</RouterLink>
    <RouterLink to="/settings/auth">MCP</RouterLink>
    <RouterLink v-if="isAdmin" to="/settings/admin/datasources">后台-数据源</RouterLink>
    <RouterLink v-if="isAdmin" to="/settings/admin/users">后台-用户</RouterLink>
    <RouterLink v-if="isAdmin" to="/settings/admin/api-keys">后台-APIKey</RouterLink>
  </nav>
</template>

<script setup>
import { useAdminMode } from '@/shared/composables/useAdminMode'

const { isAdmin } = useAdminMode()
</script>

<style scoped>
.settings-nav {
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid color-mix(in srgb, #0b63ff 20%, var(--border));
  border-radius: 999px;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.2rem;
  padding: 0.3rem;
}

.settings-nav a {
  align-items: center;
  color: var(--muted);
  display: inline-flex;
  font-size: 0.88rem;
  font-weight: 600;
  justify-content: center;
  border-radius: 999px;
  min-height: 2rem;
  padding: 0.2rem 0.8rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.settings-nav a.router-link-active {
  background: color-mix(in srgb, #0b63ff 16%, transparent);
  color: #0b63ff;
}
</style>
