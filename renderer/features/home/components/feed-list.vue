<template>
  <div ref="listRef" class="feed-list" @scroll.passive="onScroll">
    <div class="inner" :style="{ height: `${totalHeight}px` }">
      <div ref="windowRef" class="window" :style="{ transform: `translateY(${offsetTop}px)` }">
        <feed-card
          v-for="(item, idx) in visibleItems"
          :key="`${item.id || item.url || 'item'}-${startIndex + idx}`"
          :article="item"
        />
      </div>
    </div>
    <div ref="sentinelRef" class="sentinel" />
  </div>
</template>

<script setup>
import { useThrottleFn } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import FeedCard from './feed-card.vue'

const emit = defineEmits(['reach-end'])

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  rowHeight: {
    type: Number,
    default: 180
  },
  overscan: {
    type: Number,
    default: 6
  }
})

const listRef = ref(null)
const sentinelRef = ref(null)
const scrollTop = ref(0)
const viewportHeight = ref(720)
const windowRef = ref(null)
let observer

const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - props.overscan))
const endIndex = computed(() => Math.min(props.items.length, Math.ceil((scrollTop.value + viewportHeight.value) / props.rowHeight) + props.overscan))
const visibleItems = computed(() => props.items.slice(startIndex.value, endIndex.value))
const offsetTop = computed(() => startIndex.value * props.rowHeight)
const totalHeight = computed(() => props.items.length * props.rowHeight)

const onScroll = useThrottleFn((event) => {
  scrollTop.value = event.target.scrollTop
}, 120)

onMounted(() => {
  viewportHeight.value = listRef.value?.clientHeight || 720
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) emit('reach-end')
  })
  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.feed-list { display: grid; gap: 0.8rem; height: calc(100dvh - 14rem); overflow: auto; }
.inner { position: relative; }
.window { display: grid; gap: 0.75rem; left: 0; position: absolute; right: 0; }
.sentinel { height: 1px; }

@media (min-width: 768px) {
  .window {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .window {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
