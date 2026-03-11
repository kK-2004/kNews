<template>
  <div class="dropdown">
    <button :aria-expanded="open" aria-haspopup="listbox" type="button" @click="open = !open">
      {{ selectedLabel }}
    </button>
    <ul v-if="open" class="menu" role="listbox">
      <li v-for="option in options" :key="option.value">
        <button type="button" @click="onSelect(option.value)">{{ option.label }}</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const emit = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Select an option'
  }
})

const open = ref(false)
const selectedLabel = computed(() => props.options.find((item) => item.value === props.modelValue)?.label || props.placeholder)

const onSelect = (value) => {
  emit('update:modelValue', value)
  open.value = false
}
</script>

<style scoped>
.dropdown { position: relative; }
.menu { background: var(--surface); border: 1px solid var(--border); border-radius: 0.5rem; list-style: none; margin: 0.25rem 0 0; padding: 0.3rem; position: absolute; width: 100%; }
.menu button { background: transparent; border: 0; cursor: pointer; padding: 0.45rem 0.55rem; text-align: left; width: 100%; }
</style>
