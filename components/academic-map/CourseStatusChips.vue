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

const statuses: AcademicCourseStatus[] = ['completed', 'in_progress', 'planned', 'interested', 'not_interested']
</script>

<template>
  <div :class="['am-status-chips', { 'am-status-chips--compact': props.compact }]">
    <button
      v-for="status in statuses"
      :key="status"
      type="button"
      :class="['am-status-chip', { active: props.modelValue === status }]"
      @click="emit('update:modelValue', status)"
    >
      {{ t(`academicMap.status.${status}`) }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.am-status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.am-status-chip {
  border: 1px solid var(--border-secondary);
  background: var(--surface-primary);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &.active {
    border-color: var(--border-focus);
    color: var(--interactive-active);
    background: var(--bg-secondary);
  }
}

.am-status-chips--compact .am-status-chip {
  padding: 4px 9px;
  font-size: 0.72rem;
}
</style>
