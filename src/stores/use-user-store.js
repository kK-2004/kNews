import { defineStore } from 'pinia'

export const useUserStore = defineStore('use-user-store', {
  state: () => ({
    language: 'en',
    compactMode: false,
    itemsPerPage: 20,
    authToken: '',
    loginType: '',
    profile: null
  }),
  actions: {
    setLanguage(language) {
      this.language = language
    },
    setCompactMode(compactMode) {
      this.compactMode = compactMode
    },
    setItemsPerPage(itemsPerPage) {
      this.itemsPerPage = itemsPerPage
    },
    setAuth(payload) {
      this.authToken = payload?.token || ''
      this.loginType = payload?.type || ''
      this.profile = payload?.profile || null
    },
    clearAuth() {
      this.authToken = ''
      this.loginType = ''
      this.profile = null
    }
  },
  persist: {
    pick: ['language', 'compactMode', 'itemsPerPage', 'authToken', 'loginType', 'profile']
  }
})
