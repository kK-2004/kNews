import { computed } from 'vue'
import { useUserStore } from '@/stores/use-user-store'

export function useAdminMode() {
  const userStore = useUserStore()
  const isAdmin = computed(() => (userStore.profile?.level ?? 0) >= 3)

  return {
    isAdmin
  }
}
