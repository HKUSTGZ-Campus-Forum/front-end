<script setup lang="ts">
import type { AcademicCourseStatus } from '~/types/academic-map'

const props = defineProps<{
  modelValue: AcademicCourseStatus
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AcademicCourseStatus): void
}>()

const { t } = useI18n()

const statuses: AcademicCourseStatus[] = ['completed', 'in_progress', 'interested', 'not_interested']

const normalizedValue = computed(() => (
  props.modelValue === 'planned' ? 'interested' : props.modelValue
))
</script>

<template>
  <div :class="['am-status-chips', { 'am-status-chips--compact': props.compact }]">
    <button
      v-for="status in statuses"
      :key="status"
      type="button"
      :class="['am-status-chip', `am-status-chip--${status.replace('_', '-')}`, { active: normalizedValue === status }]"
      @click="emit('update:modelValue', status)"
    >
      {{ t(`academicMap.status.${status}`) }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.am-status-chips {
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  display: inline-flex;
  gap: 2px;
  padding: 3px;
}

.am-status-chip {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 999px;
  min-height: 30px;
  min-width: 54px;
  padding: 0 10px;
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  white-space: nowrap;

  &:hover {
    color: var(--interactive-active);
  }

  &.active {
    background: var(--surface-primary);
    box-shadow: 0 1px 4px rgba(31, 83, 130, 0.12);
  }

  &--completed.active {
    color: var(--semantic-success);
  }

  &--in-progress.active {
    color: var(--interactive-active);
  }

  &--interested.active {
    color: var(--semantic-warning);
  }
}

.am-status-chips--compact .am-status-chip {
  min-height: 28px;
  min-width: 50px;
  font-size: 0.72rem;
}

@media (max-width: 680px) {
  .am-status-chips {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 100%;
  }

  .am-status-chip {
    min-width: 0;
    padding: 0 6px;
  }
}
</style>
