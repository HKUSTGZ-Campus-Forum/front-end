<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SchedulerPopularityCounts } from '~/utils/scheduler'

const props = withDefaults(defineProps<{
  counts: SchedulerPopularityCounts
  compact?: boolean
}>(), {
  compact: false,
})

const { t } = useI18n()
const accessibleLabel = computed(() => t('scheduler.popularityAriaLabel', {
  looking: props.counts.looking_count,
  scheduling: props.counts.scheduling_count,
}))
</script>

<template>
  <span
    class="popularity-badge"
    :class="{ 'popularity-badge--compact': compact }"
    :aria-label="accessibleLabel"
    :title="t('scheduler.popularityExplanation')"
  >
    <span class="popularity-badge__looking">
      {{ compact
        ? t('scheduler.popularityLookingShort', { count: counts.looking_count })
        : t('scheduler.popularityLooking', { count: counts.looking_count }) }}
    </span>
    <span class="popularity-badge__planning">
      {{ compact
        ? t('scheduler.popularityPlanningShort', { count: counts.scheduling_count })
        : t('scheduler.popularityPlanning', { count: counts.scheduling_count }) }}
    </span>
  </span>
</template>

<style lang="scss" scoped>
.popularity-badge {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.2;

  > span {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 2px 7px;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-secondary);
    white-space: nowrap;
  }

  &__looking {
    color: var(--text-secondary);
  }

  &__planning {
    border-color: color-mix(in srgb, var(--semantic-success) 28%, var(--border-secondary)) !important;
    background: color-mix(in srgb, var(--semantic-success) 10%, var(--surface-primary)) !important;
    color: color-mix(in srgb, var(--semantic-success) 78%, var(--text-primary));
  }

  /* compact 模式用于地图/彩色底衬场景：
     白色文字 + 半透明黑底为刻意设计（在任意彩色背景上均保持可读），不随主题变化 */
  &--compact {
    gap: 3px;
    color: white;
    font-size: 0.58rem;

    > span {
      min-height: 16px;
      padding: 1px 4px;
      border-color: rgba(255, 255, 255, 0.28) !important;
      background: rgba(0, 0, 0, 0.18) !important;
      color: white;
    }
  }
}
</style>
