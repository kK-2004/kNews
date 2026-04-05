<template>
  <section ref="containerRef" class="category-manager">
    <h3>Categories</h3>
    <VueDraggable v-model="localCategories" handle=".drag-handle" item-key="id" @end="onDrop">
      <div v-for="category in localCategories" :key="category.id" class="category-item">
        <button class="drag-handle" type="button" aria-label="Drag category item">::</button>
        <span>{{ category.name }}</span>
      </div>
    </VueDraggable>
  </section>
</template>

<script setup>
import { useAutoAnimate } from '@formkit/auto-animate/vue'
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

const emit = defineEmits(['update'])

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const localCategories = ref([])
const [containerRef] = useAutoAnimate()

watch(
  () => props.categories,
  (value) => {
    localCategories.value = [...value]
  },
  { immediate: true, deep: true }
)

const onDrop = () => {
  emit('update', [...localCategories.value])
}
</script>

<style scoped>
.category-item { align-items: center; border: 1px solid var(--border); border-radius: 0.5rem; display: flex; gap: 0.5rem; margin-bottom: 0.5rem; padding: 0.55rem; }
.drag-handle { background: transparent; border: 1px solid var(--border); border-radius: 0.35rem; cursor: grab; min-width: 44px; }
</style>
