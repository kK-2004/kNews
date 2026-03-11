import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

export function useMotion() {
  const reducedMotion = usePreferredReducedMotion()

  const transition = computed(() => reducedMotion.value
    ? { duration: 0 }
    : { duration: 220, easing: 'ease-out' })

  return {
    reducedMotion,
    transition
  }
}
