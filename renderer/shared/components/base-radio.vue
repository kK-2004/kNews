<template>
  <fieldset class="radio-group">
    <legend v-if="label">{{ label }}</legend>
    <label v-for="option in options" :key="option.value" class="radio-item">
      <input
        type="radio"
        :name="name"
        :value="option.value"
        :checked="modelValue === option.value"
        @change="$emit('update:modelValue', option.value)"
      />
      <span>{{ option.label }}</span>
    </label>
  </fieldset>
</template>

<script setup>
defineEmits(['update:modelValue'])

defineProps({
  name: { type: String, required: true },
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }
})
</script>

<style scoped>
.radio-group { border: 0; margin: 0; padding: 0; }
.radio-item { align-items: center; display: flex; gap: .45rem; margin-bottom: .4rem; }
</style>
