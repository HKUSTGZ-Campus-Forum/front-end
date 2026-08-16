<script setup lang="ts">
import type { AcademicCourseRecord } from '~/types/academic-map'
import {
  ACADEMIC_MAP_MANUAL_TERM_OPTIONS,
  buildAcademicMapDraftStoragePayload,
  buildAcademicMapManualRecord,
  buildAcademicMapPickerActionState,
  buildAcademicMapPickerDraftFromImportRows,
  buildAcademicMapPrefixOptions,
  normalizeAcademicMapCatalogCourses,
  restoreAcademicMapDraftStoragePayload,
  type AcademicMapCatalogCourse,
  type AcademicMapPickerDraft,
  type AcademicMapPickerMeta,
} from '~/utils/academicMapManualImport'

const props = defineProps<{
  visible: boolean
  saving?: boolean
  existingRecords?: AcademicCourseRecord[]
  draftStorageKey?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { records: AcademicCourseRecord[]; keepGrades: boolean; deleteRecords: AcademicCourseRecord[] }): void
}>()

const { t } = useI18n()
const { fetchPublic } = useApi()

const courses = ref<AcademicMapCatalogCourse[]>([])
const selectedPrefix = ref('')
const searchQuery = ref('')
const selectedCourses = ref<Map<string, AcademicMapCatalogCourse>>(new Map())
const selectedMeta = ref<Map<string, AcademicMapPickerMeta>>(new Map())
const pendingRemovalRecords = ref<Map<string, AcademicCourseRecord>>(new Map())
const loading = ref(false)
const errorMessage = ref('')
const isRestoringDraft = ref(false)

const compactCode = (value: string) => value.replace(/\s+/g, '').toUpperCase()

const existingCodeSet = computed(() => new Set(
  (props.existingRecords || []).map(record => compactCode(record.course_code)),
))

const existingRecordMap = computed(() => {
  const records = new Map<string, AcademicCourseRecord>()
  for (const record of props.existingRecords || []) records.set(compactCode(record.course_code), record)
  return records
})

const prefixOptions = computed(() => buildAcademicMapPrefixOptions(courses.value))

const visibleCourses = computed(() => {
  const query = searchQuery.value.trim().toUpperCase()
  return courses.value
    .filter(course => (!selectedPrefix.value || course.prefix === selectedPrefix.value))
    .filter(course => !query || course.compactCode.includes(query) || course.title.toUpperCase().includes(query))
    .sort((a, b) => a.compactCode.localeCompare(b.compactCode))
})

const selectedList = computed(() => Array.from(selectedCourses.value.values()).sort((a, b) => (
  a.compactCode.localeCompare(b.compactCode)
)))

const pendingRemovalList = computed(() => Array.from(pendingRemovalRecords.value.values()).sort((a, b) => (
  compactCode(a.course_code).localeCompare(compactCode(b.course_code))
)))

const cartCount = computed(() => selectedList.value.length + pendingRemovalList.value.length)

const actionState = computed(() => buildAcademicMapPickerActionState({
  importCount: selectedList.value.length,
  removalCount: pendingRemovalList.value.length,
}))

const missingTermCount = computed(() => selectedList.value.filter(course => !selectedTerm(course)).length)

const canSaveSelection = computed(() => actionState.value.hasChanges && missingTermCount.value === 0 && !props.saving)

watch(
  () => props.visible,
  visible => {
    if (visible) {
      restoreDraft()
      loadCourses()
    }
  },
)

watch(
  () => props.draftStorageKey,
  () => restoreDraft(),
)

watch(
  [selectedCourses, selectedMeta, pendingRemovalRecords],
  () => persistDraft(),
)

watch(prefixOptions, options => {
  if (!selectedPrefix.value && options.length) selectedPrefix.value = options[0].prefix
})

async function loadCourses() {
  if (courses.value.length || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetchPublic('/api/courses?stage=all')
    if (!response.ok) throw new Error('Failed to load courses')
    const data = await response.json()
    courses.value = normalizeAcademicMapCatalogCourses(Array.isArray(data) ? data : [])
  } catch {
    errorMessage.value = t('academicMap.import.picker.loadFailed')
  } finally {
    loading.value = false
  }
}

function toggleCourse(course: AcademicMapCatalogCourse) {
  if (selectedCourses.value.has(course.compactCode)) {
    removeCourse(course)
    return
  }
  if (existingCodeSet.value.has(course.compactCode)) {
    const record = existingRecordMap.value.get(course.compactCode)
    if (record) toggleExistingRemoval(record)
    return
  }
  const next = new Map(selectedCourses.value)
  const nextMeta = new Map(selectedMeta.value)
  if (next.has(course.compactCode)) {
    next.delete(course.compactCode)
    nextMeta.delete(course.compactCode)
  } else {
    next.set(course.compactCode, course)
    nextMeta.set(course.compactCode, { status: 'completed', grade: '', termCode: '' })
  }
  selectedCourses.value = next
  selectedMeta.value = nextMeta
}

function removeCourse(course: AcademicMapCatalogCourse) {
  const next = new Map(selectedCourses.value)
  const nextMeta = new Map(selectedMeta.value)
  next.delete(course.compactCode)
  nextMeta.delete(course.compactCode)
  selectedCourses.value = next
  selectedMeta.value = nextMeta
}

function toggleExistingRemoval(record: AcademicCourseRecord) {
  const code = compactCode(record.course_code)
  const next = new Map(pendingRemovalRecords.value)
  if (next.has(code)) {
    next.delete(code)
  } else {
    next.set(code, record)
  }
  pendingRemovalRecords.value = next
}

function updateSelectedMeta(course: AcademicMapCatalogCourse, patch: Partial<AcademicMapPickerMeta>) {
  const current = selectedMeta.value.get(course.compactCode) || { status: 'completed', grade: '', termCode: '' }
  selectedMeta.value = new Map(selectedMeta.value).set(course.compactCode, { ...current, ...patch })
}

function selectedStatus(course: AcademicMapCatalogCourse) {
  return selectedMeta.value.get(course.compactCode)?.status || 'completed'
}

function selectedGrade(course: AcademicMapCatalogCourse) {
  return selectedMeta.value.get(course.compactCode)?.grade || ''
}

function selectedTerm(course: AcademicMapCatalogCourse) {
  return selectedMeta.value.get(course.compactCode)?.termCode || ''
}

function isPendingRemoval(course: AcademicMapCatalogCourse) {
  return pendingRemovalRecords.value.has(course.compactCode)
}

function resetSelection() {
  selectedCourses.value = new Map()
  selectedMeta.value = new Map()
  pendingRemovalRecords.value = new Map()
}

function closePicker() {
  emit('close')
}

function storageKey() {
  return props.draftStorageKey || ''
}

function currentDraft(): AcademicMapPickerDraft {
  return {
    items: selectedList.value.map(course => ({
      course,
      meta: selectedMeta.value.get(course.compactCode) || { status: 'completed', grade: '', termCode: '' },
    })),
    removals: pendingRemovalList.value,
  }
}

function applyDraft(draft: AcademicMapPickerDraft) {
  isRestoringDraft.value = true
  selectedCourses.value = new Map(draft.items.map(item => [item.course.compactCode, item.course]))
  selectedMeta.value = new Map(draft.items.map(item => [
    item.course.compactCode,
    {
      status: item.meta.status || 'completed',
      grade: item.meta.grade || '',
      termCode: item.meta.termCode || '',
    },
  ]))
  pendingRemovalRecords.value = new Map(draft.removals.map(record => [compactCode(record.course_code), record]))
  nextTick(() => {
    isRestoringDraft.value = false
  })
}

function restoreDraft() {
  const key = storageKey()
  if (!process.client || !key) return
  const draft = restoreAcademicMapDraftStoragePayload(window.localStorage.getItem(key))
  if (draft) applyDraft(draft)
}

function persistDraft() {
  const key = storageKey()
  if (!process.client || !key || isRestoringDraft.value) return
  const draft = currentDraft()
  if (!draft.items.length && !draft.removals.length) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, JSON.stringify(buildAcademicMapDraftStoragePayload(draft)))
}

function clearPersistedDraft() {
  const key = storageKey()
  if (process.client && key) window.localStorage.removeItem(key)
}

function mergeImportedRows(rows: AcademicCourseRecord[]) {
  const importedDraft = buildAcademicMapPickerDraftFromImportRows(rows)
  if (!importedDraft.items.length) return importedDraft

  const nextCourses = new Map(selectedCourses.value)
  const nextMeta = new Map(selectedMeta.value)
  for (const item of importedDraft.items) {
    nextCourses.set(item.course.compactCode, item.course)
    nextMeta.set(item.course.compactCode, item.meta)
  }
  selectedCourses.value = nextCourses
  selectedMeta.value = nextMeta
  return importedDraft
}

function saveSelection() {
  if (!canSaveSelection.value) return
  const rows = selectedList.value.map(course => buildAcademicMapManualRecord(course, selectedMeta.value.get(course.compactCode)))
  emit('save', {
    records: rows,
    keepGrades: rows.some(row => !!row.grade),
    deleteRecords: pendingRemovalList.value,
  })
  resetSelection()
  clearPersistedDraft()
}

defineExpose({ mergeImportedRows, restoreDraft })
</script>

<template>
  <Teleport to="body">
    <Transition name="am-picker-modal">
      <div v-if="visible" class="am-picker" @click.self="closePicker">
        <section class="am-picker__dialog" role="dialog" aria-modal="true" :aria-label="t('academicMap.import.picker.title')">
          <header class="am-picker__header">
            <h2>{{ t('academicMap.import.picker.title') }}</h2>
            <button class="am-picker__close" type="button" :aria-label="t('common.close')" @click="closePicker">
              <span aria-hidden="true"></span>
            </button>
          </header>

          <div class="am-picker__body">
            <aside class="am-picker__prefix-panel">
              <input
                v-model="searchQuery"
                class="am-picker__search"
                type="search"
                :placeholder="t('academicMap.import.picker.search')"
              />
              <div class="am-picker__prefix-list">
                <button
                  v-for="option in prefixOptions"
                  :key="option.prefix"
                  type="button"
                  class="am-picker__prefix"
                  :class="{ active: selectedPrefix === option.prefix }"
                  @click="selectedPrefix = option.prefix"
                >
                  <span>{{ option.prefix }}</span>
                  <small>{{ option.count }}</small>
                </button>
              </div>
            </aside>

            <main class="am-picker__course-panel">
              <div class="am-picker__panel-head">
                <h3>{{ selectedPrefix || t('academicMap.import.picker.allCourses') }}</h3>
                <span>{{ visibleCourses.length }}</span>
              </div>

              <div v-if="loading" class="am-picker__state">{{ t('common.loading') }}</div>
              <div v-else-if="errorMessage" class="am-picker__state am-picker__state--error">{{ errorMessage }}</div>
              <div v-else-if="visibleCourses.length === 0" class="am-picker__state">{{ t('common.noResults') }}</div>
              <div v-else class="am-picker__course-list">
                <article
                  v-for="course in visibleCourses"
                  :key="course.compactCode"
                  class="am-picker__course"
                  :class="{
                    selected: selectedCourses.has(course.compactCode),
                    imported: existingCodeSet.has(course.compactCode),
                    removing: isPendingRemoval(course),
                  }"
                  @click="toggleCourse(course)"
                >
                  <span class="am-picker__checkbox" aria-hidden="true"></span>
                  <div class="am-picker__course-main">
                    <strong>{{ course.code }}</strong>
                    <span>{{ course.title || t('academicMap.records.untitled') }}</span>
                    <small v-if="course.credits !== null">{{ course.credits }} {{ t('academicMap.units') }}</small>
	                  </div>
	                  <button
	                    v-if="existingCodeSet.has(course.compactCode) && !selectedCourses.has(course.compactCode)"
	                    class="am-picker__course-action am-picker__course-action--danger"
	                    type="button"
	                    @click.stop="toggleExistingRemoval(existingRecordMap.get(course.compactCode)!)"
                  >
                    {{ isPendingRemoval(course)
                        ? t('academicMap.import.picker.pendingRemove')
                        : t('academicMap.import.picker.removeImported') }}
	                  </button>
	                  <button v-else class="am-picker__course-action" type="button">
	                    {{ selectedCourses.has(course.compactCode)
	                        ? t(existingCodeSet.has(course.compactCode) ? 'academicMap.import.picker.pendingUpdate' : 'academicMap.import.picker.pendingAdd')
	                        : t('academicMap.import.picker.add') }}
	                  </button>
                </article>
              </div>
            </main>

            <aside class="am-picker__cart-panel">
              <div class="am-picker__panel-head">
                <h3>{{ t('academicMap.import.picker.cartTitle', { count: cartCount }) }}</h3>
              </div>
              <div v-if="cartCount === 0" class="am-picker__state">{{ t('academicMap.import.picker.empty') }}</div>
              <div v-else class="am-picker__cart-list">
                <article v-for="course in selectedList" :key="course.compactCode" class="am-picker__cart-item">
                  <div class="am-picker__cart-main">
	                    <div class="am-picker__cart-title-row">
	                      <strong>{{ course.code }}</strong>
	                      <small class="am-picker__change-pill am-picker__change-pill--add">
	                        {{ t(existingCodeSet.has(course.compactCode) ? 'academicMap.import.picker.pendingUpdate' : 'academicMap.import.picker.pendingAdd') }}
	                      </small>
	                    </div>
                    <span>{{ course.title || t('academicMap.records.untitled') }}</span>
                    <div class="am-picker__cart-fields">
                      <select
                        :value="selectedTerm(course)"
                        class="am-picker__term-select"
	                        :aria-label="t('academicMap.import.picker.termLabel')"
	                        required
	                        @change="updateSelectedMeta(course, { termCode: ($event.target as HTMLSelectElement).value })"
	                      >
                        <option value="" disabled>{{ t('academicMap.import.picker.termPlaceholder') }}</option>
                        <option
                          v-for="term in ACADEMIC_MAP_MANUAL_TERM_OPTIONS"
                          :key="term.value"
                          :value="term.value"
                        >
                          {{ term.label }}
                        </option>
                      </select>
                      <div class="am-picker__status-group" :aria-label="t('academicMap.import.picker.statusLabel')">
                        <button
                          type="button"
                          :class="{ active: selectedStatus(course) === 'completed' }"
                          @click="updateSelectedMeta(course, { status: 'completed' })"
                        >
                          {{ t('academicMap.status.completed') }}
                        </button>
                        <button
                          type="button"
                          :class="{ active: selectedStatus(course) === 'in_progress' }"
                          @click="updateSelectedMeta(course, { status: 'in_progress' })"
                        >
                          {{ t('academicMap.status.in_progress') }}
                        </button>
                      </div>
                      <input
                        :value="selectedGrade(course)"
                        class="am-picker__grade-input"
                        type="text"
                        :placeholder="t('academicMap.import.picker.gradePlaceholder')"
                        @input="updateSelectedMeta(course, { grade: ($event.target as HTMLInputElement).value })"
                      />
                    </div>
                  </div>
                  <button class="am-picker__remove-btn" type="button" :aria-label="t('academicMap.import.remove')" @click="removeCourse(course)">
                    <span aria-hidden="true"></span>
                  </button>
                </article>
                <article v-for="record in pendingRemovalList" :key="`remove-${record.id || record.course_code}`" class="am-picker__cart-item am-picker__cart-item--remove">
                  <div class="am-picker__cart-main">
                    <div class="am-picker__cart-title-row">
                      <strong>{{ record.course_code }}</strong>
                      <small class="am-picker__change-pill am-picker__change-pill--remove">
                        {{ t('academicMap.import.picker.pendingRemove') }}
                      </small>
                    </div>
                    <span>{{ record.course_title || t('academicMap.records.untitled') }}</span>
                    <small class="am-picker__cart-meta">
                      {{ record.term_label || t('academicMap.import.noTerm') }}
                    </small>
                  </div>
                  <button class="am-picker__remove-btn" type="button" :aria-label="t('academicMap.import.picker.cancelRemove')" @click="toggleExistingRemoval(record)">
                    <span aria-hidden="true"></span>
                  </button>
                </article>
              </div>
            </aside>
          </div>

          <footer class="am-picker__footer">
            <span>
              {{ missingTermCount > 0
                  ? t('academicMap.import.picker.missingTerm', { count: missingTermCount })
                  : t('academicMap.import.picker.defaultStatus') }}
            </span>
            <div class="am-picker__actions">
              <button class="am-picker__secondary" type="button" @click="closePicker">
                {{ t('actions.cancel') }}
              </button>
              <button
                class="am-picker__primary"
                :class="`am-picker__primary--${actionState.tone}`"
                type="button"
                :disabled="!canSaveSelection"
                @click="saveSelection"
              >
                {{ props.saving ? t('academicMap.import.saving') : t(actionState.labelKey, actionState.labelParams) }}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.am-picker {
  align-items: center;
  background: var(--modal-backdrop);
  backdrop-filter: blur(4px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 24px;
  position: fixed;
  z-index: 1120;
}

.am-picker__dialog {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--modal-shadow);
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: min(760px, calc(100vh - 64px));
  overflow: hidden;
  width: min(1120px, calc(100vw - 112px));
}

.am-picker__header {
  align-items: center;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  padding: 18px 24px;

  h2 {
    color: var(--text-primary);
    font-size: 1.12rem;
    margin: 0;
  }
}

.am-picker__close,
.am-picker__remove-btn {
  align-items: center;
  aspect-ratio: 1;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 50%;
  box-sizing: border-box;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;
  line-height: 1;
  padding: 0;
  position: relative;

  &::before,
  &::after {
    background: currentColor;
    border-radius: 999px;
    content: "";
    display: block;
    height: 2px;
    position: absolute;
    width: 14px;
  }

  &::before {
    transform: rotate(45deg);
  }

  &::after {
    transform: rotate(-45deg);
  }

  span {
    display: none;
  }

  &:hover,
  &:focus-visible {
    background: var(--surface-secondary);
    border-color: var(--border-primary);
    color: var(--text-primary);
  }
}

.am-picker__close {
  block-size: 38px;
  inline-size: 38px;
  max-block-size: 38px;
  max-inline-size: 38px;
  min-block-size: 38px;
  min-inline-size: 38px;
}

.am-picker__body {
  display: grid;
  gap: 16px;
  grid-template-columns: 220px minmax(360px, 1fr) 320px;
  min-height: 0;
  padding: 16px 24px;
}

.am-picker__prefix-panel,
.am-picker__course-panel,
.am-picker__cart-panel {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  min-height: 0;
  overflow: hidden;
}

.am-picker__prefix-panel,
.am-picker__course-panel,
.am-picker__cart-panel {
  display: grid;
}

.am-picker__prefix-panel {
  grid-template-rows: auto 1fr;
}

.am-picker__course-panel,
.am-picker__cart-panel {
  grid-template-rows: auto 1fr;
}

.am-picker__search {
  background: var(--surface-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  color: var(--text-primary);
  height: 40px;
  margin: 14px;
  outline: none;
  padding: 0 12px;

  &:focus {
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 12%, transparent);
  }
}

.am-picker__prefix-list {
  align-content: start;
  display: grid;
  gap: 7px;
  overflow: auto;
  padding: 0 10px 14px;
}

.am-picker__prefix {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  font-weight: 700;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 10px;

  small {
    color: var(--text-muted);
    font-size: 0.76rem;
  }

  &.active,
  &:hover {
    background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--interactive-primary) 34%, transparent);
    color: var(--interactive-active);
  }
}

.am-picker__panel-head {
  align-items: center;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  min-height: 58px;
  padding: 0 14px;

  h3 {
    color: var(--text-primary);
    font-size: 0.98rem;
    margin: 0;
  }

  span {
    border-radius: 999px;
    background: var(--surface-secondary);
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 800;
    padding: 5px 10px;
  }
}

.am-picker__course-list,
.am-picker__cart-list {
  align-content: start;
  display: grid;
  gap: 10px;
  overflow: auto;
  padding: 12px 14px;
}

.am-picker__course {
  align-items: flex-start;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 13px;
  cursor: pointer;
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 12px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: var(--border-primary);
    box-shadow: var(--shadow-small);
    transform: translateY(-1px);
  }

  &.imported {
    background: color-mix(in srgb, var(--surface-secondary) 74%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--interactive-primary) 24%, var(--border-secondary));

    .am-picker__checkbox {
      background: var(--surface-primary);
      border-color: var(--interactive-primary);

      &::after {
        color: var(--interactive-active);
        content: "✓";
        font-size: 0.82rem;
        font-weight: 900;
        line-height: 1;
      }
    }
  }

  &.removing {
    background: color-mix(in srgb, var(--semantic-error, #e55353) 7%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--semantic-error, #e55353) 38%, var(--border-secondary));

    .am-picker__checkbox {
      background: color-mix(in srgb, var(--semantic-error, #e55353) 12%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--semantic-error, #e55353) 60%, var(--border-secondary));

      &::after {
        color: var(--semantic-error, #b13434);
      }
    }
  }
}

.am-picker__checkbox {
  align-items: center;
  border: 1.5px solid var(--border-primary);
  border-radius: 7px;
  display: inline-flex;
  height: 22px;
  justify-content: center;
  margin-top: 1px;
  width: 22px;
}

.am-picker__course.selected .am-picker__checkbox {
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);

  &::after {
    color: var(--text-inverse);
    content: "✓";
    font-size: 0.82rem;
    font-weight: 900;
    line-height: 1;
  }
}

.am-picker__course-main {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    color: var(--text-primary);
    font-size: 0.92rem;
  }

  span {
    color: var(--text-secondary);
    font-size: 0.83rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--text-muted);
    font-size: 0.76rem;
    font-weight: 800;
  }
}

.am-picker__course-action {
  align-items: center;
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-weight: 800;
  block-size: 30px;
  inline-size: auto;
  justify-content: center;
  max-block-size: 30px;
  min-width: 72px;
  min-block-size: 30px;
  padding: 0 12px;

  &:disabled {
    cursor: not-allowed;
  }

  &--danger {
    background: color-mix(in srgb, var(--semantic-error, #e55353) 8%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--semantic-error, #e55353) 28%, var(--border-secondary));
    color: var(--semantic-error, #b13434);
  }
}

.am-picker__cart-panel {
  background: var(--surface-secondary);
}

.am-picker__cart-item {
  align-items: start;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 10px;

  strong,
  > div > span {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--text-primary);
    font-size: 0.84rem;
  }

  > div > span {
    color: var(--text-secondary);
    font-size: 0.78rem;
    margin-top: 3px;
  }

  .am-picker__remove-btn {
    block-size: 28px;
    inline-size: 28px;
    margin-top: 2px;
    max-block-size: 28px;
    max-inline-size: 28px;
    min-block-size: 28px;
    min-inline-size: 28px;

    &::before,
    &::after {
      width: 11px;
    }
  }
}

.am-picker__cart-main {
  min-width: 0;
}

.am-picker__cart-title-row {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
}

.am-picker__change-pill {
  border-radius: 999px;
  flex: 0 0 auto;
  font-size: 0.7rem;
  font-weight: 900;
  padding: 3px 8px;

  &--add {
    background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
    color: var(--interactive-active);
  }

  &--remove {
    background: color-mix(in srgb, var(--semantic-error, #e55353) 10%, var(--surface-primary));
    color: var(--semantic-error, #b13434);
  }
}

.am-picker__cart-item--remove {
  background: color-mix(in srgb, var(--semantic-error, #e55353) 5%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--semantic-error, #e55353) 24%, var(--border-secondary));
}

.am-picker__cart-meta {
  color: var(--text-muted);
  display: block;
  font-size: 0.74rem;
  font-weight: 750;
  margin-top: 8px;
}

.am-picker__cart-fields {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.am-picker__status-group {
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 32px;
  padding: 3px;

  button {
    background: transparent;
    border: 0;
    border-radius: 999px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.76rem;
    font-weight: 800;
    min-height: 26px;
    padding: 0 8px;

    &.active {
      background: var(--surface-primary);
      box-shadow: var(--shadow-small);
      color: var(--interactive-active);
    }
  }
}

.am-picker__term-select,
.am-picker__grade-input {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.8rem;
  height: 34px;
  outline: none;
  padding: 0 10px;
  width: 100%;

  &:focus {
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 12%, transparent);
  }
}

.am-picker__term-select {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--text-secondary) 50%),
    linear-gradient(135deg, var(--text-secondary) 50%, transparent 50%);
  background-position:
    calc(100% - 16px) 14px,
    calc(100% - 11px) 14px;
  background-repeat: no-repeat;
  background-size: 5px 5px, 5px 5px;
  cursor: pointer;
  padding-right: 28px;
}

.am-picker__state {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  padding: 36px 20px;
  text-align: center;

  &--error {
    color: var(--semantic-error);
  }
}

.am-picker__footer {
  align-items: center;
  border-top: 1px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 24px;

  > span {
    color: var(--text-secondary);
    font-size: 0.82rem;
  }
}

.am-picker__actions {
  display: flex;
  gap: 10px;
}

.am-picker__secondary,
.am-picker__primary {
  align-items: center;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  font-weight: 800;
  height: 40px;
  justify-content: center;
  padding: 0 18px;
}

.am-picker__secondary {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  color: var(--interactive-active);
}

.am-picker__primary {
  background: var(--interactive-primary);
  border: 0;
  color: var(--text-inverse);

  &--remove {
    background: var(--semantic-error, #e55353);
  }

  &--mixed {
    background: color-mix(in srgb, var(--interactive-primary) 50%, var(--semantic-error, #e55353));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.am-picker-modal-enter-active,
.am-picker-modal-leave-active {
  transition: opacity 0.18s ease;
}

.am-picker-modal-enter-from,
.am-picker-modal-leave-to {
  opacity: 0;
}

@media (max-width: 820px) {
  .am-picker {
    align-items: flex-end;
    padding: 0;
  }

  .am-picker__dialog {
    border-radius: 16px 16px 0 0;
    height: 92vh;
    width: 100vw;
  }

  .am-picker__header,
  .am-picker__footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .am-picker__body {
    grid-template-columns: 1fr;
    grid-template-rows: 118px minmax(0, 1fr) minmax(190px, 220px);
    padding: 12px 16px;
  }

  .am-picker__prefix-panel {
    max-height: none;
  }

  .am-picker__prefix-list {
    display: flex;
    overflow: auto;
    padding: 0 12px 12px;
  }

  .am-picker__prefix {
    flex: 0 0 auto;
    min-width: 86px;
  }

  .am-picker__cart-panel {
    max-height: none;
  }

  .am-picker__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .am-picker__actions {
    width: 100%;
  }

  .am-picker__secondary,
  .am-picker__primary {
    flex: 1;
  }
}
</style>
