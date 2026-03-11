import { request } from '@/shared/utils/fetch'

export function useAuthApi() {
  const getLoginStatus = () => request('/api/enable-login', { skipAuth: true })
  const getProfile = () => request('/api/me')
  const listApiKeys = () => request('/api/me/keys')
  const createApiKey = (payload) => request('/api/me/keys', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  })
  const deleteApiKey = (id) => request(`/api/me/keys/${id}`, {
    method: 'DELETE'
  })

  return {
    getLoginStatus,
    getProfile,
    listApiKeys,
    createApiKey,
    deleteApiKey
  }
}
