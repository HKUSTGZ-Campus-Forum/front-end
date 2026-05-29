<template>
  <section class="admin-filter-bar">
    <div class="admin-filter-bar__content">
      <slot />
    </div>
    <div v-if="$slots.actions" class="admin-filter-bar__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.admin-filter-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.admin-filter-bar__content,
.admin-filter-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-filter-bar__content {
  flex: 1;
}

@media (max-width: 820px) {
  .admin-filter-bar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
