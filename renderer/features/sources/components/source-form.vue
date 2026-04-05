<template>
  <form class="source-form" @submit.prevent="submit">
    <base-input v-model="model.name" label="Name" placeholder="Source name" />
    <base-input v-model="model.url" label="URL" placeholder="https://..." />
    <div class="actions">
      <base-button type="submit">{{ model.id ? 'Update' : 'Add' }}</base-button>
      <base-button variant="secondary" @click="$emit('cancel')">Cancel</base-button>
    </div>
  </form>
</template>

<script setup>
import { reactive, watch } from 'vue'
import BaseButton from '@/shared/components/base-button.vue'
import BaseInput from '@/shared/components/base-input.vue'

const emit = defineEmits(['submit', 'cancel'])

const props = defineProps({
  initialValue: {
    type: Object,
    default: () => ({})
  }
})

const model = reactive({
  id: '',
  name: '',
  url: ''
})

watch(
  () => props.initialValue,
  (value) => {
    model.id = value?.id || ''
    model.name = value?.name || ''
    model.url = value?.url || ''
  },
  { immediate: true, deep: true }
)

const submit = () => {
  emit('submit', {
    id: model.id || crypto.randomUUID(),
    name: model.name,
    url: model.url
  })
}
</script>

<style scoped>
.source-form { display: grid; gap: 0.75rem; }
.actions { display: flex; gap: 0.5rem; }
</style>
