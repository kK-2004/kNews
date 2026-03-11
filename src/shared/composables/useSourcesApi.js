import { onUnmounted } from 'vue'
import { invalidateCache, useFetch } from './useFetch'
import { request } from '@/shared/utils/fetch'

export function useSourcesApi() {
  const req = useFetch('/api/sources', {
    ttl: 5 * 60 * 1000,
    retries: 3
  })

  const fetchSources = async () => {
    const data = await req.execute()
    return Array.isArray(data?.items) ? data.items : []
  }

  const createSource = async (payload) => {
    const data = await request('/api/sources', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    invalidateCache('/api/sources')
    return { ok: true, status: 200, data }
  }

  const updateSource = async (id, payload) => {
    const data = await request(`/api/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    invalidateCache('/api/sources')
    return { ok: true, status: 200, data }
  }

  const deleteSource = async (id) => {
    const data = await request(`/api/sources/${id}`, {
      method: 'DELETE'
    })
    invalidateCache('/api/sources')
    return { ok: true, status: 200, data }
  }

  onUnmounted(req.abort)

  return {
    ...req,
    fetchSources,
    createSource,
    updateSource,
    deleteSource
  }
}
