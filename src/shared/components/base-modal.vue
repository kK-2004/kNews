<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @click="onBackdropClick">
      <div ref="modalRef" class="modal" role="dialog" aria-modal="true" @click.stop>
        <header class="modal-header">
          <slot name="title"><h3>Modal</h3></slot>
          <button aria-label="Close modal" class="close-button" type="button" @click="$emit('close')">
            <span class="i-tabler-x"></span>
          </button>
        </header>
        <section class="modal-body">
          <slot />
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch, Teleport } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])
const modalRef = ref(null)
const previousFocus = ref(null)

const getFocusable = () => {
  if (!modalRef.value) return []
  return Array.from(
    modalRef.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled'))
}

const onEscape = (event) => {
  if (event.key === 'Escape' && props.open) emit('close')
}

const onTabTrap = (event) => {
  if (!props.open || event.key !== 'Tab') return
  const focusable = getFocusable()
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

const onBackdropClick = () => {
  if (props.closeOnBackdrop) emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus.value = document.activeElement
      await nextTick()
      const [first] = getFocusable()
      if (first) first.focus()
      else modalRef.value?.focus()
      document.body.style.overflow = 'hidden'
      return
    }

    if (previousFocus.value && previousFocus.value.focus) previousFocus.value.focus()
    document.body.style.overflow = ''
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('keydown', onEscape)
  window.addEventListener('keydown', onTabTrap)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
  window.removeEventListener('keydown', onTabTrap)
})
</script>

<style scoped>
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  overflow: hidden;
}

.modal {
  background: var(--surface);
  border: 0;
  border-radius: 0.75rem;
  max-width: 32rem;
  width: calc(100vw - 2rem);
  min-width: 20rem;
  padding: 0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  align-items: center;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}

.modal-body {
  padding: 1rem;
}

.close-button {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: all 0.16s ease;
  outline: none;
}

.close-button:hover {
  background: color-mix(in srgb, var(--muted) 12%, transparent);
  color: var(--text);
}

.close-button:focus {
  outline: none;
  box-shadow: none;
}
</style>
