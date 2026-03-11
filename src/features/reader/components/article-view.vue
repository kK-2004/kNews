<template>
  <section class="article-view">
    <article-header :article="article" />
    <reading-progress :progress="progress" />
    <article-content :article="article" :style="{ fontSize: `${fontSize}px` }" />
  </section>
</template>

<script setup>
import ArticleContent from './article-content.vue'
import ArticleHeader from './article-header.vue'
import ReadingProgress from './reading-progress.vue'

defineProps({
  article: {
    type: Object,
    required: true
  },
  progress: {
    type: Number,
    default: 0
  },
  fontSize: {
    type: Number,
    default: 16
  }
})
</script>

<style scoped>
.article-view { display: grid; gap: 1rem; }
</style>
