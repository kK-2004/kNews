import { useStorage } from '@vueuse/core'

export function useSessionStorage(key, initialValue) {
  return useStorage(key, initialValue, sessionStorage)
}
