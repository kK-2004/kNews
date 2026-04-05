<template>
  <base-modal :open="open" @close="emit('close')">
    <template #title>
      <h3>Command Palette</h3>
    </template>

    <input
      ref="inputRef"
      v-model="localQuery"
      aria-label="Search commands"
      class="command-input"
      placeholder="Type a command"
      type="text"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="runActive"
    />

    <ul class="command-list">
      <li v-for="(item, index) in filtered" :key="item.id">
        <button
          type="button"
          :class="{ active: index === activeIndex }"
          @mouseenter="activeIndex = index"
          @click="run(item)"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.shortcut }}</small>
        </button>
      </li>
    </ul>
  </base-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from './base-modal.vue'

const emit = defineEmits(['close', 'run', 'query-change'])

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  commands: {
    type: Array,
    default: () => []
  },
  query: {
    type: String,
    default: ''
  }
})

const inputRef = ref(null)
const localQuery = ref(props.query)
const activeIndex = ref(0)

watch(
  () => props.query,
  (value) => {
    localQuery.value = value
  }
)

watch(localQuery, (value) => {
  activeIndex.value = 0
  emit('query-change', value)
})

watch(
  () => props.open,
  (open) => {
    if (open) setTimeout(() => inputRef.value?.focus(), 0)
  }
)

const filtered = computed(() => props.commands)

const move = (step) => {
  if (!filtered.value.length) return
  const total = filtered.value.length
  activeIndex.value = (activeIndex.value + step + total) % total
}

const run = (item) => {
  emit('run', item)
  emit('close')
}

const runActive = () => {
  const item = filtered.value[activeIndex.value]
  if (item) run(item)
}
</script>

<style scoped>
.command-input { border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.75rem; padding: 0.55rem 0.7rem; width: 100%; }
.command-list { list-style: none; margin: 0; max-height: 18rem; overflow: auto; padding: 0; }
.command-list button { align-items: center; display: flex; justify-content: space-between; width: 100%; }
.command-list button.active { background: #eef4ff; }
</style>
