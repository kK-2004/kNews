import { authApi, userApi } from '@/shared/utils/ipc-api'

export function useAuthApi() {
  const getLoginStatus = () => {
    // In Electron mode, login is always available if the preload bridge exists
    return Promise.resolve({ enable: Boolean(window?.api) })
  }
  const getProfile = () => userApi.profile()
  const listApiKeys = () => authApi.getSession()
  const createApiKey = (payload) => userApi.update(payload)
  const deleteApiKey = (id) => userApi.update({ deleteApiKey: id })

  return {
    getLoginStatus,
    getProfile,
    listApiKeys,
    createApiKey,
    deleteApiKey
  }
}
