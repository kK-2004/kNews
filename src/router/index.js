import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'

export const routes = [
  {
    path: '/kNews',
    redirect: '/'
  },
  {
    path: '/kNews/:pathMatch(.*)*',
    redirect: '/'
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/features/home/index.vue'),
    meta: { title: 'Home', prefetch: true }
  },
  {
    path: '/sources',
    redirect: '/'
  },
  {
    path: '/source/:id',
    redirect: '/'
  },
  {
    path: '/category/:id',
    redirect: '/'
  },
  {
    path: '/reader/:id',
    name: 'reader-detail',
    component: () => import('@/features/reader/index.vue'),
    props: true,
    meta: { title: 'Reader' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/features/settings/index.vue'),
    redirect: '/settings/feed',
    meta: { title: '设置' },
    children: [
      {
        path: 'feed',
        name: 'settings-feed',
        component: () => import('@/features/settings/components/feed-settings.vue'),
        meta: { title: '模块设置' }
      },
      {
        path: 'auth',
        name: 'settings-auth',
        component: () => import('@/features/settings/components/mcp-settings.vue'),
        meta: { title: 'MCP设置' }
      },
      {
        path: 'admin/datasources',
        name: 'settings-admin-datasources',
        component: () => import('@/features/settings/components/admin/datasources-settings.vue'),
        meta: { title: '后台-数据源' }
      },
      {
        path: 'admin/users',
        name: 'settings-admin-users',
        component: () => import('@/features/settings/components/admin/users-settings.vue'),
        meta: { title: '后台-用户' }
      },
      {
        path: 'admin/api-keys',
        name: 'settings-admin-api-keys',
        component: () => import('@/features/settings/components/admin/api-keys-settings.vue'),
        meta: { title: '后台-APIKey' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/features/not-found/index.vue'),
    meta: { title: 'Not Found' }
  }
]

export function createAppRouter({ ssr = false, base = import.meta.env.BASE_URL } = {}) {
  const router = createRouter({
    history: ssr ? createMemoryHistory(base) : createWebHistory(base),
    routes,
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) return savedPosition
      if (to.hash) return { el: to.hash, behavior: 'smooth' }
      return { top: 0, left: 0 }
    }
  })

  router.beforeEach((to) => {
    if (to.meta?.requiresAuth) {
      return { name: 'home' }
    }
    return true
  })

  router.afterEach((to) => {
    if (typeof document !== 'undefined') {
      document.title = to.meta?.title ? `kNews | ${to.meta.title}` : 'kNews'
    }
  })

  router.onError((error) => {
    console.error('[router]', error)
  })

  return router
}

const router = createAppRouter()

export default router
