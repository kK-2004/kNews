import { createKNewsApp } from './app'
import 'uno.css'
import './styles/main.css'

const { app, router, pinia } = createKNewsApp()

if (window.__INITIAL_STATE__) {
  pinia.state.value = window.__INITIAL_STATE__.pinia || {}
}

router.isReady().then(() => {
  app.mount('#app', true)
})
