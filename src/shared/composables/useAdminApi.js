import { request } from '@/shared/utils/fetch'

export function useAdminApi() {
  const listDatasources = () => request('/api/admin/datasources')
  const createDatasource = (payload) => request('/api/admin/datasources', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  })
  const updateDatasource = (id, payload) => request(`/api/admin/datasources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload || {})
  })
  const deleteDatasource = (id) => request(`/api/admin/datasources/${id}`, {
    method: 'DELETE'
  })
  const updateDatasourceScope = (sourceIds) => request('/api/admin/datasources/scope', {
    method: 'PUT',
    body: JSON.stringify({ sourceIds })
  })

  const listUsers = (params = {}) => {
    const query = new URLSearchParams()
    if (params.username) query.set('username', params.username)
    if (params.status) query.set('status', params.status)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    return request(`/api/admin/users?${query.toString()}`)
  }
  const setUserBlacklist = (id, blacklisted) => request(`/api/admin/users/${id}/blacklist`, {
    method: 'PUT',
    body: JSON.stringify({ blacklisted })
  })
  const listUserKeys = (id) => request(`/api/admin/users/${id}/keys`)

  const listApiKeys = (params = {}) => {
    const query = new URLSearchParams()
    if (params.keyId) query.set('keyId', params.keyId)
    return request(`/api/admin/api-keys?${query.toString()}`)
  }
  const deleteApiKey = (id) => request(`/api/admin/api-keys/${id}`, {
    method: 'DELETE'
  })
  const updateApiKeyRateLimit = (id, rateLimitRph) => request(`/api/admin/api-keys/${id}/rate-limit`, {
    method: 'PUT',
    body: JSON.stringify({ rateLimitRph })
  })

  const getAnalytics = (params = {}) => {
    const query = new URLSearchParams()
    if (params.start) query.set('start', String(params.start))
    if (params.end) query.set('end', String(params.end))
    if (params.keyId) query.set('keyId', params.keyId)
    return request(`/api/admin/analytics?${query.toString()}`)
  }

  return {
    listDatasources,
    createDatasource,
    updateDatasource,
    deleteDatasource,
    updateDatasourceScope,
    listUsers,
    setUserBlacklist,
    listUserKeys,
    listApiKeys,
    deleteApiKey,
    updateApiKeyRateLimit,
    getAnalytics
  }
}
