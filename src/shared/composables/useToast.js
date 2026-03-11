import { ref } from 'vue'

let seed = 0
const toasts = ref([])

/**
 * Global toast state manager with typed helper methods.
 */
export function useToast() {
  const dismiss = (id) => {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  const push = ({ message, type = 'info', timeout = 5000, action }) => {
    const id = `toast-${Date.now()}-${seed++}`
    const toast = { id, message, type, timeout, action }
    toasts.value = [toast, ...toasts.value]

    if (timeout > 0) {
      setTimeout(() => dismiss(id), timeout)
    }

    return id
  }

  const success = (message, options = {}) => push({ ...options, type: 'success', message })
  const error = (message, options = {}) => push({ ...options, type: 'error', message })
  const warning = (message, options = {}) => push({ ...options, type: 'warning', message })
  const info = (message, options = {}) => push({ ...options, type: 'info', message })

  return {
    toasts,
    push,
    dismiss,
    success,
    error,
    warning,
    info
  }
}
