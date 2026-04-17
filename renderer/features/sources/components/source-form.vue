<template>
  <form class="source-form" @submit.prevent="submit">
    <base-input v-model="model.name" label="名称" placeholder="来源名称" />
    <base-input v-model="model.url" label="链接" placeholder="https://..." />
    <div class="actions">
      <base-button type="submit">{{ model.id ? '更新' : '新增' }}</base-button>
      <base-button variant="secondary" @click="$emit('cancel')">取消</base-button>
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
