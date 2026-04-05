import { adminApi } from '@/shared/utils/ipc-api'

export function useAdminApi() {
  const listDatasources = () => adminApi.listDatasources()
  const createDatasource = (payload) => adminApi.createDatasource(payload || {})
  const updateDatasource = (id, payload) => adminApi.updateDatasource(id, payload || {})
  const deleteDatasource = (id) => adminApi.deleteDatasource(id)
  const updateDatasourceScope = (sourceIds) => adminApi.updateDatasourceScope(sourceIds)

  const listUsers = (params = {}) => adminApi.listUsers(params)
  const setUserBlacklist = (id, blacklisted) => adminApi.setUserBlacklist(id, blacklisted)
  const listUserKeys = (id) => adminApi.listUserKeys(id)

  const listApiKeys = (params = {}) => adminApi.listApiKeys(params)
  const deleteApiKey = (id) => adminApi.deleteApiKey(id)
  const updateApiKeyRateLimit = (id, rateLimitRph) => adminApi.updateApiKeyRateLimit(id, rateLimitRph)

  const getAnalytics = (params = {}) => adminApi.getAnalytics(params)

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
