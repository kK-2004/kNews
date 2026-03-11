<template>
  <section ref="containerRef" aria-live="polite" class="toast-container">
    <toast
      v-for="toast in toasts"
      :key="toast.id"
      :toast="toast"
      @dismiss="$emit('dismiss', $event)"
    />
  </section>
</template>

<script setup>
import { useAutoAnimate } from '@formkit/auto-animate/vue'
import Toast from './toast.vue'

const [containerRef] = useAutoAnimate()

defineEmits(['dismiss'])

defineProps({
  toasts: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.toast-container {
  display: grid;
  gap: 0.55rem;
  left: 50%;
  max-width: min(92vw, 20rem);
  position: fixed;
  top: 0.9rem;
  transform: translateX(-50%);
  width: 20rem;
  z-index: 1200;
}
</style>
