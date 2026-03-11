<template>
  <label class="field">
    <span v-if="label" class="label">{{ label }}</span>
    <input
      :value="modelValue"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
      :disabled="disabled"
      :placeholder="placeholder"
      class="input"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <small v-if="error" :id="`${id}-error`" class="error" aria-live="polite">{{ error }}</small>
  </label>
</template>

<script setup>
defineEmits(['update:modelValue'])

const props = defineProps({
  id: {
    type: String,
    default: 'base-input'
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const { id } = props
</script>

<style scoped>
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.label { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.input {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.55rem 0.7rem;
  outline: none;
  background: var(--surface);
  color: var(--text);
}
.input:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, #0b63ff 30%, transparent);
  border-color: #0b63ff;
}
.input::placeholder {
  color: var(--muted);
}
.error { color: #d92d20; font-size: 0.75rem; }
</style>
