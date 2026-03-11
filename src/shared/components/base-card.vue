<template>
  <article class="card">
    <header v-if="$slots.header" class="card-header">
      <slot name="header" />
    </header>
    <section class="card-body">
      <slot />
    </section>
    <footer v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<script setup>
</script>

<style scoped>
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem; }
.card-header, .card-footer { padding: 0.7rem 0.9rem; }
.card-header { border-bottom: 1px solid var(--border); }
.card-footer { border-top: 1px solid var(--border); }
.card-body { padding: 0.9rem; }
</style>
