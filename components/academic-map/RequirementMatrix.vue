<script setup lang="ts">
import type {
  AcademicProfile,
  AcademicRequirementCell,
  AcademicRequirementMatrix,
  AcademicRequirementProgress,
  AcademicRequirementRow,
  AcademicRequirementSection,
} from '~/types/academic-map'
import { academicMajors } from '~/constants/academicMajors'

const props = defineProps<{
  matrices: AcademicRequirementMatrix[]
  activeMajor: string | null
  profile?: AcademicProfile | null
}>()

const emit = defineEmits<{
  (e: 'select-major', value: string): void
}>()

const { locale, t } = useI18n()
const expandedRowKey = ref<string | null>(null)

const activeMatrix = computed(() => {
  if (props.activeMajor) {
    return props.matrices.find(matrix => matrix.program_code === props.activeMajor) || null
  }
  return props.matrices[0] || null
})

const activeMajorCode = computed(() => {
  return props.activeMajor || activeMatrix.value?.program_code || props.profile?.target_majors[0] || null
})

const majorTabs = computed(() => {
  const tabs = new Map<string, { code: string; label: string; hasMatrix: boolean }>()
  for (const major of props.profile?.target_majors || []) {
    const matrix = props.matrices.find(item => item.program_code === major)
    const catalogMajor = academicMajors.find(item => item.code === major)
    tabs.set(major, {
      code: major,
      label: matrix
        ? matrixTitle(matrix).replace(`${matrix.program_code} `, '')
        : locale.value === 'zh'
          ? catalogMajor?.nameZh || major
          : catalogMajor?.nameEn || major,
      hasMatrix: Boolean(matrix),
    })
  }
  for (const matrix of props.matrices) {
    if (!tabs.has(matrix.program_code)) {
      tabs.set(matrix.program_code, {
        code: matrix.program_code,
        label: matrixTitle(matrix).replace(`${matrix.program_code} `, ''),
        hasMatrix: true,
      })
    }
  }
  return Array.from(tabs.values())
})

const matrixTitle = (matrix: AcademicRequirementMatrix) => {
  const name = locale.value === 'zh'
    ? matrix.program.name_zh || matrix.program.name_en
    : matrix.program.name_en
  return `${matrix.program_code} ${name}`
}

const rowTitle = (row: AcademicRequirementRow) => {
  return locale.value === 'zh' ? row.name_zh || row.name_en : row.name_en
}

const cellLabel = (cell: AcademicRequirementCell) => cell.course_code

const cellTitle = (cell: AcademicRequirementCell) => {
  return cell.title || t('academicMap.requirements.unknownTitle')
}

const sectionLabel = (section: AcademicRequirementSection) => {
  return locale.value === 'zh' ? section.label_zh || section.label_en : section.label_en
}

const sectionKindLabel = (section: AcademicRequirementSection) => {
  return t(`academicMap.requirements.sectionKinds.${section.kind}`)
}

const rowSections = (row: AcademicRequirementRow) => row.sections || []

const visibleSectionSummaries = (row: AcademicRequirementRow) => rowSections(row).slice(0, 3)

const hiddenSectionCount = (row: AcademicRequirementRow) => Math.max(rowSections(row).length - 3, 0)

const isCourseCell = (cell: AcademicRequirementRow['visible_cells'][number]): cell is AcademicRequirementCell => {
  return cell.kind === 'course'
}

const courseRank = (cell: AcademicRequirementCell) => {
  const status = cellState(cell)
  if (status === 'completed') return 0
  if (status === 'in_progress') return 1
  if (status === 'planned') return 2
  if (cell.allocation_status === 'counted') return 3
  if (status === 'candidate') return 4
  if (status === 'missing_credit') return 5
  if (status === 'excluded_duplicate') return 6
  return 7
}

const uniqueCourseCells = (row: AcademicRequirementRow) => {
  const seen = new Set<string>()
  const cells: AcademicRequirementCell[] = []
  const sources = [
    ...row.visible_cells.filter(isCourseCell),
    ...(row.all_cells || []),
  ]

  for (const cell of sources) {
    if (!cell.course_code || seen.has(cell.course_code)) continue
    seen.add(cell.course_code)
    cells.push(cell)
  }

  return cells
}

const summaryCourseCells = (row: AcademicRequirementRow) => {
  return uniqueCourseCells(row)
    .map((cell, index) => ({ cell, index }))
    .sort((a, b) => courseRank(a.cell) - courseRank(b.cell) || a.index - b.index)
    .slice(0, 4)
    .map(item => item.cell)
}

const hiddenCourseCount = (row: AcademicRequirementRow) => {
  return Math.max(uniqueCourseCells(row).length - summaryCourseCells(row).length, 0)
}

const hasProjectedChange = (current: AcademicRequirementProgress, projected: AcademicRequirementProgress) => {
  return current.satisfied !== projected.satisfied
    || current.counted_courses !== projected.counted_courses
    || current.counted_credits !== projected.counted_credits
}

const progressLabel = (progress: AcademicRequirementProgress, projected = false) => {
  if (progress.required_courses && progress.required_credits) {
    return t(projected ? 'academicMap.requirements.projectedProgress' : 'academicMap.requirements.currentProgress', {
      courses: progress.counted_courses,
      requiredCourses: progress.required_courses,
      credits: progress.counted_credits,
      requiredCredits: progress.required_credits,
    })
  }
  if (progress.required_courses) {
    return t(projected ? 'academicMap.requirements.projectedCourseProgress' : 'academicMap.requirements.currentCourseProgress', {
      courses: progress.counted_courses,
      requiredCourses: progress.required_courses,
    })
  }
  return t(projected ? 'academicMap.requirements.projectedCreditProgress' : 'academicMap.requirements.creditProgress', {
    credits: progress.counted_credits,
    requiredCredits: progress.required_credits || '-',
  })
}

const cellState = (cell: AcademicRequirementCell) => {
  if (cell.allocation_status === 'counted' && cell.record_status) return cell.record_status
  return cell.allocation_status
}

const toggleRow = (row: AcademicRequirementRow) => {
  expandedRowKey.value = expandedRowKey.value === row.key ? null : row.key
}

const emptyMessage = computed(() => {
  if (!props.profile?.cohort || !props.profile.target_majors.length) {
    return t('academicMap.requirements.emptyMissingProfile')
  }
  return t('academicMap.requirements.emptyMissingCatalog')
})

watch(activeMajorCode, () => {
  expandedRowKey.value = null
})
</script>

<template>
  <section class="am-card am-requirements">
    <div class="am-section-head">
      <div>
        <h2>{{ t('academicMap.requirements.title') }}</h2>
      </div>
    </div>

    <div v-if="majorTabs.length > 0" class="am-major-tabs">
      <button
        v-for="tab in majorTabs"
        :key="tab.code"
        :class="['am-major-tab', { active: activeMajorCode === tab.code, 'is-missing': !tab.hasMatrix }]"
        type="button"
        @click="emit('select-major', tab.code)"
      >
        <strong>{{ tab.code }}</strong>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-if="!activeMatrix" class="am-empty">
      {{ emptyMessage }}
    </div>

    <div v-else class="am-matrix">
      <article
        v-for="row in activeMatrix.rows"
        :key="row.key"
        :class="['am-requirement-block', { 'is-expanded': expandedRowKey === row.key }]"
      >
        <div
          class="am-requirement-row"
          role="button"
          tabindex="0"
          :aria-expanded="expandedRowKey === row.key"
          @click="toggleRow(row)"
          @keydown.enter.prevent="toggleRow(row)"
        >
          <div class="am-row-copy">
            <span class="am-category">{{ row.category }}</span>
            <h3>{{ rowTitle(row) }}</h3>
            <small>{{ progressLabel(row.current) }}</small>
            <small v-if="hasProjectedChange(row.current, row.projected)" class="am-projected-copy">
              {{ progressLabel(row.projected, true) }}
            </small>
          </div>

          <div class="am-row-main">
            <div class="am-section-strip">
              <span
                v-for="section in visibleSectionSummaries(row)"
                :key="section.key"
                :class="['am-section-chip', `is-${section.kind}`]"
              >
                <strong>{{ sectionLabel(section) }}</strong>
                <small>{{ section.current.counted_courses }} / {{ section.current.required_courses || '-' }}</small>
              </span>
              <span
                v-if="hiddenSectionCount(row)"
                class="am-section-chip is-more"
              >
                <strong>{{ t('academicMap.requirements.moreSections', { count: hiddenSectionCount(row) }) }}</strong>
              </span>
            </div>

            <div class="am-course-lane">
              <span
                v-for="cell in summaryCourseCells(row)"
                :key="`${row.key}-summary-${cell.course_code}`"
                :class="['am-course-card', `is-${cellState(cell)}`]"
              >
                <strong>{{ cellLabel(cell) }}</strong>
                <small>{{ cellTitle(cell) }}</small>
                <em v-if="cell.shared_majors?.length">{{ cell.shared_majors.join('+') }}</em>
              </span>
              <span
                v-if="hiddenCourseCount(row)"
                class="am-more-course-card"
              >
                {{ t('academicMap.requirements.moreCourses', { count: hiddenCourseCount(row) }) }}
              </span>
            </div>
          </div>

          <div class="am-progress-group">
            <div :class="['am-progress-ring', { 'is-satisfied': row.current.satisfied }]">
              {{ row.current.counted_courses }} / {{ row.current.required_courses || '-' }}
            </div>
            <span class="am-expand-indicator">{{ expandedRowKey === row.key ? t('academicMap.requirements.collapse') : t('academicMap.requirements.expand') }}</span>
          </div>
        </div>

        <div v-if="expandedRowKey === row.key" class="am-row-drawer">
          <div class="am-drawer-head">
            <div>
              <strong>{{ rowTitle(row) }}</strong>
              <span>{{ progressLabel(row.current) }}</span>
            </div>
          </div>

          <div class="am-section-list">
            <section
              v-for="section in rowSections(row)"
              :key="section.key"
              class="am-expanded-section"
            >
              <div class="am-expanded-section-head">
                <div>
                  <strong>{{ sectionLabel(section) }}</strong>
                  <small>{{ progressLabel(section.current) }}</small>
                  <small v-if="hasProjectedChange(section.current, section.projected)" class="am-projected-copy">
                    {{ progressLabel(section.projected, true) }}
                  </small>
                </div>
                <span :class="['am-kind-badge', `is-${section.kind}`]">{{ sectionKindLabel(section) }}</span>
              </div>

              <div class="am-expanded-cell-grid">
                <span
                  v-for="cell in section.cells"
                  :key="`${section.key}-${cell.course_code}`"
                  :class="['am-expanded-cell', `is-${cellState(cell)}`]"
                >
                  <strong>{{ cellLabel(cell) }}</strong>
                  <small>{{ cellTitle(cell) }}</small>
                  <small class="am-cell-status">{{ t(`academicMap.requirements.status.${cellState(cell)}`) }}</small>
                  <small v-if="cell.allocation_status === 'excluded_duplicate' && cell.counted_toward">
                    {{ t('academicMap.requirements.countedToward', { section: cell.counted_toward }) }}
                  </small>
                  <em v-if="cell.shared_majors && cell.shared_majors.length > 1">{{ cell.shared_majors.join('+') }}</em>
                </span>
              </div>
            </section>
          </div>

          <div v-if="row.warnings.length" class="am-warning-list">
            <span v-for="warning in row.warnings" :key="warning">
              {{ warning.startsWith('missing_credit:') ? t('academicMap.requirements.creditToConfirm') : warning }}
            </span>
          </div>
        </div>
      </article>
    </div>
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

.am-major-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.am-major-tab {
  align-items: center;
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  gap: 7px;
  max-width: 100%;
  padding: 7px 12px;
  transition: all 0.2s ease;

  strong {
    color: inherit;
    font-size: 0.8rem;
  }

  span {
    font-size: 0.72rem;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.active,
  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-focus);
    color: var(--interactive-active);
  }

  &.is-missing:not(.active) {
    border-style: dashed;
  }
}

.am-empty {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  min-height: 140px;
  text-align: center;
}

.am-matrix {
  display: grid;
  gap: 10px;
}

.am-requirement-block {
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover,
  &:focus-within,
  &.is-expanded {
    border-color: var(--interactive-primary);
    box-shadow: var(--shadow-small);
  }

  &:hover {
    transform: translateY(-1px);
  }
}

.am-requirement-row {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(160px, 0.75fr) minmax(360px, 2.1fr) auto;
  padding: 12px;
  transition: background 0.2s ease;

  &:focus-visible {
    background: var(--bg-secondary);
    outline: none;
  }
}

.am-row-copy {
  min-width: 0;

  h3 {
    color: var(--text-primary);
    font-size: 0.95rem;
    margin: 2px 0 3px;
    overflow-wrap: anywhere;
  }

  small {
    color: var(--text-tertiary);
    font-size: 0.74rem;
  }
}

.am-category {
  color: var(--interactive-active);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.am-row-main {
  display: grid;
  gap: 9px;
  min-width: 0;
}

.am-projected-copy {
  color: var(--interactive-active) !important;
  display: block;
  margin-top: 3px;
}

.am-section-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.am-section-chip {
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  display: inline-flex;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  padding: 4px 8px;

  strong {
    color: var(--text-primary);
    font-size: 0.68rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--interactive-active);
    font-size: 0.66rem;
    font-weight: 850;
    white-space: nowrap;
  }
}

.am-course-lane {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  min-width: 0;
}

.am-course-card,
.am-more-course-card {
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  display: grid;
  min-width: 0;
  min-height: 78px;
  padding: 9px 10px;
}

.am-course-card {
  gap: 3px;

  strong {
    color: var(--text-primary);
    font-size: 0.86rem;
    font-weight: 900;
    line-height: 1.12;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--text-secondary);
    font-size: 0.72rem;
    line-height: 1.24;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    align-self: end;
    background: color-mix(in srgb, var(--interactive-primary) 11%, var(--surface-primary));
    border-radius: 999px;
    color: var(--interactive-active);
    font-size: 0.68rem;
    font-style: normal;
    font-weight: 900;
    justify-self: start;
    max-width: 100%;
    overflow: hidden;
    padding: 2px 7px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.am-more-course-card {
  align-items: center;
  background: var(--surface-primary);
  border-color: var(--border-focus);
  border-style: dashed;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 900;
  justify-items: center;
  text-align: center;
}

.is-more {
  background: var(--bg-secondary);
  border-color: var(--border-focus);
  border-style: dashed;
  place-items: center;
  text-align: center;
}

.am-progress-group {
  align-items: flex-end;
  display: grid;
  gap: 5px;
  justify-items: end;
}

.am-progress-ring {
  align-items: center;
  aspect-ratio: 1;
  background:
    radial-gradient(circle, var(--surface-primary) 58%, transparent 60%),
    conic-gradient(var(--interactive-primary) 0 100%, var(--bg-secondary) 0);
  border-radius: 999px;
  color: var(--interactive-active);
  display: grid;
  font-size: 0.86rem;
  font-weight: 950;
  justify-items: center;
  min-width: 58px;
  padding: 9px;
  place-items: center;
  text-align: center;
  white-space: nowrap;

  &.is-satisfied {
    background:
      radial-gradient(circle, var(--surface-primary) 58%, transparent 60%),
      conic-gradient(var(--semantic-success) 0 100%, var(--bg-secondary) 0);
    color: var(--interactive-active);
  }
}

.am-expand-indicator {
  color: var(--text-tertiary);
  font-size: 0.68rem;
  font-weight: 800;
}

.am-row-drawer {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  display: grid;
  gap: 12px;
  padding: 12px;
}

.am-drawer-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  div {
    display: grid;
    gap: 3px;
  }

  strong {
    color: var(--text-primary);
    font-size: 0.92rem;
  }

  span {
    color: var(--text-secondary);
    font-size: 0.78rem;
  }
}

.am-section-list {
  display: grid;
  gap: 10px;
}

.am-expanded-section {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  display: grid;
  gap: 10px;
  padding: 12px;
}

.am-expanded-section-head {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;

  div {
    display: grid;
    gap: 3px;
  }

  strong {
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  small {
    color: var(--text-secondary);
    font-size: 0.74rem;
  }
}

.am-kind-badge {
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  color: var(--interactive-active);
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 850;
  padding: 4px 8px;
}

.am-expanded-cell-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.am-expanded-cell {
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 9px 10px;

  strong {
    color: var(--text-primary);
    font-size: 0.78rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--text-tertiary);
    font-size: 0.7rem;
    line-height: 1.28;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .am-cell-status {
    color: var(--text-secondary);
    font-weight: 750;
  }

  em {
    color: var(--interactive-active);
    font-size: 0.66rem;
    font-style: normal;
    font-weight: 850;
  }
}

.is-in_progress {
  background: color-mix(in srgb, var(--semantic-info) 11%, transparent);
  border-color: color-mix(in srgb, var(--semantic-info) 38%, transparent);
}

.is-completed {
  background: color-mix(in srgb, var(--semantic-success) 10%, transparent);
  border-color: color-mix(in srgb, var(--semantic-success) 36%, transparent);
}

.is-planned {
  background: color-mix(in srgb, var(--interactive-primary) 8%, transparent);
  border-color: color-mix(in srgb, var(--interactive-primary) 30%, transparent);
}

.is-candidate {
  background: var(--surface-primary);
  border-color: var(--border-primary);
}

.is-excluded_duplicate,
.is-missing_credit {
  background: color-mix(in srgb, var(--semantic-warning) 10%, transparent);
  border-color: color-mix(in srgb, var(--semantic-warning) 35%, transparent);
}

.am-warning-list {
  display: grid;
  gap: 4px;

  span {
    color: var(--semantic-warning);
    font-size: 0.76rem;
  }
}

@media (max-width: 1100px) {
  .am-requirement-row {
    grid-template-columns: 1fr;
  }

  .am-course-lane {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }

  .am-progress-group {
    align-items: start;
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .am-course-lane {
    grid-template-columns: 1fr;
  }
}

</style>
