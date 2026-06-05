<script setup lang="ts">
import type {
  AcademicGradeMetric,
  AcademicMapSummary,
  AcademicRequirementCell,
  AcademicRequirementRow,
} from '~/types/academic-map'

const props = defineProps<{
  summary: AcademicMapSummary | null
  selectedRow: AcademicRequirementRow | null
  selectedDetail: 'prerequisites' | 'grades' | null
}>()

const { locale, t } = useI18n()

const ocga = computed(() => props.summary?.grade_metrics?.ocga ?? null)
const mcga = computed(() => props.summary?.grade_metrics?.mcga ?? null)
const prerequisites = computed(() => props.summary?.prerequisite_metrics ?? null)
const blockers = computed(() => prerequisites.value?.blockers || [])

const rowTitle = computed(() => {
  if (!props.selectedRow) return ''
  return locale.value === 'zh'
    ? props.selectedRow.name_zh || props.selectedRow.name_en
    : props.selectedRow.name_en
})

const panelMode = computed(() => {
  if (props.selectedDetail) return props.selectedDetail
  if (props.selectedRow) return 'row'
  return 'overview'
})

const formatGradeMetric = (metric: AcademicGradeMetric | null) => {
  if (!metric || metric.status !== 'available' || metric.value === null) {
    return t('academicMap.metrics.notUploaded')
  }
  return metric.value.toFixed(2)
}

const cellLabel = (cell: AcademicRequirementCell) => cell.course_code || cell.label || ''
const cellTitle = (cell: AcademicRequirementCell) => cell.title || t('academicMap.requirements.unknownTitle')
</script>

<template>
  <section class="am-card am-detail">
    <template v-if="panelMode === 'grades'">
      <div class="am-section-head">
        <div>
          <h2>{{ t('academicMap.detail.gradesTitle') }}</h2>
          <p>{{ t('academicMap.detail.gradesCopy') }}</p>
        </div>
      </div>

      <div class="am-grade-list">
        <div class="am-grade-row">
          <span>{{ t('academicMap.metrics.ocga') }}</span>
          <strong>{{ formatGradeMetric(ocga) }}</strong>
          <small>{{ t('academicMap.detail.ocgaRule') }}</small>
        </div>
        <div class="am-grade-row">
          <span>{{ t('academicMap.metrics.mcga', { major: mcga?.program_code || summary?.profile.target_majors[0] || '-' }) }}</span>
          <strong>{{ formatGradeMetric(mcga) }}</strong>
          <small>{{ t('academicMap.detail.mcgaRule') }}</small>
        </div>
      </div>

      <p class="am-note">{{ t('academicMap.detail.gradePrivacy') }}</p>
    </template>

    <template v-else-if="panelMode === 'prerequisites'">
      <div class="am-section-head">
        <div>
          <h2>{{ t('academicMap.detail.prerequisitesTitle') }}</h2>
          <p>{{ t('academicMap.detail.prerequisitesCopy', { unlocked: prerequisites?.unlocked_count || 0, blocked: prerequisites?.blocked_count || 0 }) }}</p>
        </div>
      </div>

      <div v-if="blockers.length === 0" class="am-empty">
        {{ t('academicMap.detail.noBlockers') }}
      </div>
      <div v-else class="am-blocker-list">
        <article v-for="blocker in blockers" :key="blocker.course_code" class="am-blocker">
          <strong>{{ blocker.course_code }}</strong>
          <span>{{ blocker.course_title || t('academicMap.requirements.unknownTitle') }}</span>
          <small>{{ t('academicMap.detail.missing') }} {{ blocker.missing.join(', ') }}</small>
        </article>
      </div>
    </template>

    <template v-else-if="panelMode === 'row' && selectedRow">
      <div class="am-section-head">
        <div>
          <h2>{{ rowTitle }}</h2>
          <p>{{ t('academicMap.detail.rowCopy', { progress: selectedRow.progress_label || '-' }) }}</p>
        </div>
      </div>

      <div class="am-detail-facts">
        <span>{{ t('academicMap.detail.minCourses', { count: selectedRow.detail.min_courses || '-' }) }}</span>
        <span>{{ t('academicMap.detail.minCredits', { count: selectedRow.detail.min_credits || '-' }) }}</span>
      </div>

      <div class="am-cell-cloud">
        <span
          v-for="cell in selectedRow.all_cells"
          :key="`${cell.course_code || cell.label}-${cell.status}`"
          :class="['am-mini-cell', `is-${cell.status}`]"
        >
          <strong>{{ cellLabel(cell) }}</strong>
          <small>{{ cellTitle(cell) }}</small>
          <em v-if="cell.shared_majors && cell.shared_majors.length > 1">{{ cell.shared_majors.join('+') }}</em>
        </span>
      </div>
    </template>

    <template v-else>
      <div class="am-section-head">
        <div>
          <h2>{{ t('academicMap.detail.overviewTitle') }}</h2>
          <p>{{ t('academicMap.detail.overviewCopy') }}</p>
        </div>
      </div>
      <div class="am-legend">
        <span class="is-now">{{ t('academicMap.requirements.status.now') }}</span>
        <span class="is-done">{{ t('academicMap.requirements.status.done') }}</span>
        <span class="is-need">{{ t('academicMap.requirements.status.need') }}</span>
        <span class="is-more">{{ t('academicMap.requirements.status.more') }}</span>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.am-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  padding: 18px;
}

.am-section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.05rem;
  }

  p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 0.86rem;
    line-height: 1.55;
  }
}

.am-grade-list,
.am-blocker-list,
.am-cell-cloud,
.am-legend {
  display: grid;
  gap: 10px;
}

.am-grade-row,
.am-blocker {
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  display: grid;
  gap: 3px;
  padding: 12px;
}

.am-grade-row {
  grid-template-columns: 1fr auto;

  span,
  small {
    color: var(--text-secondary);
  }

  strong {
    color: var(--interactive-active);
    font-size: 1.15rem;
  }

  small {
    grid-column: 1 / -1;
    line-height: 1.45;
  }
}

.am-note,
.am-empty {
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.55;
  margin: 12px 0 0;
}

.am-blocker {
  strong {
    color: var(--interactive-active);
  }

  span {
    color: var(--text-primary);
    font-weight: 650;
  }

  small {
    color: var(--warning-color, #a86600);
    line-height: 1.45;
  }
}

.am-detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;

  span {
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 0.76rem;
    font-weight: 750;
    padding: 5px 9px;
  }
}

.am-cell-cloud {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.am-mini-cell,
.am-legend span {
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  display: grid;
  gap: 2px;
  padding: 9px 10px;
}

.am-mini-cell {
  strong {
    color: var(--text-primary);
    font-size: 0.8rem;
  }

  small {
    color: var(--text-tertiary);
    font-size: 0.72rem;
    line-height: 1.3;
  }

  em {
    color: #6e4bd8;
    font-size: 0.66rem;
    font-style: normal;
    font-weight: 850;
  }
}

.am-legend {
  grid-template-columns: repeat(2, minmax(0, 1fr));

  span {
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 800;
    text-align: center;
  }
}

.is-now {
  background: rgba(38, 164, 255, 0.11);
  border-color: rgba(38, 164, 255, 0.38);
}

.is-done {
  background: rgba(35, 190, 110, 0.1);
  border-color: rgba(35, 190, 110, 0.36);
}

.is-need {
  background: rgba(255, 172, 64, 0.1);
  border-color: rgba(255, 172, 64, 0.35);
}

.is-choice {
  background: rgba(130, 89, 255, 0.08);
  border-color: rgba(130, 89, 255, 0.3);
}

.is-more {
  background: var(--bg-secondary);
  border-color: var(--border-focus);
  border-style: dashed;
}
</style>
