<script setup lang="ts">
import type { AcademicMapSummary } from '~/types/academic-map'

const props = defineProps<{ summary: AcademicMapSummary | null }>()
const emit = defineEmits<{
  (e: 'select-detail', value: 'prerequisites' | 'grades'): void
}>()
const { t } = useI18n()

const totalCredits = computed(() => props.summary?.credits.total_active ?? 0)
const totalMinimum = computed(() => props.summary?.credits.total_minimum ?? 120)
const completedCredits = computed(() => props.summary?.credits.total_completed ?? 0)
const unlockedCount = computed(() => props.summary?.prerequisite_metrics?.unlocked_count ?? 0)
const blockedCount = computed(() => props.summary?.prerequisite_metrics?.blocked_count ?? 0)
const ocga = computed(() => props.summary?.grade_metrics?.ocga ?? null)
const mcga = computed(() => props.summary?.grade_metrics?.mcga ?? null)
const mcgaMajor = computed(() => mcga.value?.program_code || props.summary?.profile.target_majors[0] || '-')
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
      <strong>{{ totalCredits }} / {{ t('academicMap.metrics.minimum', { count: totalMinimum }) }}</strong>
      <small>{{ t('academicMap.metrics.completedCredits', { count: completedCredits }) }}</small>
    </div>
    <button class="am-metric am-metric--button" type="button" @click="emit('select-detail', 'prerequisites')">
      <span>{{ t('academicMap.metrics.prerequisites') }}</span>
      <strong>{{ unlockedCount }} / {{ blockedCount }}</strong>
      <small>{{ t('academicMap.metrics.prerequisitesCopy', { unlocked: unlockedCount, blocked: blockedCount }) }}</small>
    </button>
    <button class="am-metric am-metric--button" type="button" @click="emit('select-detail', 'grades')">
      <span>{{ t('academicMap.metrics.ocga') }}</span>
      <strong>{{ formatGradeMetric(ocga) }}</strong>
      <small>{{ t('academicMap.metrics.ocgaCopy') }}</small>
    </button>
    <button class="am-metric am-metric--button" type="button" @click="emit('select-detail', 'grades')">
      <span>{{ t('academicMap.metrics.mcga', { major: mcgaMajor }) }}</span>
      <strong>{{ formatGradeMetric(mcga) }}</strong>
      <small>{{ t('academicMap.metrics.mcgaCopy') }}</small>
    </button>
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

.am-metric--button {
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: var(--interactive-primary);
    box-shadow: var(--shadow-medium);
    transform: translateY(-1px);
  }
}

@media (max-width: 900px) {
  .am-progress-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
