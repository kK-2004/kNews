<template>
  <section class="home-board" @wheel.passive="onHomeWheel">
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="activeTab === 'china'" class="more-filter-bar">
      <base-input v-model="moreKeyword" placeholder="搜索数据源" />
      <el-select
        v-model="moreCategory"
        class="more-category-select"
        placeholder="选择分类"
      >
        <el-option
          v-for="option in categoryOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <base-button variant="secondary" @click="resetMoreFilters">重置</base-button>
    </div>

    <div v-if="loading && !boards.length" class="loading-grid">
      <article v-for="i in 8" :key="`skeleton-${i}`" class="board-skeleton" aria-hidden="true">
        <header class="board-skeleton-head">
          <div class="board-skeleton-brand">
            <base-skeleton class="s-icon" />
            <base-skeleton class="s-title" />
            <base-skeleton class="s-badge" />
          </div>
          <div class="board-skeleton-ops">
            <base-skeleton class="s-op" />
            <base-skeleton class="s-op" />
          </div>
        </header>
        <base-skeleton class="s-updated" />
        <div class="board-skeleton-list">
          <div v-for="j in 7" :key="`skeleton-row-${i}-${j}`" class="board-skeleton-row">
            <base-skeleton class="s-rank" />
            <base-skeleton class="s-line" />
          </div>
        </div>
      </article>
    </div>

    <TransitionGroup
      v-else
      ref="boardGridRef"
      name="board"
      tag="div"
      class="board-grid"
      @scroll.passive="onBoardGridScroll"
    >
      <source-board
        v-for="board in boards"
        :key="board.source.id"
        :source="board.source"
        :items="board.items"
        :updated-time="board.updatedTime"
        :status="board.status"
        :warning="board.warning"
        :accent="board.accent"
        :followed="followedSourceIds.includes(board.source.id)"
        :dragging="dragSourceId === board.source.id"
        :drop-target="dropTargetId === board.source.id"
        @refresh="refreshSource"
        @toggle-follow="toggleFollow"
        @drag-start="onDragStart"
        @drag-over="onDragOver"
        @drop="onDrop"
        @drag-end="onDragEnd"
      />
      <article
        v-for="i in loadMorePlaceholderCount"
        :key="`load-more-skeleton-${i}`"
        class="board-skeleton"
        aria-hidden="true"
      >
        <header class="board-skeleton-head">
          <div class="board-skeleton-brand">
            <base-skeleton class="s-icon" />
            <base-skeleton class="s-title" />
            <base-skeleton class="s-badge" />
          </div>
          <div class="board-skeleton-ops">
            <base-skeleton class="s-op" />
            <base-skeleton class="s-op" />
          </div>
        </header>
        <base-skeleton class="s-updated" />
        <div class="board-skeleton-list">
          <div v-for="j in 7" :key="`load-more-row-${i}-${j}`" class="board-skeleton-row">
            <base-skeleton class="s-rank" />
            <base-skeleton class="s-line" />
          </div>
        </div>
      </article>
    </TransitionGroup>
  </section>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, onServerPrefetch, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDebounceFn } from '@vueuse/core'
import BaseSkeleton from '@/shared/components/base-skeleton.vue'
import BaseButton from '@/shared/components/base-button.vue'
import BaseInput from '@/shared/components/base-input.vue'
import { usePreferencesApi } from '@/shared/composables/usePreferencesApi'
import sourcesMap from '@/shared/data/newsnow-sources.json'
import { getBoardSourceIds } from '@/shared/newsnow/metadata'
import SourceBoard from './components/source-board.vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/use-user-store'
import { useHomeBoardStore } from '@/stores/use-home-board-store'

const loadingMore = ref(false)
const boardGridRef = ref(null)
const dragSourceId = ref('')
const dropTargetId = ref('')
const lastDropSignature = ref('')
const followedSourceIds = ref([])
const orderedSourceIds = ref([])
const preferencesApi = usePreferencesApi()
const userStore = useUserStore()
const homeBoardStore = useHomeBoardStore()
const { boards, allSelectedSources, loading, error, lastBuiltTab } = storeToRefs(homeBoardStore)
const ssrOrigin = inject('ssrOrigin', '')
const route = useRoute()
const activeTab = computed(() => {
  const tab = String(route.query.tab || 'hottest')
  return ['china', 'focus', 'hottest', 'realtime'].includes(tab) ? tab : 'hottest'
})
const localPreferencesKey = 'knews:board-preferences'
const INITIAL_LOAD_SIZE = 8
const LOAD_MORE_SIZE = 4
const LOAD_MORE_PLACEHOLDER_MAX = 4
const moreKeyword = ref('')
const moreCategory = ref('all')
const allEnabledSources = ref([])
const debouncedKeyword = ref('')

const palette = ['#4d6bfe', '#2f9f70', '#d45555', '#c58b2a', '#2f7ecf', '#8a58cc', '#ca5278', '#5595a2']
const preferredSourceIds = computed(() => getBoardSourceIds(sourcesMap, activeTab.value))
const loadMorePlaceholderCount = computed(() => {
  if (!loadingMore.value) return 0
  const remaining = allSelectedSources.value.length - boards.value.length
  if (remaining <= 0) return 0
  return Math.min(remaining, LOAD_MORE_PLACEHOLDER_MAX)
})
const tokenColorMap = {
  red: '#d45555',
  blue: '#4d6bfe',
  green: '#2f9f70',
  gray: '#5c6475',
  orange: '#c58b2a',
  indigo: '#5564d6',
  emerald: '#198f6c',
  teal: '#1f8d8d',
  slate: '#5b6780'
}
const categoryLabelMap = {
  all: '全部分类',
  china: '国内',
  world: '国际',
  tech: '科技',
  finance: '财经',
  focus: '关注',
  realtime: '实时',
  hottest: '最热',
  general: '通用'
}
const normalizeEnabled = (value) => {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true'
  }
  return false
}
const normalizeCategory = (value) => {
  const category = String(value || '').trim()
  return category || 'general'
}
const categoryOptions = computed(() => {
  if (activeTab.value !== 'china') return [{ label: '全部分类', value: 'all' }]
  const set = new Set(['all'])
  for (const source of allEnabledSources.value || []) {
    set.add(normalizeCategory(source.category || source.column))
  }
  return Array.from(set).map((value) => ({
    label: categoryLabelMap[value] || value,
    value
  }))
})
const sortByCategoryThenName = (items) => {
  return [...items].sort((a, b) => {
    const catA = normalizeCategory(a.category || a.column)
    const catB = normalizeCategory(b.category || b.column)
    if (catA !== catB) return catA.localeCompare(catB)
    return String(a.name || a.id).localeCompare(String(b.name || b.id))
  })
}
const resetMoreFilters = () => {
  moreKeyword.value = ''
  debouncedKeyword.value = ''
  moreCategory.value = 'all'
}

const resolveColor = (value, fallback) => {
  if (!value) return fallback
  if (value.startsWith?.('#') || value.startsWith?.('rgb') || value.startsWith?.('hsl')) return value
  return tokenColorMap[value] || fallback
}

const uniqueIds = (value) => [...new Set((Array.isArray(value) ? value : []).map((id) => String(id || '').trim()).filter(Boolean))]
const canUseRemotePreferences = () => Boolean(userStore.authToken)

const readLocalPreferences = () => {
  if (typeof localStorage === 'undefined') return { followedSourceIds: [], orderedSourceIds: [] }
  try {
    const raw = localStorage.getItem(localPreferencesKey)
    if (!raw) return { followedSourceIds: [], orderedSourceIds: [] }
    const parsed = JSON.parse(raw)
    return {
      followedSourceIds: uniqueIds(parsed?.followedSourceIds),
      orderedSourceIds: uniqueIds(parsed?.orderedSourceIds)
    }
  } catch {
    return { followedSourceIds: [], orderedSourceIds: [] }
  }
}

const writeLocalPreferences = (payload) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(localPreferencesKey, JSON.stringify({
    followedSourceIds: uniqueIds(payload?.followedSourceIds),
    orderedSourceIds: uniqueIds(payload?.orderedSourceIds)
  }))
}

const applyPreferences = (payload) => {
  followedSourceIds.value = uniqueIds(payload?.followedSourceIds)
  orderedSourceIds.value = uniqueIds(payload?.orderedSourceIds)
}

const savePreferences = async () => {
  const payload = {
    board: {
      followedSourceIds: followedSourceIds.value,
      orderedSourceIds: orderedSourceIds.value
    }
  }
  writeLocalPreferences(payload.board)
  if (!canUseRemotePreferences()) return
  try {
    await preferencesApi.savePreferences(payload)
  } catch {
    // local fallback already written
  }
}

const loadPreferences = async () => {
  if (canUseRemotePreferences()) {
    try {
      const result = await preferencesApi.getPreferences()
      applyPreferences(result?.preferences?.board || {})
      writeLocalPreferences(result?.preferences?.board || {})
      return
    } catch {
      // fallback to local
    }
  }
  applyPreferences(readLocalPreferences())
}

const applyOrder = (ids) => {
  const sourceIds = uniqueIds(ids)
  const preferred = orderedSourceIds.value.filter((id) => sourceIds.includes(id))
  const tail = sourceIds.filter((id) => !preferred.includes(id))
  return [...preferred, ...tail]
}

const apiUrl = (path) => {
  if (import.meta.env.SSR && ssrOrigin) return `${ssrOrigin}${path}`
  return path
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const requestJsonWithRetry = async (url, { retries = 2, delay = 220 } = {}) => {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) {
        const retryable = response.status >= 500 || response.status === 429
        if (retryable && attempt < retries) {
          await sleep(delay * (attempt + 1))
          continue
        }
        throw new Error(`Request failed: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await sleep(delay * (attempt + 1))
      }
    }
  }
  throw lastError || new Error('Request failed')
}

const fetchSourcesList = async () => {
  try {
    const data = await window.api.sources.list()
    if (data?.error) throw new Error(data.error)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

const fetchSourceItems = async (id, { latest = false } = {}) => {
  try {
    const data = await window.api.feeds.getBySource(id)
    if (data?.error) throw new Error(data.error)
    const items = Array.isArray(data) ? data : (data?.items || [])
    return {
      source: { id },
      items,
      warning: '',
      status: 'success',
      updatedTime: Date.now()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed'
    return { source: { id }, items: [], warning: message, status: 'error', updatedTime: 0 }
  }
}

const toBoard = (source, idx, result) => ({
  source: {
    ...source,
    title: activeTab.value === 'china'
      ? (categoryLabelMap[normalizeCategory(source.category || source.column)] || normalizeCategory(source.category || source.column))
      : (source.title || sourcesMap?.[source.id]?.title || ''),
    home: source.home || sourcesMap?.[source.id]?.home || '',
    color: resolveColor(source.color || sourcesMap?.[source.id]?.color, palette[idx % palette.length])
  },
  items: result?.status === 'fulfilled' ? (result.value.items || []) : [],
  updatedTime: result?.status === 'fulfilled' ? (result.value.updatedTime || 0) : 0,
  status: result?.status === 'fulfilled' ? (result.value.status || 'success') : 'error',
  warning: result?.status === 'fulfilled' ? (result.value.warning || '') : 'fetch failed',
  accent: resolveColor(source.color || sourcesMap?.[source.id]?.color, palette[idx % palette.length])
})

const appendBoards = async ({ latest = false, count = LOAD_MORE_SIZE } = {}) => {
  const start = boards.value.length
  const end = Math.min(start + count, allSelectedSources.value.length)
  if (end <= start) return false

  const chunk = allSelectedSources.value.slice(start, end)
  const results = await Promise.allSettled(chunk.map((source) => fetchSourceItems(source.id, { latest })))
  const appended = chunk.map((source, offset) => toBoard(source, start + offset, results[offset]))
  homeBoardStore.setBoards([...boards.value, ...appended])
  return true
}

const patchBoardsFromResponses = (responses = []) => {
  const responseMap = new Map(
    responses
      .filter((result) => result?.status === 'fulfilled' && result.value?.id)
      .map((result) => [result.value.id, result.value])
  )

  homeBoardStore.setBoards(boards.value.map((board) => {
    const next = responseMap.get(board.source.id)
    if (!next) return board
    return {
      ...board,
      items: next.items || board.items,
      updatedTime: next.updatedTime || board.updatedTime,
      status: next.status || board.status,
      warning: next.warning || ''
    }
  }))
}

const silentRefreshLoadedBoards = async () => {
  if (!boards.value.length) return
  const ids = boards.value.map((board) => board.source.id)
  const refreshed = await Promise.allSettled(ids.map((id) => fetchSourceItems(id, { latest: true })))
  patchBoardsFromResponses(refreshed)
}

const buildBoards = async ({ runSilentRefresh = true } = {}) => {
  homeBoardStore.setLoading(true)
  homeBoardStore.setError('')
  try {
    const sources = await fetchSourcesList()
    const enabled = (sources || []).filter((s) => normalizeEnabled(s.enabled))
    const map = Object.fromEntries(enabled.map((item) => [item.id, item]))
    let selected = []
    if (activeTab.value === 'china') {
      allEnabledSources.value = enabled
    } else {
      allEnabledSources.value = []
    }
    if (activeTab.value === 'focus') {
      const selectedIds = applyOrder(followedSourceIds.value)
      selected = selectedIds.map((id) => map[id]).filter(Boolean)
    } else if (activeTab.value === 'china') {
      const keyword = String(debouncedKeyword.value || '').trim().toLowerCase()
      const category = String(moreCategory.value || 'all')
      selected = enabled.filter((item) => {
        const sourceCategory = normalizeCategory(item.category || item.column)
        const matchCategory = category === 'all' || sourceCategory === category
        const matchKeyword = !keyword
          || String(item.name || '').toLowerCase().includes(keyword)
          || String(item.id || '').toLowerCase().includes(keyword)
        return matchCategory && matchKeyword
      })
      selected = sortByCategoryThenName(selected)
    } else {
      const selectedIds = applyOrder(preferredSourceIds.value)
      selected = selectedIds.map((id) => map[id]).filter(Boolean)
    }
    homeBoardStore.setAllSelectedSources(selected)
    homeBoardStore.setBoards([])
    if (allSelectedSources.value.length) {
      await appendBoards({ latest: false, count: INITIAL_LOAD_SIZE })
      // In Electron mode, ScraperEngine handles periodic refresh; skip silent refresh to avoid flickering
    }
    homeBoardStore.setLastBuiltTab(activeTab.value)
  } catch (err) {
    homeBoardStore.setError(err instanceof Error ? err.message : 'Failed to load source boards')
  } finally {
    homeBoardStore.setLoading(false)
  }
}

const refreshSource = async (id) => {
  const targetIndex = boards.value.findIndex((b) => b.source.id === id)
  if (targetIndex < 0) return
  try {
    const result = await fetchSourceItems(id, { latest: true })
    const nextBoards = [...boards.value]
    nextBoards[targetIndex] = {
      ...boards.value[targetIndex],
      items: result.items || [],
      updatedTime: result.updatedTime || 0,
      status: result.status || 'success',
      warning: result.warning || ''
    }
    homeBoardStore.setBoards(nextBoards)
  } catch {
    // keep old items
  }
}

const refreshAll = async () => {
  if (!boards.value.length) {
    await buildBoards()
    return
  }

  homeBoardStore.setLoading(true)
  try {
    const refreshed = await Promise.allSettled(
      boards.value.map((b) => fetchSourceItems(b.source.id, { latest: true }))
    )
    patchBoardsFromResponses(refreshed)
  } finally {
    homeBoardStore.setLoading(false)
  }
}
const onGlobalRefresh = async () => {
  homeBoardStore.setLoading(true)
  try {
    await window.api.scraper.refreshAll()
    await refreshAll()
  } finally {
    homeBoardStore.setLoading(false)
  }
}

const moveRelative = (ids, fromId, targetId, placeAfter = false) => {
  const list = [...ids]
  const fromIndex = list.indexOf(fromId)
  if (fromIndex < 0) return list
  const [moved] = list.splice(fromIndex, 1)
  let insertIndex = list.indexOf(targetId)
  if (insertIndex < 0) return ids
  if (placeAfter) insertIndex += 1
  list.splice(insertIndex, 0, moved)
  return list
}

const toggleFollow = async (id) => {
  if (!id) return
  if (followedSourceIds.value.includes(id)) {
    followedSourceIds.value = followedSourceIds.value.filter((item) => item !== id)
  } else {
    followedSourceIds.value = [...followedSourceIds.value, id]
  }
  await savePreferences()
  if (activeTab.value === 'focus') await buildBoards()
}

const onDragStart = (id) => {
  dragSourceId.value = id
  dropTargetId.value = ''
  lastDropSignature.value = ''
}

const getBoardGridElement = () => {
  const raw = boardGridRef.value
  if (!raw) return null
  return raw.$el || raw
}

const onBoardGridScroll = async (event) => {
  if (loading.value || loadingMore.value) return
  if (boards.value.length >= allSelectedSources.value.length) return
  const element = event?.target || getBoardGridElement()
  if (!element) return

  const threshold = 140
  const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - threshold
  if (!nearBottom) return

  loadingMore.value = true
  try {
    await appendBoards({ latest: false, count: LOAD_MORE_SIZE })
  } finally {
    loadingMore.value = false
  }

  // After appending, if the viewport is still near bottom, continue loading
  // without requiring an extra "scroll up then down" user action.
  if (boards.value.length < allSelectedSources.value.length) {
    // Wait for DOM to update before checking scroll height
    await nextTick()

    // Use requestAnimationFrame to ensure browser has completed the layout paint
    requestAnimationFrame(() => {
      const stillNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - threshold
      if (stillNearBottom) {
        // Check again to prevent race conditions
        if (!loadingMore.value && boards.value.length < allSelectedSources.value.length) {
          void onBoardGridScroll({ target: element })
        }
      }
    })
  }
}

const onHomeWheel = (event) => {
  const grid = getBoardGridElement()
  if (!grid) return
  const target = event?.target
  if (target && grid.contains(target)) return
  grid.scrollTop += Number(event?.deltaY || 0)
}

const onDragOver = (payload) => {
  const id = payload?.id
  const fromId = dragSourceId.value
  if (!id || !fromId || id === fromId) return

  const rx = Number(payload?.rx)
  const ry = Number(payload?.ry)
  const hasRatios = Number.isFinite(rx) && Number.isFinite(ry)
  if (hasRatios && rx > 0.42 && rx < 0.58 && ry > 0.42 && ry < 0.58) return

  const placeAfter = hasRatios && (rx >= 0.58 || ry >= 0.58)
  const signature = `${id}:${placeAfter ? 'after' : 'before'}`
  if (signature === lastDropSignature.value) return

  const currentIds = boards.value.map((board) => board.source.id)
  const reorderedIds = moveRelative(currentIds, fromId, id, placeAfter)
  if (reorderedIds.join('|') === currentIds.join('|')) return

  dropTargetId.value = id
  const boardMap = new Map(boards.value.map((board) => [board.source.id, board]))
  homeBoardStore.setBoards(reorderedIds.map((sourceId) => boardMap.get(sourceId)).filter(Boolean))
  const allIds = allSelectedSources.value.map((source) => source.id)
  const reorderedAllIds = moveRelative(allIds, fromId, id, placeAfter)
  const sourceMap = new Map(allSelectedSources.value.map((source) => [source.id, source]))
  homeBoardStore.setAllSelectedSources(reorderedAllIds.map((sourceId) => sourceMap.get(sourceId)).filter(Boolean))
  lastDropSignature.value = signature
}

const onDrop = async () => {
  const fromId = dragSourceId.value
  dragSourceId.value = ''
  dropTargetId.value = ''
  lastDropSignature.value = ''
  if (!fromId) return

  const currentIds = allSelectedSources.value.map((source) => source.id)
  const rest = orderedSourceIds.value.filter((id) => !currentIds.includes(id))
  orderedSourceIds.value = uniqueIds([...currentIds, ...rest])
  await savePreferences()
}

const onDragEnd = () => {
  dragSourceId.value = ''
  dropTargetId.value = ''
  lastDropSignature.value = ''
}

watch(activeTab, () => {
  if (activeTab.value !== 'china') {
    resetMoreFilters()
  } else {
    debouncedKeyword.value = String(moreKeyword.value || '')
  }
  buildBoards()
})

watch(moreCategory, () => {
  if (activeTab.value !== 'china') return
  buildBoards()
})

const debouncedUpdateKeyword = useDebounceFn(() => {
  debouncedKeyword.value = String(moreKeyword.value || '')
  if (activeTab.value !== 'china') return
  buildBoards()
}, 220)

watch(moreKeyword, () => {
  debouncedUpdateKeyword()
})

watch(() => userStore.authToken, async () => {
  await loadPreferences()
  await buildBoards()
})

onMounted(() => {
  window.addEventListener('knews:refresh-feed', onGlobalRefresh)
  loadPreferences().then(async () => {
    const hasHydratedBoards = boards.value.length > 0 && lastBuiltTab.value === activeTab.value
    const hasLocalOverrides = orderedSourceIds.value.length > 0
    if (!hasHydratedBoards || hasLocalOverrides || activeTab.value === 'focus') {
      await buildBoards()
      return
    }
    void silentRefreshLoadedBoards()
  })
})

onUnmounted(() => {
  window.removeEventListener('knews:refresh-feed', onGlobalRefresh)
})

onServerPrefetch(async () => {
  if (!boards.value.length || lastBuiltTab.value !== activeTab.value) {
    await buildBoards({ runSilentRefresh: false })
  }
})
</script>

<style scoped>
.home-board {
  display: grid;
  gap: 0.95rem;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  padding-left: 20px;
  padding-right: 20px;
}

.more-filter-bar {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  border-radius: 0.85rem;
  display: flex;
  gap: 0.75rem;
  padding: 0.65rem;
}

.more-filter-bar :deep(.field) {
  display: block;
  flex: 1 1 auto;
  margin: 0;
}

.more-filter-bar :deep(.label) {
  display: none;
}

.more-filter-bar :deep(.input),
.more-filter-bar :deep(select) {
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: none !important;
  border-radius: 0.6rem;
  box-shadow: none !important;
  color: var(--text);
  min-height: 2.25rem;
}

.more-filter-bar :deep(.input::placeholder) {
  color: color-mix(in srgb, var(--muted) 88%, var(--text));
}

.more-filter-bar :deep(.input:focus),
.more-filter-bar :deep(select:focus) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #0b63ff 36%, transparent);
  outline: none;
}

.more-filter-bar :deep(button) {
  border: none;
  box-shadow: none;
  min-height: 2.25rem;
}

.more-filter-bar :deep(.more-category-select) {
  flex: 0 0 12rem;
}

@media (max-width: 768px) {
  .more-filter-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .more-filter-bar :deep(.more-category-select) {
    flex: 1 1 auto;
  }
}
.board-grid {
  display: grid;
  flex: 1 1 auto;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(31rem, 31rem);
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
  -ms-overflow-style: none;
  scrollbar-width: none;
  width: 100%;
}

.board-grid::-webkit-scrollbar {
  display: none;
}

.board-move {
  transition: transform 0.16s ease;
}
@media (min-width: 900px) {
  .board-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .board-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.loading-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(31rem, 31rem);
  height: 100%;
  min-height: 0;
  overflow: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.loading-grid::-webkit-scrollbar {
  display: none;
}

@media (min-width: 900px) {
  .loading-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .loading-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.board-skeleton {
  border: 1px solid var(--border);
  border-radius: 1.1rem;
  display: grid;
  gap: 0.8rem;
  height: 31rem;
  max-height: 31rem;
  padding: 0.85rem;
}

.board-skeleton-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.board-skeleton-brand {
  align-items: center;
  display: inline-flex;
  gap: 0.45rem;
}

.board-skeleton-ops {
  align-items: center;
  display: inline-flex;
  gap: 0.45rem;
}

.board-skeleton-list {
  display: grid;
  gap: 0.45rem;
  overflow: hidden;
}

.board-skeleton-row {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.65rem;
  display: grid;
  gap: 0.45rem;
  grid-template-columns: 1.65rem minmax(0, 1fr);
  min-height: 3rem;
  padding: 0.38rem 0.5rem;
}

.s-icon { border-radius: 999px; height: 2rem; width: 2rem; }
.s-title { height: 1.45rem; width: 7.5rem; }
.s-badge { height: 1rem; width: 3.25rem; }
.s-op { border-radius: 999px; height: 1.8rem; width: 1.8rem; }
.s-updated { height: 0.9rem; width: 5.4rem; }
.s-rank { border-radius: 0.5rem; height: 2rem; width: 1.65rem; }
.s-line { height: 1.2rem; width: 100%; }
.error { color: #d92d20; }
</style>
