<template>
  <section>
    <h2>Reader</h2>

    <div class="toolbar">
      <base-button size="sm" variant="secondary" @click="fontSize = Math.max(12, fontSize - 1)">A-</base-button>
      <base-button size="sm" variant="secondary" @click="fontSize = Math.min(24, fontSize + 1)">A+</base-button>
      <base-button size="sm" variant="secondary" @click="toggleTheme">Theme: {{ ui.theme }}</base-button>
      <base-button size="sm" @click="toggleBookmark">{{ bookmarked ? 'Unbookmark' : 'Bookmark' }}</base-button>
      <base-button size="sm" variant="secondary" @click="shareArticle">Share</base-button>
    </div>

    <article-view :article="article" :font-size="fontSize" :progress="progress" />
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '@/shared/components/base-button.vue'
import { useUserActionsApi } from '@/shared/composables/useUserActionsApi'
import { useUiStore } from '@/stores/use-ui-store'
import ArticleView from './components/article-view.vue'

const route = useRoute()
const ui = useUiStore()
const userApi = useUserActionsApi()
const fontSize = ref(16)
const progress = ref(0)
const bookmarked = ref(false)

const article = ref({
  id: route.params.id,
  title: 'Article',
  author: 'kNews',
  created: new Date().toISOString(),
  description: 'Reader placeholder content.',
  content: '<p>This is the reader content placeholder.</p>'
})

const onScroll = () => {
  const total = document.documentElement.scrollHeight - window.innerHeight
  progress.value = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0
}

const toggleTheme = () => {
  const next = ui.theme === 'dark' ? 'light' : 'dark'
  ui.setTheme(next)
}

const toggleBookmark = async () => {
  bookmarked.value = !bookmarked.value
  await userApi.bookmark(article.value.id, bookmarked.value)
}

const shareArticle = async () => {
  await userApi.share(article.value.id, 'copy-link')
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
</style>
