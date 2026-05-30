<script setup lang="ts">
import type {
  AcademicProfile,
  AcademicRequirementCell,
  AcademicRequirementMatrix,
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

const cellLabel = (cell: AcademicRequirementCell) => {
  if (cell.kind === 'more') {
    return t('academicMap.requirements.more', { count: cell.hidden_count || 0 })
  }
  return cell.course_code || cell.label || ''
}

const cellTitle = (cell: AcademicRequirementCell) => {
  return cell.title || t('academicMap.requirements.unknownTitle')
}

const sectionLabel = (section: AcademicRequirementSection) => {
  return locale.value === 'zh' ? section.label_zh || section.label_en : section.label_en
}

const sectionKindLabel = (section: AcademicRequirementSection) => {
  return t(`academicMap.requirements.sectionKinds.${section.kind}`)
}

const sectionProgress = (section: AcademicRequirementSection) => {
  const progress = section.progress_label || t('academicMap.requirements.noProgress')
  if (section.min_credits) {
    return t('academicMap.requirements.sectionProgressWithCredits', {
      progress,
      credits: section.min_credits,
    })
  }
  return t('academicMap.requirements.sectionProgress', { progress })
}

const rowSections = (row: AcademicRequirementRow): AcademicRequirementSection[] => {
  if (row.sections?.length) return row.sections
  return [{
    key: `${row.key}:all`,
    kind: 'required',
    label_en: rowTitle(row),
    label_zh: row.name_zh,
    required_count: row.detail.min_courses,
    total_count: row.all_cells.length,
    completed_count: row.all_cells.filter(cell => cell.status === 'now' || cell.status === 'done').length,
    min_credits: row.detail.min_credits,
    progress_label: row.progress_label,
    cells: row.all_cells,
  }]
}

const visibleSectionSummaries = (row: AcademicRequirementRow) => rowSections(row).slice(0, 3)

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
            <small>{{ t('academicMap.requirements.minimums', { courses: row.detail.min_courses || '-', credits: row.detail.min_credits || '-' }) }}</small>
          </div>

          <div class="am-row-main">
            <div class="am-section-strip">
              <span
                v-for="section in visibleSectionSummaries(row)"
                :key="section.key"
                :class="['am-section-chip', `is-${section.kind}`]"
              >
                <strong>{{ sectionLabel(section) }}</strong>
                <small>{{ section.progress_label || t('academicMap.requirements.noProgress') }}</small>
              </span>
            </div>

            <div class="am-cell-lane">
              <button
                v-for="(cell, index) in row.visible_cells"
                :key="`${cell.kind}-${cell.course_code || cell.label || index}`"
                :class="['am-course-cell', `is-${cell.status}`]"
                type="button"
                @click.stop="toggleRow(row)"
              >
                <span class="am-cell-code">{{ cellLabel(cell) }}</span>
                <span v-if="cell.kind === 'course'" class="am-cell-title">{{ cellTitle(cell) }}</span>
                <span v-if="cell.shared_majors && cell.shared_majors.length > 1" class="am-shared-tag">
                  {{ cell.shared_majors.join('+') }}
                </span>
              </button>
            </div>
          </div>

          <div class="am-progress-group">
            <div class="am-progress-pill">
              {{ row.progress_label || t('academicMap.requirements.noProgress') }}
            </div>
            <span class="am-expand-indicator">{{ expandedRowKey === row.key ? t('academicMap.requirements.collapse') : t('academicMap.requirements.expand') }}</span>
          </div>
        </div>

        <div v-if="expandedRowKey === row.key" class="am-row-drawer">
          <div class="am-drawer-head">
            <div>
              <strong>{{ rowTitle(row) }}</strong>
              <span>{{ t('academicMap.requirements.drawerCopy', { progress: row.progress_label || '-' }) }}</span>
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
                  <small>{{ sectionProgress(section) }}</small>
                </div>
                <span :class="['am-kind-badge', `is-${section.kind}`]">{{ sectionKindLabel(section) }}</span>
              </div>

              <div class="am-expanded-cell-grid">
                <span
                  v-for="cell in section.cells"
                  :key="`${section.key}-${cell.course_code || cell.label}`"
                  :class="['am-expanded-cell', `is-${cell.status}`]"
                >
                  <strong>{{ cellLabel(cell) }}</strong>
                  <small>{{ cellTitle(cell) }}</small>
                  <em v-if="cell.shared_majors && cell.shared_majors.length > 1">{{ cell.shared_majors.join('+') }}</em>
                </span>
              </div>
            </section>
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
  grid-template-columns: minmax(150px, 0.85fr) minmax(260px, 1.8fr) auto;
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
  gap: 8px;
  min-width: 0;
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

.am-cell-lane {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  min-width: 0;
}

.am-course-cell {
  appearance: none;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  display: grid;
  gap: 2px;
  min-height: 62px;
  min-width: 0;
  padding: 8px;
  position: relative;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: var(--shadow-small);
  }
}

.am-cell-code {
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.am-cell-title {
  color: var(--text-tertiary);
  font-size: 0.68rem;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.am-shared-tag {
  align-self: end;
  background: rgba(130, 89, 255, 0.1);
  border-radius: 999px;
  color: #6e4bd8;
  font-size: 0.62rem;
  font-weight: 850;
  justify-self: start;
  max-width: 100%;
  overflow: hidden;
  padding: 2px 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  place-items: center;
  text-align: center;
}

.am-progress-group {
  align-items: flex-end;
  display: grid;
  gap: 5px;
  justify-items: end;
}

.am-progress-pill {
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  color: var(--interactive-active);
  font-size: 0.78rem;
  font-weight: 850;
  justify-self: end;
  padding: 6px 10px;
  white-space: nowrap;
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

  em {
    color: var(--interactive-active);
    font-size: 0.66rem;
    font-style: normal;
    font-weight: 850;
  }
}

@media (max-width: 1100px) {
  .am-requirement-row {
    grid-template-columns: 1fr;
  }

  .am-progress-group {
    align-items: start;
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .am-cell-lane {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
