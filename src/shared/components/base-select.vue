<template>
  <label class="field">
    <span v-if="label" class="label">{{ label }}</span>
    <el-select
      class="select"
      :model-value="modelValue"
      :placeholder="placeholder || label || '请选择'"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-option
        v-for="option in options"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>
  </label>
</template>

<script setup>
defineEmits(['update:modelValue'])

defineProps({
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: '' },
  options: { type: Array, default: () => [] }
})
</script>

<style scoped>
.field { display: flex; flex-direction: column; gap: .3rem; }
.label { font-size: 0.85rem; font-weight: 600; }
.select {
  width: 100%;
}
</style>
