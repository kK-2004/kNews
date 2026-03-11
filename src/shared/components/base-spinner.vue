<template>
  <svg class="spinner" viewBox="0 0 50 50" role="status" aria-label="Loading">
    <circle cx="25" cy="25" r="20" fill="none" stroke-width="4" />
  </svg>
</template>

<script setup>
</script>

<style scoped>
.spinner { animation: spin 0.8s linear infinite; height: 1.25rem; width: 1.25rem; }
.spinner circle { stroke: #0b63ff; stroke-linecap: round; stroke-dasharray: 90, 150; stroke-dashoffset: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
