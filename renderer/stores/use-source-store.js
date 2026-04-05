import { defineStore } from 'pinia'

export const useSourceStore = defineStore('use-source-store', {
  state: () => ({
    items: [],
    loading: false,
    error: null
  }),
  getters: {
    sourceCount: (state) => state.items.length
  },
  actions: {
    setSources(items) {
      this.items = items
    },
    async fetchSources(fetcher) {
      this.loading = true
      this.error = null
      try {
        const items = await fetcher()
        this.items = Array.isArray(items) ? items : []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch sources'
      } finally {
        this.loading = false
      }
    }
  }
})
