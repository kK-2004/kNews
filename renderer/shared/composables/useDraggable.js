import { ref } from 'vue'

export function useDraggable(initialItems = [], { onChange } = {}) {
  const items = ref([...initialItems])
  const disabled = ref(false)

  const setItems = (next) => {
    items.value = [...next]
  }

  const onDrop = () => {
    if (typeof onChange === 'function') onChange([...items.value])
  }

  return {
    items,
    disabled,
    setItems,
    onDrop
  }
}
