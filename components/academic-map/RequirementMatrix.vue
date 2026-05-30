<script setup lang="ts">
import type {
  AcademicProfile,
  AcademicRequirementCell,
  AcademicRequirementMatrix,
  AcademicRequirementRow,
} from '~/types/academic-map'

const props = defineProps<{
  matrices: AcademicRequirementMatrix[]
  activeMajor: string | null
  profile?: AcademicProfile | null
}>()

const emit = defineEmits<{
  (e: 'select-major', value: string): void
  (e: 'select-row', value: AcademicRequirementRow): void
}>()

const { locale, t } = useI18n()

const activeMatrix = computed(() => {
  return props.matrices.find(matrix => matrix.program_code === props.activeMajor) || props.matrices[0] || null
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

const emptyMessage = computed(() => {
  if (!props.profile?.cohort || !props.profile.target_majors.length) {
    return t('academicMap.requirements.emptyMissingProfile')
  }
  return t('academicMap.requirements.emptyMissingCatalog')
})
</script>

<template>
  <section class="am-card am-requirements">
    <div class="am-section-head">
      <div>
        <h2>{{ t('academicMap.requirements.title') }}</h2>
        <p>{{ t('academicMap.requirements.copy') }}</p>
      </div>
    </div>

    <div v-if="matrices.length > 0" class="am-major-tabs">
      <button
        v-for="matrix in matrices"
        :key="matrix.program_code"
        :class="['am-major-tab', { active: activeMatrix?.program_code === matrix.program_code }]"
        type="button"
        @click="emit('select-major', matrix.program_code)"
      >
        <strong>{{ matrix.program_code }}</strong>
        <span>{{ matrixTitle(matrix).replace(`${matrix.program_code} `, '') }}</span>
      </button>
    </div>

    <div v-if="!activeMatrix" class="am-empty">
      {{ emptyMessage }}
    </div>

    <div v-else class="am-matrix">
      <article
        v-for="row in activeMatrix.rows"
        :key="row.key"
        class="am-requirement-row"
        role="button"
        tabindex="0"
        @click="emit('select-row', row)"
        @keydown.enter.prevent="emit('select-row', row)"
      >
        <div class="am-row-copy">
          <span class="am-category">{{ row.category }}</span>
          <h3>{{ rowTitle(row) }}</h3>
          <small>{{ t('academicMap.requirements.minimums', { courses: row.detail.min_courses || '-', credits: row.detail.min_credits || '-' }) }}</small>
        </div>

        <div class="am-cell-lane">
          <button
            v-for="(cell, index) in row.visible_cells"
            :key="`${cell.kind}-${cell.course_code || cell.label || index}`"
            :class="['am-course-cell', `is-${cell.status}`]"
            type="button"
            @click.stop="emit('select-row', row)"
          >
            <span class="am-cell-code">{{ cellLabel(cell) }}</span>
            <span v-if="cell.kind === 'course'" class="am-cell-title">{{ cellTitle(cell) }}</span>
            <span v-if="cell.shared_majors && cell.shared_majors.length > 1" class="am-shared-tag">
              {{ cell.shared_majors.join('+') }}
            </span>
          </button>
        </div>

        <div class="am-progress-pill">
          {{ row.progress_label || t('academicMap.requirements.noProgress') }}
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

.am-requirement-row {
  align-items: center;
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  cursor: pointer;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(150px, 0.85fr) minmax(260px, 1.8fr) auto;
  padding: 12px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--interactive-primary);
    box-shadow: var(--shadow-small);
    outline: none;
    transform: translateY(-1px);
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

@media (max-width: 1100px) {
  .am-requirement-row {
    grid-template-columns: 1fr;
  }

  .am-progress-pill {
    justify-self: start;
  }
}

@media (max-width: 640px) {
  .am-cell-lane {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
