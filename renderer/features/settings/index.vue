<template>
  <section class="settings-page">
    <aside class="settings-sidebar">
      <nav class="sidebar-nav">
        <div class="nav-section-label">用户</div>
        <RouterLink class="sidebar-nav-item" to="/settings/feed">
          <span class="i-tabler-layout-grid" aria-hidden="true"></span>
          <span>板块</span>
        </RouterLink>
        <RouterLink class="sidebar-nav-item" to="/settings/auth">
          <span class="i-tabler-key" aria-hidden="true"></span>
          <span>MCP</span>
        </RouterLink>
        <template v-if="isAdmin">
          <div class="nav-section-label">管理</div>
          <RouterLink class="sidebar-nav-item" to="/settings/admin/datasources">
            <span class="i-tabler-database" aria-hidden="true"></span>
            <span>数据源</span>
          </RouterLink>
          <RouterLink class="sidebar-nav-item" to="/settings/admin/users">
            <span class="i-tabler-users" aria-hidden="true"></span>
            <span>用户</span>
          </RouterLink>
          <RouterLink class="sidebar-nav-item" to="/settings/admin/api-keys">
            <span class="i-tabler-activity" aria-hidden="true"></span>
            <span>API 分析</span>
          </RouterLink>
          <RouterLink class="sidebar-nav-item" to="/settings/admin/permissions">
            <span class="i-tabler-shield-check" aria-hidden="true"></span>
            <span>权益配置</span>
          </RouterLink>
        </template>
      </nav>
      <div class="sidebar-footer">
        <RouterLink class="sidebar-nav-item" to="/">
          <span class="i-tabler-arrow-left" aria-hidden="true"></span>
          <span>返回首页</span>
        </RouterLink>
      </div>
    </aside>
    <main class="settings-main">
      <div class="settings-panel">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <KeepAlive :include="keepAliveComponents">
              <component :is="Component" :key="currentRouteKey" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </div>
    </main>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminMode } from '@/shared/composables/useAdminMode'

const route = useRoute()
const { isAdmin } = useAdminMode()

const keepAliveComponents = [
  'FeedSettings',
  'McpSettings',
  'AdminDatasourcesSettings',
  'AdminUsersSettings',
  'AdminApiKeysSettings',
  'AdminPermissionsSettings'
]

const currentRouteKey = computed(() => route.name || route.path)
</script>

<style scoped>
.settings-page {
  display: flex;
  height: calc(100dvh - 4rem);
  margin: -1.5rem -2rem -2rem;
  overflow: hidden;
}

/* ---- Sidebar ---- */
.settings-sidebar {
  width: 16rem;
  background: color-mix(in srgb, var(--surface-container-low) 40%, var(--surface));
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0 1rem;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1.25rem;
  margin-bottom: 1.5rem;
}

.sidebar-logo {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius);
  background: var(--primary-container);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.sidebar-brand {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.sidebar-version {
  font-size: 0.6rem;
  color: var(--on-surface-variant);
  opacity: 0.6;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0 0.5rem;
  flex: 1;
}

.nav-section-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--on-surface-variant);
  padding: 1rem 0.75rem 0.3rem;
  opacity: 0.6;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  border-radius: calc(var(--radius) + 0.15rem);
  color: var(--on-surface-variant);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.14s;
  border: 1px solid transparent;
}

.sidebar-nav-item:hover {
  background: color-mix(in srgb, var(--surface-container) 84%, transparent);
  color: var(--text);
  border-color: color-mix(in srgb, var(--primary) 16%, transparent);
}

.sidebar-nav-item.router-link-active {
  background: var(--surface);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 26%, var(--border));
  font-weight: 600;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--primary) 8%, transparent);
  transform: translateX(2px);
}

.sidebar-nav-item.router-link-active span:first-child {
  color: var(--primary);
}

.sidebar-nav-item span:first-child {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.sidebar-footer {
  margin-top: auto;
  padding: 0.75rem 0.5rem 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}

/* ---- Main ---- */
.settings-main {
  flex: 1;
  overflow-y: auto;
  background: var(--surface-dim);
  padding: 2rem 2.5rem;
}

.settings-panel {
  max-width: 56rem;
  margin: 0 auto;
}

/* ---- Transition ---- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .settings-sidebar {
    display: none;
  }

  .settings-main {
    padding: 1rem;
  }
}
</style>
