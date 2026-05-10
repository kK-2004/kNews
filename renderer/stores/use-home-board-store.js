import { defineStore } from 'pinia'

export const useHomeBoardStore = defineStore('home-board-store', {
  state: () => ({
    // Per-tab storage
    boardsByTab: {},
    sourcesByTab: {},
    loadingByTab: {},
    lastBuiltTabByTab: {},
    // Track current active tab
    currentTab: '',
    // Shared error state
    error: ''
  }),
  getters: {
    boards(state) {
      return state.boardsByTab[state.currentTab] || []
    },
    allSelectedSources(state) {
      return state.sourcesByTab[state.currentTab] || []
    },
    loading(state) {
      return state.loadingByTab[state.currentTab] || false
    },
    lastBuiltTab(state) {
      return state.lastBuiltTabByTab[state.currentTab] || ''
    }
  },
  actions: {
    // Tab management
    setCurrentTab(tab) {
      this.currentTab = tab
    },

    // Per-tab board accessors
    getBoardsForTab(tab) {
      return this.boardsByTab[tab] || []
    },
    setBoardsForTab(tab, items) {
      this.boardsByTab[tab] = Array.isArray(items) ? items : []
    },
    getSourcesForTab(tab) {
      return this.sourcesByTab[tab] || []
    },
    setSourcesForTab(tab, items) {
      this.sourcesByTab[tab] = Array.isArray(items) ? items : []
    },
    getLoadingForTab(tab) {
      return this.loadingByTab[tab] || false
    },

    // Convenience setters (operate on current tab)
    setBoards(items) {
      this.boardsByTab[this.currentTab] = Array.isArray(items) ? items : []
    },
    setAllSelectedSources(items) {
      this.sourcesByTab[this.currentTab] = Array.isArray(items) ? items : []
    },
    setLoading(value) {
      this.loadingByTab[this.currentTab] = Boolean(value)
    },
    setError(value) {
      this.error = typeof value === 'string' ? value : ''
    },
    setLastBuiltTab(value) {
      this.lastBuiltTabByTab[this.currentTab] = typeof value === 'string' ? value : ''
    },
    hasCachedBoards(tab) {
      const boards = this.boardsByTab[tab]
      return Array.isArray(boards) && boards.length > 0
    },
    reset() {
      this.boardsByTab = {}
      this.sourcesByTab = {}
      this.loadingByTab = {}
      this.lastBuiltTabByTab = {}
      this.currentTab = ''
      this.error = ''
    }
  }
})
