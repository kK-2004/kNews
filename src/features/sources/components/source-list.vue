<template>
  <div ref="containerRef" class="source-list">
    <VueDraggable
      v-model="localSources"
      handle=".drag-handle"
      item-key="id"
      :disabled="disabled"
      @end="onDrop"
    >
      <source-card
        v-for="source in localSources"
        :key="source.id"
        :source="source"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </VueDraggable>
  </div>
</template>

<script setup>
import { useAutoAnimate } from '@formkit/auto-animate/vue'
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import SourceCard from './source-card.vue'

const emit = defineEmits(['reorder', 'edit', 'delete'])

const props = defineProps({
  sources: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const localSources = ref([])
const [containerRef] = useAutoAnimate()

watch(
  () => props.sources,
  (value) => {
    localSources.value = [...value]
  },
  { immediate: true, deep: true }
)

const onDrop = () => {
  emit('reorder', [...localSources.value])
}
</script>

<style scoped>
.source-list { display: grid; gap: 0.75rem; }
</style>
