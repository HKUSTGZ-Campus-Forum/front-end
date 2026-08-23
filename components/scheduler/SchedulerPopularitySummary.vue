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
  cart: props.counts.cart_count,
  savedPlans: props.counts.saved_plan_count,
}))
</script>

<template>
  <span
    class="popularity-summary"
    :aria-label="accessibleLabel"
    :title="t('scheduler.popularityExplanation')"
  >
    <span class="popularity-summary__metric">
      <span class="popularity-summary__label">{{ t('scheduler.popularityCartLabel') }}</span>
      <span class="popularity-summary__value">{{ counts.cart_count }}</span>
    </span>
    <span class="popularity-summary__metric popularity-summary__metric--plans">
      <span class="popularity-summary__label">{{ t('scheduler.popularitySavedPlansLabel') }}</span>
      <span class="popularity-summary__value">{{ counts.saved_plan_count }}</span>
    </span>
  </span>
</template>

<style lang="scss" scoped>
.popularity-summary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;

  &__metric {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-height: 20px;
    padding: 2px 6px;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-secondary);

    &--plans {
      border-color: color-mix(in srgb, var(--semantic-success) 28%, var(--border-secondary));
      background: color-mix(in srgb, var(--semantic-success) 10%, var(--surface-primary));
    }
  }

  &__label {
    color: var(--text-secondary);
  }

  &__value {
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }
}
</style>
