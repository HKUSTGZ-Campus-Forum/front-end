<script setup lang="ts">
import type { AcademicMapSummary } from '~/types/academic-map'

const props = defineProps<{
  summary: AcademicMapSummary | null
  activeMajor?: string | null
}>()
const { t } = useI18n()

const totalCredits = computed(() => props.summary?.credits.total_completed ?? 0)
const totalMinimum = computed(() => props.summary?.credits.total_minimum ?? 120)
const completedCredits = computed(() => props.summary?.credits.total_completed ?? 0)
const inProgressCredits = computed(() => {
  return props.summary?.records
    .filter(record => record.status === 'in_progress')
    .reduce((sum, record) => sum + (record.units || 0), 0) ?? 0
})
const blockedCount = computed(() => props.summary?.prerequisite_metrics?.blocked_count ?? 0)
const ocga = computed(() => props.summary?.grade_metrics?.ocga ?? null)
const mcga = computed(() => props.summary?.grade_metrics?.mcga ?? null)
const mcgaMajor = computed(() => props.activeMajor || mcga.value?.program_code || props.summary?.profile.target_majors[0] || '-')
const hasTargetProfile = computed(() => Boolean(props.summary?.profile.cohort && props.summary?.profile.target_majors.length))
const formatGradeMetric = (metric: typeof ocga.value) => {
  if (!metric || metric.status !== 'available' || metric.value === null) {
    return t('academicMap.metrics.notUploaded')
  }
  return metric.value.toFixed(2)
}
</script>

<template>
  <section class="am-progress-grid">
    <div class="am-metric">
      <span>{{ t('academicMap.metrics.totalCredits') }}</span>
      <strong>{{ totalCredits }} / {{ totalMinimum }}</strong>
      <small>{{ t('academicMap.metrics.completedCredits', { completed: completedCredits, inProgress: inProgressCredits }) }}</small>
    </div>
    <div class="am-metric">
      <span>{{ t('academicMap.metrics.prerequisites') }}</span>
      <strong>{{ hasTargetProfile ? blockedCount : t('academicMap.metrics.selectTarget') }}</strong>
      <small>{{ hasTargetProfile ? t('academicMap.metrics.prerequisitesCopy', { blocked: blockedCount }) : t('academicMap.metrics.prerequisitesNeedsTarget') }}</small>
    </div>
    <div class="am-metric">
      <span>{{ t('academicMap.metrics.ocga') }}</span>
      <strong>{{ formatGradeMetric(ocga) }}</strong>
      <small>{{ t('academicMap.metrics.ocgaCopy') }}</small>
    </div>
    <div class="am-metric">
      <span>{{ t('academicMap.metrics.mcga', { major: mcgaMajor }) }}</span>
      <strong>{{ hasTargetProfile ? formatGradeMetric(mcga) : t('academicMap.metrics.selectTarget') }}</strong>
      <small>{{ hasTargetProfile ? t('academicMap.metrics.mcgaCopy') : t('academicMap.metrics.mcgaNeedsTarget') }}</small>
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
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  color: inherit;
  font: inherit;
  padding: 16px;
  text-align: left;

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

@media (max-width: 900px) {
  .am-progress-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
