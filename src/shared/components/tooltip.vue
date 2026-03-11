<template>
  <span class="tooltip-wrap" @mouseenter="visible = true" @mouseleave="visible = false" @focusin="visible = true" @focusout="visible = false">
    <slot />
    <span v-if="visible" class="tooltip" role="tooltip">{{ text }}</span>
  </span>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  text: {
    type: String,
    required: true
  }
})

const visible = ref(false)
</script>

<style scoped>
.tooltip-wrap { display: inline-flex; position: relative; }
.tooltip { background: #101828; border-radius: 0.375rem; color: #fff; font-size: 0.75rem; left: 50%; max-width: 14rem; padding: 0.35rem 0.5rem; position: absolute; top: calc(100% + 0.35rem); transform: translateX(-50%); }
</style>
