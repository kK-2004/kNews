import { userApi, adminApi } from '@/shared/utils/ipc-api'

export function useAuthApi() {
  const getLoginStatus = () => {
    // In Electron mode, login is always available if the preload bridge exists
    return Promise.resolve({ enable: Boolean(window?.api) })
  }
  const getProfile = () => userApi.profile()
  const listApiKeys = () => adminApi.listApiKeys()
  const createApiKey = (payload) => adminApi.createApiKey(payload)
  const deleteApiKey = (id) => adminApi.deleteApiKey(id)

  return {
    getLoginStatus,
    getProfile,
    listApiKeys,
    createApiKey,
    deleteApiKey
  }
}
