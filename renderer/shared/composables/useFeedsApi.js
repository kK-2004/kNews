import { feedsApi } from '@/shared/utils/ipc-api'

export function useFeedsApi() {
  const fetchPage = async ({ page = 1, limit = 20, force = false } = {}) => {
    const data = await feedsApi.get({ page, limit, force })
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      hasMore: Boolean(data?.hasMore ?? (Array.isArray(data?.items) && data.items.length > 0))
    }
  }

  return {
    fetchPage
  }
}
