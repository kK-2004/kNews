import { computed } from 'vue'
import { useUserStore } from '@/stores/use-user-store'

export function useAdminMode() {
  const userStore = useUserStore()
  const isAdmin = computed(() => Boolean(userStore.profile?.isAdmin))

  return {
    isAdmin
  }
}
