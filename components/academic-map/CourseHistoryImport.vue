<script setup lang="ts">
import type { AcademicCourseRecord } from '~/types/academic-map'

const props = defineProps<{
  parsing?: boolean
  saving?: boolean
  existingRecords?: AcademicCourseRecord[]
  draftStorageKey?: string
}>()

const emit = defineEmits<{
  (e: 'parse', value: string): void
  (e: 'save', value: { records: AcademicCourseRecord[]; keepGrades: boolean; deleteRecords?: AcademicCourseRecord[] }): void
}>()

const { t } = useI18n()

const pasteText = ref('')
const pickerVisible = ref(false)
const pickerRef = ref<InstanceType<typeof AcademicMapCoursePickerImport> | null>(null)
const exampleImageUrl = '/image/academic-map/sis-course-history-example.png'

const setRows = (rows: AcademicCourseRecord[]) => {
  pickerVisible.value = true
  nextTick(() => {
    pickerRef.value?.mergeImportedRows(rows)
  })
}

const parse = () => {
  if (!pasteText.value.trim()) return
  emit('parse', pasteText.value)
}

const savePickedCourses = (payload: { records: AcademicCourseRecord[]; keepGrades: boolean; deleteRecords?: AcademicCourseRecord[] }) => {
  emit('save', payload)
  pickerVisible.value = false
}

defineExpose({ setRows })
</script>

<template>
  <section class="am-card am-import">
    <div class="am-section-head">
      <div>
        <h2>{{ t('academicMap.import.title') }}</h2>
      </div>
    </div>

    <div class="am-import-methods">
      <span>{{ t('academicMap.import.methodLabel') }}</span>
      <button class="am-method-btn active" type="button">
        {{ t('academicMap.import.sisMethod') }}
      </button>
      <button class="am-method-btn" type="button" @click="pickerVisible = true">
        {{ t('academicMap.import.picker.open') }}
      </button>
    </div>

    <p class="am-sis-hint">
      {{ t('academicMap.import.copyPrefix') }}
      <a class="am-example-link" :href="exampleImageUrl" target="_blank" rel="noopener noreferrer">
        {{ t('academicMap.import.exampleLink') }}
      </a>
    </p>

    <textarea
      v-model="pasteText"
      class="am-paste-box"
      :placeholder="t('academicMap.import.placeholder')"
      rows="7"
    />

    <div class="am-parse-row">
      <button class="am-primary-btn" :disabled="props.parsing || !pasteText.trim()" type="button" @click="parse">
        {{ props.parsing ? t('academicMap.import.parsing') : t('academicMap.import.parse') }}
      </button>
    </div>

    <AcademicMapCoursePickerImport
      ref="pickerRef"
      :visible="pickerVisible"
      :saving="props.saving"
      :existing-records="props.existingRecords || []"
      :draft-storage-key="props.draftStorageKey"
      @close="pickerVisible = false"
      @save="savePickedCourses"
    />
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

.am-example-link {
  border-bottom: 1px solid currentColor;
  color: var(--interactive-active);
  font-weight: 850;
  text-decoration: none;
  text-underline-offset: 3px;
  transition: color 0.2s ease;

  &:hover,
  &:focus-visible {
    color: var(--interactive-primary);
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

.am-outline-btn,
.am-method-btn {
  align-items: center;
  background: var(--surface-primary);
  border: 1px solid var(--border-focus);
  border-radius: 999px;
  color: var(--interactive-active);
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  padding: 8px 18px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.am-import-methods {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;

  > span {
    color: var(--text-secondary);
    font-size: 0.84rem;
    font-weight: 800;
    margin-right: 2px;
  }
}

.am-method-btn {
  border-color: var(--border-secondary);
  color: var(--text-secondary);
  font-size: 0.84rem;
  inline-size: 106px;
  min-height: 36px;
  padding: 0 12px;

  &.active,
  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--interactive-primary) 34%, transparent);
    color: var(--interactive-active);
  }
}

.am-sis-hint {
  color: var(--text-secondary);
  font-size: 0.86rem;
  line-height: 1.5;
  margin: 0 0 14px;
}

.am-parse-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
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

  .am-parse-row {
    justify-content: flex-start;
  }
}
</style>
