<template>
  <header class="admin-page-header">
    <div class="admin-page-header__copy">
      <p v-if="eyebrow" class="admin-page-header__eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>()
</script>

<style scoped lang="scss">
.admin-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.admin-page-header__copy {
  min-width: 0;

  h1 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.6rem;
    font-weight: 700;
  }

  p {
    margin: 0.55rem 0 0;
    color: var(--text-secondary);
    line-height: 1.65;
  }
}

.admin-page-header__eyebrow {
  margin: 0 0 0.35rem !important;
  color: var(--interactive-primary) !important;
  font-size: 0.82rem;
  font-weight: 700;
}

.admin-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 720px) {
  .admin-page-header {
    flex-direction: column;
  }

  .admin-page-header__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
