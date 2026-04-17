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
        <button class="icon-btn" type="button" aria-label="刷新来源" @click.stop="$emit('refresh', source.id)">
          <span class="btn-icon i-tabler-refresh" aria-hidden="true" />
        </button>
        <button class="icon-btn" :class="{ active: followed }" type="button" aria-label="切换关注状态" @click.stop="$emit('toggle-follow', source.id)">
          <span v-if="followed" class="btn-icon i-tabler-star-filled" aria-hidden="true" />
          <span v-else class="btn-icon i-tabler-star" aria-hidden="true" />
        </button>
      </div>
    </header>

    <ol class="news-list">
      <li v-for="(item, idx) in items" :key="item.id || item.url || `${source.id}-${idx}`" class="news-item">
        <div class="idx-wrap">
          <span class="idx">{{ String(idx + 1).padStart(2, '0') }}</span>
          <span v-if="item.extra?.diff > 0" class="idx-trend up i-tabler-arrow-up" aria-hidden="true" />
          <span v-else-if="item.extra?.diff < 0" class="idx-trend down i-tabler-arrow-down" aria-hidden="true" />
        </div>
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
import { computed, inject } from 'vue'

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

const timeNow = inject('timeNow', null)

const updatedLabel = computed(() => {
  if (props.status === 'error') return '获取失败'
  const ts = Number(props.updatedTime || 0)
  if (!ts) return '加载中...'
  const now = timeNow?.value ?? Date.now()
  const diff = now - ts
  if (diff >= 10 * 60 * 1000) return '10分钟前更新'
  if (diff < 60 * 1000) return '刚刚更新'
  return `${Math.floor(diff / 60000)}分钟前更新`
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
  --board-soft-bg: color-mix(in srgb, var(--board-accent) 9%, var(--surface));
  --board-soft-border: color-mix(in srgb, var(--board-accent) 22%, var(--border));
  --board-item-bg: color-mix(in srgb, var(--board-accent) 9%, transparent);
  --board-item-hover-bg: color-mix(in srgb, var(--board-accent) 14%, var(--surface-container-low));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--board-accent) 9%, transparent), transparent 28%),
    var(--board-soft-bg);
  border: 1px solid var(--board-soft-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  display: grid;
  gap: 0.5rem;
  height: 31rem;
  max-height: 31rem;
  padding: 1.25rem;
  position: relative;
  transition: box-shadow 0.3s ease, background 0.3s ease;
  overflow: hidden;
}

.source-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--surface-container);
  border-bottom: 1px solid var(--border);
  border-left: 1px solid var(--border);
  border-radius: 0 0 0 var(--radius);
  color: var(--on-surface-variant);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
  padding: 0.25rem 0.5rem;
  text-transform: uppercase;
}

.source-board:hover {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--board-accent) 12%, transparent), transparent 28%),
    color-mix(in srgb, var(--board-accent) 10%, var(--surface-container-low));
  box-shadow: var(--shadow-md);
}

.source-board.dragging {
  opacity: 0.45;
}

.source-board.drop-target {
  outline: 2px dashed var(--primary);
  outline-offset: -6px;
}

.board-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 2.5rem;
}

.brand {
  align-items: center;
  display: flex;
  gap: 0.6rem;
}

.brand h3 {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

.title-link {
  color: var(--text);
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.icon {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  border-radius: var(--radius);
  display: inline-block;
  height: 2.5rem;
  width: 2.5rem;
}

.badge {
  background: var(--surface-container);
  border-radius: var(--radius);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.12rem 0.5rem;
  color: var(--on-surface-variant);
}

.updated {
  color: var(--on-surface-variant);
  font-size: 0.75rem;
  margin-top: 0.15rem;
}

.ops {
  align-items: center;
  display: flex;
  gap: 0.25rem;
}

.icon-btn {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: var(--radius);
  color: var(--on-surface-variant);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.9rem;
  height: 2rem;
  justify-content: center;
  min-height: 2rem;
  transition: background 0.15s ease, color 0.15s ease;
  width: 2rem;
}

.icon-btn:hover {
  background: var(--surface-container);
  color: var(--primary);
}

.icon-btn:active {
  transform: translateY(1px) scale(0.97);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.icon-btn.active {
  background: color-mix(in srgb, var(--tertiary) 12%, transparent);
  color: var(--tertiary);
}

.btn-icon {
  color: var(--on-surface-variant);
  display: inline-block;
  font-size: 1.1rem;
  height: 1.1rem;
  width: 1.1rem;
  transition: color 0.16s ease;
}

.icon-btn:hover .btn-icon {
  color: var(--primary);
}

.icon-btn.active .btn-icon {
  color: var(--tertiary);
}

.news-list {
  display: grid;
  gap: 0.2rem;
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
  background: var(--board-item-bg);
  border-radius: 2px;
  border: 1px solid transparent;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1.8rem minmax(0, 1fr);
  overflow: visible;
  padding: 0.4rem 0.35rem;
  transition: background 0.15s, border-color 0.15s;
}

.news-item:hover {
  background: var(--board-item-hover-bg);
  border-color: color-mix(in srgb, var(--board-accent) 28%, transparent);
}

.idx-wrap {
  align-items: center;
  align-self: start;
  display: flex;
  flex-direction: column;
  min-width: 1.8rem;
  padding-top: 0.1rem;
}

.idx {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--on-surface-variant);
}

.idx-trend {
  font-size: 0.65rem;
  line-height: 1;
  margin-top: 0.1rem;
}

.idx-trend.up { color: var(--error); }
.idx-trend.down { color: #2a8f55; }

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
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
  transition: color 0.15s;
}

.news-item:hover .title {
  color: var(--primary);
}

.heat {
  color: var(--on-surface-variant);
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
  vertical-align: baseline;
  white-space: nowrap;
  width: auto;
}

.diff.up { color: #c23f3f; }
.diff.down { color: #2a8f55; }

.warning {
  color: var(--on-surface-variant);
  font-size: 0.75rem;
  margin: 0;
}

.headline:hover {
  text-decoration: none;
}
</style>
