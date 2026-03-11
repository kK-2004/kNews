import { ref } from 'vue'
import { useFetch } from './useFetch'

/**
 * Paged data loader for infinite scroll patterns.
 */
export function useInfiniteFetch(baseUrl, options = {}) {
  const items = ref([])
  const page = ref(1)
  const hasMore = ref(true)
  const loading = ref(false)
  const error = ref(null)

  const loadMore = async () => {
    if (!hasMore.value || loading.value) return
    loading.value = true
    error.value = null

    try {
      const url = new URL(baseUrl, window.location.origin)
      url.searchParams.set('page', String(page.value))
      url.searchParams.set('limit', String(options.limit || 20))

      const { execute } = useFetch(url.toString(), { cache: false })
      const payload = await execute()
      const next = Array.isArray(payload?.items) ? payload.items : []

      items.value = [...items.value, ...next]
      page.value += 1
      hasMore.value = next.length > 0
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load more'
    } finally {
      loading.value = false
    }
  }

  return {
    data: items,
    error,
    loading,
    hasMore,
    loadMore
  }
}
