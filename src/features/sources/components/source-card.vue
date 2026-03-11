<template>
  <base-card class="source-card">
    <template #header>
      <div class="head">
        <strong>{{ source.name }}</strong>
        <button class="drag-handle" type="button" aria-label="Drag source card">::</button>
      </div>
    </template>

    <p class="url">{{ source.url }}</p>

    <template #footer>
      <div class="actions">
        <base-button size="sm" variant="secondary" @click="$emit('edit', source)">Edit</base-button>
        <base-button size="sm" variant="danger" @click="$emit('delete', source.id)">Delete</base-button>
      </div>
    </template>
  </base-card>
</template>

<script setup>
import BaseButton from '@/shared/components/base-button.vue'
import BaseCard from '@/shared/components/base-card.vue'

defineEmits(['edit', 'delete'])

defineProps({
  source: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.head { align-items: center; display: flex; justify-content: space-between; }
.drag-handle { background: transparent; border: 1px solid var(--border); border-radius: 0.35rem; cursor: grab; min-width: 44px; user-select: none; }
.url { color: var(--muted); word-break: break-all; }
.actions { display: flex; gap: 0.5rem; }
</style>
