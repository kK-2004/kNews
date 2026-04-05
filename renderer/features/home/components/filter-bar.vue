<template>
  <div class="filter-bar">
    <base-input v-model="keyword" label="Search" placeholder="Filter feed" />
    <base-dropdown v-model="sort" :options="sortOptions" />
    <base-button variant="secondary" @click="emit('refresh')">Refresh</base-button>
  </div>
</template>

<script setup>
import { useDebounceFn } from '@vueuse/core'
import { ref, watch } from 'vue'
import BaseButton from '@/shared/components/base-button.vue'
import BaseDropdown from '@/shared/components/base-dropdown.vue'
import BaseInput from '@/shared/components/base-input.vue'

const emit = defineEmits(['change', 'refresh'])

const keyword = ref('')
const sort = ref('latest')

const sortOptions = [
  { label: 'Latest', value: 'latest' },
  { label: 'Oldest', value: 'oldest' }
]

const emitChange = useDebounceFn(() => {
  emit('change', {
    keyword: keyword.value,
    sort: sort.value
  })
}, 300)

watch([keyword, sort], emitChange)
</script>

<style scoped>
.filter-bar { align-items: end; display: grid; gap: 0.75rem; grid-template-columns: 1fr 11rem auto; margin-bottom: 1rem; }
@media (max-width: 768px) { .filter-bar { grid-template-columns: 1fr; } }
</style>
