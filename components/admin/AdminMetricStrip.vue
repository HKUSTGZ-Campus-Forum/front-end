<template>
  <section class="admin-metric-strip">
    <article v-for="item in items" :key="item.key" class="admin-metric-strip__item">
      <span class="admin-metric-strip__label">{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{
    key: string
    label: string
    value: number | string
  }>
}>()
</script>

<style scoped lang="scss">
.admin-metric-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.admin-metric-strip__item {
  padding: 1rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);

  strong {
    display: block;
    margin-top: 0.3rem;
    color: var(--text-primary);
    font-size: 1.55rem;
    line-height: 1;
  }
}

.admin-metric-strip__label {
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 600;
}

@media (max-width: 820px) {
  .admin-metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .admin-metric-strip {
    grid-template-columns: 1fr;
  }
}
</style>
