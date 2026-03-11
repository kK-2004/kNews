import { request } from '@/shared/utils/fetch'

export function usePreferencesApi() {
  const getPreferences = () => request('/api/me/preferences')
  const savePreferences = (preferences) => request('/api/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences || {})
  })

  return {
    getPreferences,
    savePreferences
  }
}
