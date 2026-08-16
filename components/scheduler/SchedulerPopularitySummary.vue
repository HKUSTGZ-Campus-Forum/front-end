<!-- front-end/components/scheduler/SchedulerPopularitySummary.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SchedulerPopularityCounts } from '~/utils/scheduler'

const props = defineProps<{
  counts: SchedulerPopularityCounts
}>()

const { t } = useI18n()
const accessibleLabel = computed(() => t('scheduler.popularityAriaLabel', {
  looking: props.counts.looking_count,
  scheduling: props.counts.scheduling_count,
}))
</script>

<template>
  <span
    class="popularity-summary"
    :aria-label="accessibleLabel"
    :title="t('scheduler.popularityExplanation')"
  >
    <Icon name="lucide:flame" class="popularity-summary__icon" aria-hidden="true" />
    <span class="popularity-summary__counts">{{ counts.looking_count }}/{{ counts.scheduling_count }}</span>
  </span>
</template>

<style lang="scss" scoped>
.popularity-summary {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;

  &__icon {
    flex-shrink: 0;
    color: var(--semantic-warning);
    font-size: 13px;
    line-height: 1;
  }

  &__counts {
    line-height: 1;
  }
}
</style>
