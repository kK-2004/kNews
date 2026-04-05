import { defineStore } from 'pinia'

export const useUiStore = defineStore('use-ui-store', {
  state: () => ({
    theme: 'system',
    layout: 'default',
    sidebarOpen: true
  }),
  getters: {
    isDark: (state) => state.theme === 'dark'
  },
  actions: {
    applyTheme(theme) {
      const root = document.documentElement
      root.classList.remove('theme-light', 'theme-dark')
      if (theme === 'dark') root.classList.add('theme-dark')
      if (theme === 'light') root.classList.add('theme-light')
    },
    resolveTheme(theme) {
      if (theme !== 'system') return theme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    },
    initTheme() {
      this.applyTheme(this.resolveTheme(this.theme))
    },
    setTheme(theme) {
      this.theme = theme
      this.applyTheme(this.resolveTheme(theme))
    },
    setLayout(layout) {
      this.layout = layout
    },
    setSidebarOpen(value) {
      this.sidebarOpen = value
    }
  },
  persist: {
    pick: ['theme', 'layout', 'sidebarOpen']
  }
})
