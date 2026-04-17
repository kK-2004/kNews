<template>
  <label class="field">
    <span v-if="label" class="label">{{ label }}</span>
    <textarea
      :value="modelValue"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
      :disabled="disabled"
      :placeholder="placeholder"
      class="textarea"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <small v-if="error" :id="`${id}-error`" class="error" aria-live="polite">{{ error }}</small>
  </label>
</template>

<script setup>
defineEmits(['update:modelValue'])

defineProps({
  id: { type: String, default: 'base-textarea' },
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})
</script>

<style scoped>
.field { display: flex; flex-direction: column; gap: .3rem; }
.textarea { border: 1px solid var(--border); border-radius: .5rem; min-height: 6rem; padding: .55rem .7rem; }
.error { color: var(--error); font-size: .75rem; }
</style>
