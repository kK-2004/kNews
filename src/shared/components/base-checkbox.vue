<template>
  <label class="checkbox-wrap">
    <input :checked="modelValue" type="checkbox" @change="$emit('update:modelValue', $event.target.checked)" />
    <span>{{ label }}</span>
  </label>
</template>

<script setup>
defineEmits(['update:modelValue'])

defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' }
})
</script>

<style scoped>
.checkbox-wrap { align-items: center; display: inline-flex; gap: .45rem; }
</style>
