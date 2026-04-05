import { createApp as createVueApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersistedstate from 'pinia-plugin-persistedstate'
import { MotionPlugin } from '@vueuse/motion'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { createAppRouter } from './router'

export function createKNewsApp({ ssr = false, ssrOrigin = '' } = {}) {
  const app = createVueApp(App)
  const pinia = createPinia()
  const router = createAppRouter({ ssr })

  pinia.use(piniaPersistedstate)

  app.use(pinia)
  app.use(router)
  app.use(MotionPlugin)
  app.use(ElementPlus)
  app.provide('ssrOrigin', ssrOrigin)

  return { app, pinia, router }
}
