<template>
  <section aria-live="polite" class="toast-container">
    <TransitionGroup name="toast">
      <toast
        v-for="toast in toasts"
        :key="toast.id"
        :toast="toast"
        @dismiss="$emit('dismiss', $event)"
      />
    </TransitionGroup>
  </section>
</template>

<script setup>
import Toast from './toast.vue'

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
  --toast-duration: .22s;

  align-items: center;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  left: 0;
  pointer-events: none;
  position: fixed;
  right: 0;
  top: 0.9rem;
  z-index: 1200;
}

.toast-container :deep(*) {
  pointer-events: auto;
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--toast-duration) ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform var(--toast-duration) ease;
}
</style>