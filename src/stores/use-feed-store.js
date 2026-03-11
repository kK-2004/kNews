import { defineStore } from 'pinia'

export const useFeedStore = defineStore('use-feed-store', {
  state: () => ({
    articles: [],
    page: 1,
    hasMore: true,
    loading: false,
    error: null
  }),
  getters: {
    articleCount: (state) => state.articles.length
  },
  actions: {
    resetFeed() {
      this.articles = []
      this.page = 1
      this.hasMore = true
      this.error = null
    },
    appendArticles(items) {
      this.articles = [...this.articles, ...items]
      this.page += 1
      this.hasMore = items.length > 0
    }
  }
})
