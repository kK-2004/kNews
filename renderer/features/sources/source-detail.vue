<template>
  <section>
    <h2>来源 {{ id }}</h2>
  </section>
</template>

<script setup>
const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const { id } = props
</script>
