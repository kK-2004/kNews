import { sourcesApi } from '@/shared/utils/ipc-api'

export function useSourcesApi() {
  const fetchSources = async () => {
    const data = await sourcesApi.list()
    return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
  }

  const createSource = async (payload) => {
    const data = await sourcesApi.create(payload)
    return { ok: true, status: 200, data }
  }

  const updateSource = async (id, payload) => {
    const data = await sourcesApi.update(id, payload)
    return { ok: true, status: 200, data }
  }

  const deleteSource = async (id) => {
    const data = await sourcesApi.delete(id)
    return { ok: true, status: 200, data }
  }

  return {
    fetchSources,
    createSource,
    updateSource,
    deleteSource
  }
}
