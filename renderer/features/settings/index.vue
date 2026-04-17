<template>
  <section class="settings-page">
    <header class="settings-head">
      <div class="head-content">
        <h2>设置</h2>
        <p>管理账号、模块和偏好设置</p>
      </div>
      <RouterLink to="/" class="back-btn" aria-label="返回首页">
        <span class="i-tabler-home" aria-hidden="true"></span>
        <span>返回首页</span>
      </RouterLink>
    </header>
    <settings-nav />
    <div class="settings-panel">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <KeepAlive :include="keepAliveComponents">
            <component :is="Component" :key="currentRouteKey" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SettingsNav from './components/settings-nav.vue'

const route = useRoute()

// 需要缓存的组件名称（与组件定义的 name 一致）
const keepAliveComponents = [
  'FeedSettings',
  'McpSettings',
  'AdminDatasourcesSettings',
  'AdminUsersSettings',
  'AdminApiKeysSettings',
  'AdminPermissionsSettings'
]

// 使用路由的 name 作为 key，确保切换时组件保持状态
const currentRouteKey = computed(() => route.name || route.path)
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 1.1rem;
  margin: 0 auto;
  max-width: 72rem;
  width: 100%;
}

.settings-head {
  align-items: center;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, #0b63ff 10%, var(--surface)),
    color-mix(in srgb, #0b63ff 2%, var(--surface))
  );
  border: 1px solid color-mix(in srgb, #0b63ff 24%, var(--border));
  border-radius: 1rem;
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.1rem;
}

.head-content {
  flex: 1;
}

.settings-head h2 {
  font-size: 1.35rem;
  margin: 0;
}

.settings-head p {
  color: var(--muted);
  margin: 0.4rem 0 0;
}

.back-btn {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid color-mix(in srgb, #0b63ff 38%, var(--border));
  border-radius: 0.6rem;
  color: inherit;
  display: inline-flex;
  gap: 0.35rem;
  font-weight: 600;
  padding: 0.5rem 0.85rem;
  text-decoration: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, transform 0.14s ease;
}

.back-btn:hover {
  background: color-mix(in srgb, #0b63ff 10%, var(--surface));
  border-color: color-mix(in srgb, #0b63ff 44%, var(--border));
  transform: translateY(-1px);
}

.back-btn:active {
  transform: translateY(1px);
}

.back-btn span:first-child {
  font-size: 1.15rem;
}

.settings-panel {
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  padding: 1.1rem;
}

@media (max-width: 640px) {
  .settings-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .back-btn {
    width: 100%;
    justify-content: center;
  }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
