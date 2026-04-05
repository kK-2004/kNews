<template>
  <article
    class="source-board"
    :class="{ dragging, 'drop-target': dropTarget }"
    :style="{ '--board-accent': accent }"
    draggable="true"
    @dragstart="onDragStart"
    @dragenter.prevent="onDragOver"
    @dragover.prevent="onDragOver"
    @dragend="onDragEnd"
    @drop.prevent="onDrop"
  >
    <header class="board-header">
      <div class="left">
        <div class="brand">
          <img class="icon" :src="resolvedIconUrl" :alt="`${source.name} icon`" @error="onIconError" />
          <a class="title-link" :href="source.home || '#'" target="_blank" rel="noreferrer"><h3>{{ source.name }}</h3></a>
          <span v-if="source.title" class="badge">{{ source.title }}</span>
        </div>
        <small class="updated">{{ updatedLabel }}</small>
      </div>
      <div class="ops">
        <button class="icon-btn" type="button" aria-label="Refresh source" @click.stop="$emit('refresh', source.id)">
          <span class="btn-icon i-tabler-refresh" aria-hidden="true" />
        </button>
        <button class="icon-btn" :class="{ active: followed }" type="button" aria-label="Toggle follow" @click.stop="$emit('toggle-follow', source.id)">
          <span v-if="followed" class="btn-icon i-tabler-star-filled" aria-hidden="true" />
          <span v-else class="btn-icon i-tabler-star" aria-hidden="true" />
        </button>
      </div>
    </header>

    <ol class="news-list">
      <li v-for="(item, idx) in items" :key="item.id || item.url || `${source.id}-${idx}`" class="news-item">
        <span class="idx">{{ idx + 1 }}</span>
        <a class="headline" :href="item.url" target="_blank" rel="noreferrer">
          <span class="title">{{ item.title }}</span>
          <span
            v-if="item.extra?.diff"
            class="diff"
            :class="{ up: item.extra.diff > 0, down: item.extra.diff < 0 }"
          >{{ formatDiff(item.extra.diff) }}</span>
          <span v-if="showHeat(item.extra?.info)" class="heat">{{ item.extra.info }}</span>
          <img v-if="item.extra?.icon" class="title-flag" :src="item.extra.icon" alt="" referrerpolicy="no-referrer" />
        </a>
      </li>
    </ol>
    <p v-if="warning" class="warning">{{ warning }}</p>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  source: {
    type: Object,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  updatedTime: {
    type: [Number, String],
    default: 0
  },
  status: {
    type: String,
    default: 'success'
  },
  warning: {
    type: String,
    default: ''
  },
  accent: {
    type: String,
    default: '#4b74ff'
  },
  followed: {
    type: Boolean,
    default: false
  },
  dragging: {
    type: Boolean,
    default: false
  },
  dropTarget: {
    type: Boolean,
    default: false
  }
})

const iconUrl = `./icons/${String(props.source?.id || '').split('-')[0]}.png`
let resolvedIconUrl = iconUrl
const onIconError = (event) => {
  event.target.src = './icons/default.png'
}

const updatedLabel = computed(() => {
  if (props.status === 'error') return '获取失败'
  const ts = Number(props.updatedTime || 0)
  if (!ts) return '加载中...'
  const diff = Date.now() - ts
  if (diff < 60 * 1000) return '刚刚更新'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前更新`
  return `${Math.floor(diff / 3600000)}小时前更新`
})

const showHeat = (value) => typeof value === 'string' && value.includes('万')
const formatDiff = (value) => (value > 0 ? `+${value}` : String(value))

const emit = defineEmits(['refresh', 'toggle-follow', 'drag-start', 'drag-over', 'drop', 'drag-end'])

const dragPayload = (event) => {
  const rect = event?.currentTarget?.getBoundingClientRect?.()
  if (!rect || !rect.width || !rect.height) {
    return { id: props.source.id }
  }
  return {
    id: props.source.id,
    rx: (event.clientX - rect.left) / rect.width,
    ry: (event.clientY - rect.top) / rect.height
  }
}

const onDragStart = (event) => {
  event.dataTransfer?.setData('text/plain', String(props.source.id || ''))
  event.dataTransfer?.setDragImage?.(event.currentTarget, 24, 24)
  emit('drag-start', props.source.id)
}

const onDragOver = (event) => {
  emit('drag-over', dragPayload(event))
}

const onDrop = () => {
  emit('drop', props.source.id)
}

const onDragEnd = () => {
  emit('drag-end')
}
</script>

<style scoped>
.source-board {
  backdrop-filter: blur(8px);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--board-accent) 16%, var(--surface)), color-mix(in srgb, var(--board-accent) 8%, var(--surface)));
  border: 1px solid color-mix(in srgb, var(--board-accent) 48%, var(--border));
  border-radius: 1.1rem;
  box-shadow:
    0 8px 24px color-mix(in srgb, var(--board-accent) 20%, transparent),
    inset 0 1px 0 color-mix(in srgb, #ffffff 26%, transparent);
  display: grid;
  gap: 0.8rem;
  height: 31rem;
  max-height: 31rem;
  padding: 0.85rem;
  position: relative;
}

.source-board.dragging {
  opacity: 0.45;
}

.source-board.drop-target {
  outline: 2px dashed color-mix(in srgb, var(--board-accent) 74%, #ffffff);
  outline-offset: -6px;
}

.source-board::after {
  border-radius: 1.1rem;
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 12%, transparent);
}

.board-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.brand {
  align-items: center;
  display: flex;
  gap: 0.45rem;
}

.brand h3 {
  font-size: 1.85rem;
  line-height: 1;
  margin: 0;
}

.title-link {
  color: inherit;
  text-decoration: none;
  transform: translateY(6px);
}

.icon {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  border-radius: 999px;
  display: inline-block;
  height: 2rem;
  width: 2rem;
}

.badge {
  background: color-mix(in srgb, var(--board-accent) 34%, var(--surface));
  border-radius: 0.4rem;
  font-size: 0.82rem;
  padding: 0.12rem 0.42rem;
}

.updated {
  color: var(--muted);
  font-size: 0.82rem;
}

.ops {
  align-items: center;
  display: flex;
  gap: 0.45rem;
}

.icon-btn {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--board-accent) 28%, var(--border));
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.9rem;
  height: 1.8rem;
  justify-content: center;
  min-height: 1.8rem;
  transition: transform 0.14s ease, border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, color 0.16s ease;
  width: 1.8rem;
}

.icon-btn:hover {
  background: color-mix(in srgb, var(--board-accent) 20%, var(--surface));
  border-color: color-mix(in srgb, var(--board-accent) 60%, var(--border));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--board-accent) 16%, transparent);
}

.icon-btn:active {
  transform: translateY(1px) scale(0.97);
}

.icon-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--board-accent) 75%, #ffffff);
  outline-offset: 1px;
}

.icon-btn.active {
  background: color-mix(in srgb, var(--board-accent) 28%, var(--surface));
  border-color: color-mix(in srgb, var(--board-accent) 70%, var(--border));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--board-accent) 20%, transparent);
}

.btn-icon {
  color: var(--muted);
  display: inline-block;
  font-size: 0.95rem;
  height: 0.95rem;
  width: 0.95rem;
  transition: color 0.16s ease;
}

.icon-btn:hover .btn-icon {
  color: var(--text);
}

.icon-btn.active .btn-icon {
  color: color-mix(in srgb, var(--board-accent) 85%, var(--text));
}

.news-list {
  display: grid;
  gap: 0.45rem;
  list-style: none;
  margin: 0;
  overflow: auto;
  padding: 0;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.news-list::-webkit-scrollbar {
  display: none;
}

.news-item {
  align-items: stretch;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--board-accent) 16%, var(--border));
  border-radius: 0.65rem;
  display: grid;
  gap: 0.45rem;
  grid-template-columns: 1.65rem minmax(0, 1fr);
  overflow: visible;
  padding: 0.38rem 0.5rem;
}

.idx {
  align-self: stretch;
  align-items: center;
  background: color-mix(in srgb, var(--board-accent) 30%, var(--surface));
  border-radius: 0.5rem;
  display: flex;
  font-size: 0.78rem;
  font-weight: 500;
  justify-content: center;
  line-height: 1.2;
  width: 1.65rem;
}

.headline {
  align-items: center;
  color: inherit;
  display: flex;
  flex-wrap: wrap;
  gap: 0.08rem 0.35rem;
  line-height: 1.4;
  min-height: 0 !important;
  min-width: 0;
  padding: 0;
  text-decoration: none;
}

.title {
  display: flex;
  align-items: center;
  min-height: 1.5rem;
  font-size: 0.8rem;
  font-weight: 400;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.heat {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 400;
  white-space: nowrap;
}

.diff {
  font-size: 0.72rem;
  font-weight: 400;
  white-space: nowrap;
}

.title-flag {
  display: inline-block;
  height: 1.2rem;
  margin-left: 0.08rem;
  transform: translateY(rem);
  vertical-align: baseline;
  white-space: nowrap;
  width: auto;
}

.diff.up { color: #c23f3f; }
.diff.down { color: #2a8f55; }

.warning {
  color: var(--muted);
  font-size: 0.75rem;
  margin: 0;
}

.headline:hover {
  text-decoration: underline;
}
</style>
