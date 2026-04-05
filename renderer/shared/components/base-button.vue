<template>
  <button
    class="base-button"
    :class="[`variant-${variant}`, `size-${size}`]"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
defineEmits(['click'])

defineProps({
  variant: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'md'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'button'
  }
})
</script>

<style scoped>
.base-button { border: 1px solid var(--border); border-radius: 0.5rem; cursor: pointer; font-weight: 600; outline: none; }
.size-sm { font-size: 0.75rem; padding: 0.35rem 0.65rem; }
.size-md { font-size: 0.875rem; padding: 0.55rem 0.85rem; }
.size-lg { font-size: 1rem; padding: 0.7rem 1.1rem; }
.variant-primary { background: #0b63ff; border-color: #0b63ff; color: #fff; }
.variant-secondary { background: var(--surface); color: var(--text); }
.variant-danger { background: #d92d20; border-color: #d92d20; color: #fff; }
.base-button:disabled { cursor: not-allowed; opacity: 0.6; }
.base-button:focus { outline: none; box-shadow: none; }

/* Theme-aware hover states */
.variant-secondary:hover {
  background: color-mix(in srgb, var(--muted) 12%, var(--surface));
}
</style>
