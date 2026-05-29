<script setup lang="ts">
import type { AcademicMapSummary } from '~/types/academic-map'

const props = defineProps<{ summary: AcademicMapSummary | null }>()
const { t } = useI18n()

const totalCredits = computed(() => props.summary?.credits.total_completed ?? 0)
const totalMinimum = computed(() => props.summary?.credits.total_minimum ?? 120)
const activeCredits = computed(() => props.summary?.credits.total_active ?? 0)
const importedCount = computed(() => props.summary?.course_counts.imported ?? 0)
const needsReviewCount = computed(() => props.summary?.course_counts.needs_review ?? 0)
const mapScore = computed(() => props.summary?.map_completeness.score ?? 0)
</script>

<template>
  <section class="am-progress-grid">
    <div class="am-metric">
      <span>{{ t('academicMap.metrics.totalCredits') }}</span>
      <strong>{{ totalCredits }} / {{ t('academicMap.metrics.minimum', { count: totalMinimum }) }}</strong>
      <small>{{ t('academicMap.metrics.activeCredits', { count: activeCredits }) }}</small>
    </div>
    <div class="am-metric">
      <span>{{ t('academicMap.metrics.mapCompleteness') }}</span>
      <strong>{{ mapScore }}%</strong>
      <small>{{ t('academicMap.metrics.mapCompletenessCopy') }}</small>
    </div>
    <div class="am-metric">
      <span>{{ t('academicMap.metrics.importedCourses') }}</span>
      <strong>{{ importedCount }}</strong>
      <small>{{ t('academicMap.metrics.importedCoursesCopy') }}</small>
    </div>
    <div class="am-metric am-metric--warn">
      <span>{{ t('academicMap.metrics.unmetRequirements') }}</span>
      <strong>{{ needsReviewCount }}</strong>
      <small>{{ t('academicMap.metrics.unmetRequirementsCopy') }}</small>
    </div>
  </section>
</template>

<style scoped lang="scss">
.am-progress-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.am-metric {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  padding: 16px;

  span,
  small {
    display: block;
    color: var(--text-secondary);
    font-size: 0.78rem;
  }

  strong {
    display: block;
    color: var(--interactive-active);
    font-size: 1.35rem;
    margin: 8px 0 4px;
  }
}

.am-metric--warn strong {
  color: var(--warning-color, #a86600);
}

@media (max-width: 900px) {
  .am-progress-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
