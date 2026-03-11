<template>
  <article class="article-content" v-html="html" />
</template>

<script setup>
const props = defineProps({
  article: {
    type: Object,
    required: true
  }
})

const html = computed(() => props.article.content || `<p>${props.article.description || ''}</p>`)
</script>

<style scoped>
.article-content { line-height: 1.7; }
.article-content :deep(img) { max-width: 100%; }
</style>
