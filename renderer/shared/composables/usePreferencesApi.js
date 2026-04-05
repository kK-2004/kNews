import { userApi } from '@/shared/utils/ipc-api'

export function usePreferencesApi() {
  const getPreferences = () => userApi.getPreferences()
  const savePreferences = (preferences) => userApi.savePreferences(preferences || {})

  return {
    getPreferences,
    savePreferences
  }
}
