<script setup lang="ts">
import type { AcademicCourseRecord } from '~/types/academic-map'

const props = defineProps<{
  parsing?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'parse', value: string): void
  (e: 'save', value: { records: AcademicCourseRecord[]; keepGrades: boolean }): void
}>()

const { t } = useI18n()

const pasteText = ref('')
const previewRows = ref<AcademicCourseRecord[]>([])
const keepGrades = ref(false)

const hasRows = computed(() => previewRows.value.length > 0)

const setRows = (rows: AcademicCourseRecord[]) => {
  previewRows.value = rows.map(row => ({
    ...row,
    status: row.status || 'completed',
    keep_grade: keepGrades.value && !!row.grade,
  }))
}

const updateRow = (index: number, patch: Partial<AcademicCourseRecord>) => {
  previewRows.value[index] = { ...previewRows.value[index], ...patch }
}

const removeRow = (index: number) => {
  previewRows.value = previewRows.value.filter((_, rowIndex) => rowIndex !== index)
}

const parse = () => {
  if (!pasteText.value.trim()) return
  emit('parse', pasteText.value)
}

const save = () => {
  emit('save', {
    records: previewRows.value,
    keepGrades: keepGrades.value,
  })
}

defineExpose({ setRows })
</script>

<template>
  <section class="am-card am-import">
    <div class="am-section-head">
      <div>
        <h2>{{ t('academicMap.import.title') }}</h2>
        <p>{{ t('academicMap.import.copy') }}</p>
      </div>
      <button class="am-primary-btn" :disabled="props.parsing || !pasteText.trim()" type="button" @click="parse">
        {{ props.parsing ? t('academicMap.import.parsing') : t('academicMap.import.parse') }}
      </button>
    </div>

    <textarea
      v-model="pasteText"
      class="am-paste-box"
      :placeholder="t('academicMap.import.placeholder')"
      rows="7"
    />

    <label class="am-grade-toggle">
      <input v-model="keepGrades" type="checkbox" />
      <span>
        <strong>{{ t('academicMap.import.keepGrades') }}</strong>
        <small>{{ t('academicMap.import.keepGradesCopy') }}</small>
      </span>
    </label>

    <div v-if="hasRows" class="am-preview">
      <div class="am-preview-head">
        <h3>{{ t('academicMap.import.previewTitle', { count: previewRows.length }) }}</h3>
        <button class="am-primary-btn" :disabled="props.saving || previewRows.length === 0" type="button" @click="save">
          {{ props.saving ? t('academicMap.import.saving') : t('academicMap.import.save') }}
        </button>
      </div>

      <div class="am-preview-list">
        <article v-for="(row, index) in previewRows" :key="`${row.course_code}-${index}`" class="am-preview-row">
          <div class="am-row-main">
            <input
              :value="row.course_code"
              class="am-code-input"
              @input="updateRow(index, { course_code: ($event.target as HTMLInputElement).value.toUpperCase() })"
            />
            <div class="am-row-copy">
              <input
                :value="row.course_title || ''"
                class="am-title-input"
                :placeholder="t('academicMap.import.courseTitle')"
                @input="updateRow(index, { course_title: ($event.target as HTMLInputElement).value })"
              />
              <span>{{ row.term_label || t('academicMap.import.noTerm') }} / {{ row.units || 0 }} {{ t('academicMap.units') }}</span>
            </div>
          </div>

          <div class="am-row-side">
            <AcademicMapCourseStatusChips
              :model-value="row.status"
              compact
              @update:model-value="updateRow(index, { status: $event })"
            />
            <span v-if="keepGrades && row.grade" class="am-grade-pill">{{ row.grade }}</span>
            <button class="am-icon-btn" type="button" :aria-label="t('academicMap.import.remove')" @click="removeRow(index)">
              x
            </button>
          </div>

          <p v-if="row.needs_review" class="am-review-note">
            {{ row.review_reason || t('academicMap.import.needsReview') }}
          </p>
        </article>
      </div>
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

.am-section-head,
.am-preview-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;

  h2,
  h3 {
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

.am-primary-btn {
  border: 0;
  border-radius: 999px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  cursor: pointer;
  font-weight: 700;
  padding: 8px 18px;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
}

.am-paste-box {
  width: 100%;
  resize: vertical;
  box-sizing: border-box;
  border: 1.5px solid var(--border-primary);
  border-radius: 14px;
  color: var(--text-primary);
  background: var(--surface-primary);
  font-size: 0.9rem;
  line-height: 1.6;
  outline: none;
  padding: 12px 14px;

  &:focus {
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px rgba(38, 164, 255, 0.12);
  }
}

.am-grade-toggle {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 14px;
  color: var(--text-secondary);
  cursor: pointer;

  input {
    margin-top: 4px;
  }

  strong,
  small {
    display: block;
  }

  strong {
    color: var(--text-primary);
    font-size: 0.88rem;
  }

  small {
    margin-top: 2px;
    line-height: 1.45;
  }
}

.am-preview {
  border-top: 1px solid var(--border-primary);
  margin-top: 18px;
  padding-top: 18px;
}

.am-preview-list {
  display: grid;
  gap: 10px;
}

.am-preview-row {
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  padding: 12px;
}

.am-row-main,
.am-row-side {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.am-row-main {
  min-width: 0;
}

.am-row-side {
  justify-content: space-between;
  margin-top: 10px;
}

.am-code-input,
.am-title-input {
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-primary);
  outline: none;

  &:focus {
    border-color: var(--border-focus);
    background: var(--bg-secondary);
  }
}

.am-code-input {
  width: 112px;
  flex: 0 0 112px;
  color: var(--interactive-active);
  font-weight: 800;
  padding: 6px 8px;
}

.am-row-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 3px;

  span {
    color: var(--text-tertiary);
    font-size: 0.78rem;
  }
}

.am-title-input {
  width: 100%;
  box-sizing: border-box;
  font-weight: 650;
  padding: 6px 8px;
}

.am-grade-pill {
  align-self: center;
  border-radius: 999px;
  background: rgba(38, 164, 255, 0.1);
  color: var(--interactive-active);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 5px 10px;
}

.am-icon-btn {
  align-self: center;
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  height: 28px;
  width: 28px;
}

.am-review-note {
  color: var(--warning-color, #a86600);
  font-size: 0.78rem;
  margin: 8px 0 0;
}

@media (max-width: 720px) {
  .am-section-head,
  .am-preview-head,
  .am-row-main,
  .am-row-side {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
