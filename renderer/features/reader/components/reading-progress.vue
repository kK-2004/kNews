<template>
  <div class="progress-wrap" aria-label="Reading progress">
    <div class="progress-bar" :style="{ width: `${progress}%` }" />
  </div>
</template>

<script setup>
defineProps({
  progress: {
    type: Number,
    default: 0
  }
})
</script>

<style scoped>
.progress-wrap { background: #e4e7ec; border-radius: 999px; height: 0.35rem; width: 100%; }
.progress-bar { background: #0b63ff; border-radius: inherit; height: 100%; transition: width .16s linear; }
</style>
