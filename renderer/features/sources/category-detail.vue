<template>
  <section>
    <h2>Category {{ id }}</h2>
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
