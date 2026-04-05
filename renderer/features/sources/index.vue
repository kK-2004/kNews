<template>
  <section>
    <h2>Sources</h2>

    <source-form :initial-value="editing" @submit="save" @cancel="resetForm" />

    <source-list
      :sources="sourceStore.items"
      @reorder="reorder"
      @edit="startEdit"
      @delete="remove"
    />

    <category-manager :categories="categories" @update="updateCategories" />
  </section>
</template>

<script setup>
import { computed, onMounted, onServerPrefetch, ref } from 'vue'
import { useSourcesApi } from '@/shared/composables/useSourcesApi'
import { useSourceStore } from '@/stores/use-source-store'
import CategoryManager from './components/category-manager.vue'
import SourceForm from './components/source-form.vue'
import SourceList from './components/source-list.vue'

const api = useSourcesApi()
const sourceStore = useSourceStore()
const editing = ref(null)
const categories = ref([
  { id: 'tech', name: 'Tech' },
  { id: 'world', name: 'World' },
  { id: 'finance', name: 'Finance' }
])

const saveToStorage = (items) => {
  localStorage.setItem('knews:sources', JSON.stringify(items))
}

const save = async (source) => {
  if (editing.value?.id) {
    sourceStore.setSources(sourceStore.items.map((item) => (item.id === source.id ? source : item)))
    await api.updateSource(source.id, source)
  } else {
    sourceStore.setSources([...sourceStore.items, source])
    await api.createSource(source)
  }

  saveToStorage(sourceStore.items)
  resetForm()
}

const reorder = (items) => {
  sourceStore.setSources(items)
  saveToStorage(items)
}

const startEdit = (source) => {
  editing.value = source
}

const resetForm = () => {
  editing.value = null
}

const remove = async (id) => {
  sourceStore.setSources(sourceStore.items.filter((item) => item.id !== id))
  saveToStorage(sourceStore.items)
  await api.deleteSource(id)
}

const updateCategories = (next) => {
  categories.value = next
  localStorage.setItem('knews:categories', JSON.stringify(next))
}

const localSources = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('knews:sources') || '[]')
  } catch {
    return []
  }
})

onMounted(async () => {
  if (localSources.value.length) {
    sourceStore.setSources(localSources.value)
    return
  }

  await sourceStore.fetchSources(api.fetchSources)
})

onServerPrefetch(async () => {
  if (!sourceStore.items.length) await sourceStore.fetchSources(api.fetchSources)
})
</script>
