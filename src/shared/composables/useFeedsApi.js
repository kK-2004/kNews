import { useFetch } from './useFetch'

export function useFeedsApi() {
  const requestPage = (page = 1, limit = 20, force = false) => {
    const req = useFetch(`/api/feeds?page=${page}&limit=${limit}`, {
      ttl: 5 * 60 * 1000,
      retries: 3,
      cache: !force
    })
    return req
  }

  const fetchPage = async ({ page = 1, limit = 20, force = false } = {}) => {
    const req = requestPage(page, limit, force)
    const data = await req.execute({ force })
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      hasMore: Boolean(data?.hasMore ?? (Array.isArray(data?.items) && data.items.length > 0))
    }
  }

  return {
    fetchPage
  }
}
