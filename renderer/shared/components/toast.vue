<template>
  <article class="toast" :class="`toast-${toast.type || 'info'}`">
    <div class="inner">
      <span v-if="toast.type === 'success'" class="icon i-tabler-circle-check-filled" aria-hidden="true" />
      <span v-else-if="toast.type === 'error'" class="icon i-tabler-alert-circle-filled" aria-hidden="true" />
      <span v-else-if="toast.type === 'warning'" class="icon i-tabler-alert-triangle-filled" aria-hidden="true" />
      <span v-else class="icon i-tabler-info-circle-filled" aria-hidden="true" />

      <p class="message">{{ toast.message }}</p>

      <div class="actions">
        <button v-if="toast.action" class="action-btn" type="button" @click="runAction">{{ toast.action.label }}</button>
        <button class="dismiss-btn i-tabler-x" type="button" aria-label="Dismiss" @click="$emit('dismiss', toast.id)" />
      </div>
    </div>
  </article>
</template>

<script setup>
const emit = defineEmits(['dismiss'])

const props = defineProps({
  toast: {
    type: Object,
    required: true
  }
})

const runAction = () => {
  props.toast.action?.handler?.()
  emit('dismiss', props.toast.id)
}
</script>

<style scoped>
.toast {
  animation: slide-in .2s ease;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid var(--border);
  border-radius: 0.7rem;
  box-shadow: 0 10px 28px rgb(0 0 0 / 18%);
  overflow: hidden;
}

.inner {
  align-items: center;
  backdrop-filter: blur(8px);
  display: grid;
  gap: 0.5rem;
  grid-template-columns: auto 1fr auto;
  min-height: 2.5rem;
  padding: 0.5rem 0.55rem;
}

.message {
  font-size: 0.9rem;
  line-height: 1.35;
  margin: 0;
}

.icon {
  font-size: 1.02rem;
}

.actions {
  align-items: center;
  display: inline-flex;
  gap: 0.3rem;
}

.action-btn,
.dismiss-btn {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  border-radius: 0.5rem;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  justify-content: center;
  min-height: 1.7rem;
}

.action-btn {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0 0.45rem;
}

.dismiss-btn {
  font-size: 0.84rem;
  width: 1.7rem;
}

.toast-success .inner {
  background: color-mix(in srgb, #12b76a 20%, transparent);
}
.toast-success .icon { color: #12b76a; }

.toast-error .inner {
  background: color-mix(in srgb, #f04438 20%, transparent);
}
.toast-error .icon { color: #f04438; }

.toast-warning .inner {
  background: color-mix(in srgb, #f79009 20%, transparent);
}
.toast-warning .icon { color: #f79009; }

.toast-info .inner {
  background: color-mix(in srgb, #2e90fa 18%, transparent);
}
.toast-info .icon { color: #2e90fa; }

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
