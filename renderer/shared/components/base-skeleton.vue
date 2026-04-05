<template>
  <div class="skeleton" :aria-busy="true" aria-label="Loading content" />
</template>

<script setup>
</script>

<style scoped>
.skeleton {
  animation: shimmer 1.4s linear infinite;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--muted) 20%, transparent) 25%,
    color-mix(in srgb, var(--muted) 35%, transparent) 35%,
    color-mix(in srgb, var(--muted) 20%, transparent) 55%
  );
  background-size: 200% 100%;
  border-radius: 0.5rem;
  min-height: 1.25rem;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
