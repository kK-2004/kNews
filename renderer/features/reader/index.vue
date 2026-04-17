<template>
  <section>
    <h2>阅读器</h2>

    <div class="toolbar">
      <base-button size="sm" variant="secondary" @click="fontSize = Math.max(12, fontSize - 1)">A-</base-button>
      <base-button size="sm" variant="secondary" @click="fontSize = Math.min(24, fontSize + 1)">A+</base-button>
      <base-button size="sm" variant="secondary" @click="toggleTheme">主题：{{ themeLabel }}</base-button>
      <base-button size="sm" @click="toggleBookmark">{{ bookmarked ? '取消收藏' : '收藏' }}</base-button>
      <base-button size="sm" variant="secondary" @click="shareArticle">分享</base-button>
    </div>

    <article-view :article="article" :font-size="fontSize" :progress="progress" />
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
const themeLabel = computed(() => {
  if (ui.theme === 'dark') return '深色'
  if (ui.theme === 'light') return '浅色'
  return '跟随系统'
})

const article = ref({
  id: route.params.id,
  title: '文章',
  author: 'kNews',
  created: new Date().toISOString(),
  description: '阅读内容占位。',
  content: '<p>这里是阅读页内容占位。</p>'
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
