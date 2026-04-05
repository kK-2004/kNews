<template>
  <header class="article-header">
    <h2>{{ article.title }}</h2>
    <p class="meta">{{ article.author || 'Unknown author' }} · {{ article.created || '' }}</p>
  </header>
</template>

<script setup>
defineProps({
  article: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.meta { color: var(--muted); font-size: 0.85rem; }
</style>
