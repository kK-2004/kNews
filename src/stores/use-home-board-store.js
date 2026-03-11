import { defineStore } from 'pinia'

export const useHomeBoardStore = defineStore('home-board-store', {
  state: () => ({
    boards: [],
    allSelectedSources: [],
    loading: false,
    error: '',
    lastBuiltTab: ''
  }),
  actions: {
    setBoards(items) {
      this.boards = Array.isArray(items) ? items : []
    },
    setAllSelectedSources(items) {
      this.allSelectedSources = Array.isArray(items) ? items : []
    },
    setLoading(value) {
      this.loading = Boolean(value)
    },
    setError(value) {
      this.error = typeof value === 'string' ? value : ''
    },
    setLastBuiltTab(value) {
      this.lastBuiltTab = typeof value === 'string' ? value : ''
    },
    reset() {
      this.boards = []
      this.allSelectedSources = []
      this.loading = false
      this.error = ''
      this.lastBuiltTab = ''
    }
  }
})
