<template>
  <base-card>
    <template #header>
      <h3>{{ article.title }}</h3>
    </template>
    <img
      v-if="article.image || article.thumbnail"
      :src="article.image || article.thumbnail"
      :alt="article.title || '文章配图'"
      class="thumb"
      loading="lazy"
      decoding="async"
    />
    <p class="meta">{{ article.pubDate || article.created || '未知时间' }}</p>
    <p>{{ article.description || article.summary || '' }}</p>
    <template #footer>
      <a :href="article.url" target="_blank" rel="noreferrer">打开原文</a>
    </template>
  </base-card>
</template>

<script setup>
import BaseCard from '@/shared/components/base-card.vue'

defineProps({
  article: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.meta { color: var(--muted); font-size: 0.8rem; }
.thumb { border-radius: 0.5rem; max-width: 100%; min-height: 8rem; object-fit: cover; width: 100%; }
</style>
