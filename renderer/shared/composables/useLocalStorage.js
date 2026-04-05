import { watch } from 'vue'
import { useStorage } from '@vueuse/core'

export function useLocalStorage(key, initialValue) {
  const state = useStorage(key, initialValue, localStorage)

  watch(state, () => {
    // keep side effects centralized for future analytics hooks
  })

  return state
}
