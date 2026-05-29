<template>
  <div class="admin-action-buttons">
    <button
      v-if="primaryLabel"
      type="button"
      class="admin-action-buttons__btn admin-action-buttons__btn--primary"
      :disabled="disabled"
      @click="$emit('primary')"
    >
      {{ primaryLabel }}
    </button>
    <button
      v-if="secondaryLabel"
      type="button"
      class="admin-action-buttons__btn admin-action-buttons__btn--secondary"
      :disabled="disabled"
      @click="$emit('secondary')"
    >
      {{ secondaryLabel }}
    </button>
    <button
      v-if="dangerLabel"
      type="button"
      class="admin-action-buttons__btn admin-action-buttons__btn--danger"
      :disabled="disabled"
      @click="$emit('danger')"
    >
      {{ dangerLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  primaryLabel?: string
  secondaryLabel?: string
  dangerLabel?: string
  disabled?: boolean
}>()

defineEmits<{
  (event: 'primary'): void
  (event: 'secondary'): void
  (event: 'danger'): void
}>()
</script>

<style scoped lang="scss">
.admin-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.admin-action-buttons__btn {
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.admin-action-buttons__btn--primary {
  background: var(--interactive-primary);
  color: var(--text-inverse);
}

.admin-action-buttons__btn--secondary {
  border-color: var(--border-primary);
  background: var(--surface-secondary);
  color: var(--text-primary);
}

.admin-action-buttons__btn--danger {
  background: var(--semantic-error);
  color: var(--text-inverse);
}
</style>
