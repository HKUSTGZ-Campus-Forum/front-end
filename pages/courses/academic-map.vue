<script setup lang="ts">
import type {
  AcademicCourseRecord,
  AcademicMapSummary,
  AcademicProfile,
} from '~/types/academic-map'
import type { CartCourse, SemesterInfo } from '~/utils/scheduler'
import CourseToolsHeader from '~/components/courses/CourseToolsHeader.vue'
import {
  compactCourseCode,
  getCourseUniverseActiveSchedulerSemester,
  getCourseUniverseSchedulerSemesterLabel,
} from '~/utils/courseUniverse'
import { buildAcademicMapRecordGroups } from '~/utils/academicMapManualImport'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()
const { isLoggedIn, user } = useAuth()
const { locale, getLocalePath } = useAppLocale()
const {
  clearRecords,
  deleteRecord,
  fetchSummary,
  parseCourseHistory,
  saveImportedRecords,
  updateProfile,
  updateRecord,
} = useAcademicMap()
const {
  getSemesters,
  getCart,
  addToCart,
  removeFromCart,
} = useScheduler()

const summary = ref<AcademicMapSummary | null>(null)
const semesters = ref<SemesterInfo[]>([])
const plannerCourses = ref<CartCourse[]>([])
const isLoading = ref(false)
const isLoadingPlanner = ref(false)
const isSavingProfile = ref(false)
const isParsing = ref(false)
const isSavingImport = ref(false)
const isClearingMap = ref(false)
const errorMessage = ref('')
const importRef = ref<InstanceType<typeof AcademicMapCourseHistoryImport> | null>(null)
const activeMajor = ref<string | null>(null)
const gradeDrafts = ref<Record<string, string>>({})
const savingGradeKeys = ref(new Set<string>())
const cartUpdatingCodes = ref(new Set<string>())

const records = computed(() => summary.value?.records || [])
const profile = computed<AcademicProfile>(() => summary.value?.profile || {
  cohort: null,
  target_majors: [],
  grade_policy: 'keep_private',
})
const activeSchedulerSemester = computed(() => getCourseUniverseActiveSchedulerSemester(semesters.value))
const activeSchedulerSemesterLabel = computed(() => {
  const semester = semesters.value.find(item => item.id === activeSchedulerSemester.value)
  if (!semester) return activeSchedulerSemester.value
  return getCourseUniverseSchedulerSemesterLabel(semester, locale.value)
})
const importDraftStorageKey = computed(() => (
  user.value?.id ? `unikorn:academic-map:picker-draft:v1:${user.value.id}` : ''
))
const plannerCourseCodes = computed(() => new Set(
  plannerCourses.value.map(item => compactCourseCode(item.course_code)),
))

const groupedRecords = computed(() => buildAcademicMapRecordGroups(records.value, t('academicMap.records.noTerm')))

const recordKey = (record: AcademicCourseRecord) => String(record.id || compactCourseCode(record.course_code))
const normalizedCourseCode = (record: AcademicCourseRecord) => compactCourseCode(record.course_code)
const gradeDraft = (record: AcademicCourseRecord) => gradeDrafts.value[recordKey(record)] ?? (record.grade || '')
const isSavingGrade = (record: AcademicCourseRecord) => savingGradeKeys.value.has(recordKey(record))
const isInPlannerCart = (record: AcademicCourseRecord) => plannerCourseCodes.value.has(normalizedCourseCode(record))
const isCartUpdating = (record: AcademicCourseRecord) => cartUpdatingCodes.value.has(normalizedCourseCode(record))

watch(summary, value => {
  const targetMajors = value?.profile?.target_majors || []
  if (!targetMajors.length) {
    activeMajor.value = value?.requirement_matrix?.[0]?.program_code || null
    return
  }
  const firstMajor = targetMajors[0] || value?.requirement_matrix?.[0]?.program_code || null
  if (!activeMajor.value && firstMajor) {
    activeMajor.value = firstMajor
  }
  if (activeMajor.value && targetMajors.length && !targetMajors.includes(activeMajor.value)) {
    activeMajor.value = firstMajor
  }
})

watch(records, value => {
  const nextDrafts: Record<string, string> = {}
  for (const record of value) {
    nextDrafts[recordKey(record)] = record.grade || ''
  }
  gradeDrafts.value = nextDrafts
}, { immediate: true })

const setMessage = (_message = '') => {
  errorMessage.value = ''
}

const setError = (message: string) => {
  errorMessage.value = message
}

const loadSummary = async () => {
  if (!isLoggedIn.value) return
  try {
    isLoading.value = true
    summary.value = await fetchSummary()
  } catch (error) {
    setError(t('academicMap.errors.load'))
  } finally {
    isLoading.value = false
  }
}

const refreshPlannerCart = async () => {
  if (!isLoggedIn.value || !activeSchedulerSemester.value) {
    plannerCourses.value = []
    return
  }
  plannerCourses.value = await getCart(activeSchedulerSemester.value)
}

const loadPlannerContext = async () => {
  if (!isLoggedIn.value) return
  try {
    isLoadingPlanner.value = true
    semesters.value = await getSemesters()
    await refreshPlannerCart()
  } catch {
    setError(t('courses.overviewPage.plannerLoadFailed'))
  } finally {
    isLoadingPlanner.value = false
  }
}

const handleProfileSave = async (payload: Partial<AcademicProfile> & { focus_major?: string | null }) => {
  try {
    isSavingProfile.value = true
    const { focus_major: focusMajor, ...profilePayload } = payload
    await updateProfile(profilePayload)
    await loadSummary()
    if (focusMajor !== undefined) {
      activeMajor.value = focusMajor
    }
    setMessage()
  } catch (error) {
    setError(t('academicMap.errors.profile'))
  } finally {
    isSavingProfile.value = false
  }
}

const handleParse = async (text: string) => {
  try {
    isParsing.value = true
    const result = await parseCourseHistory(text)
    importRef.value?.setRows(result.rows)
    setMessage(t('academicMap.messages.parsed', { count: result.count }))
  } catch (error) {
    setError(t('academicMap.errors.parse'))
  } finally {
    isParsing.value = false
  }
}

const handleImportSave = async (payload: { records: AcademicCourseRecord[]; keepGrades: boolean; deleteRecords?: AcademicCourseRecord[] }) => {
  try {
    isSavingImport.value = true
    const deleteRecords = payload.deleteRecords || []
    if (payload.records.length > 0) {
      await saveImportedRecords(payload.records, payload.keepGrades)
    }
    for (const record of deleteRecords) {
      if (record.id) await deleteRecord(record.id)
    }
    await loadSummary()
    setMessage(t(deleteRecords.length > 0 ? 'academicMap.messages.importChangesSaved' : 'academicMap.messages.importSaved'))
  } catch (error) {
    setError(t('academicMap.errors.importSave'))
  } finally {
    isSavingImport.value = false
  }
}

const handleStatusChange = async (record: AcademicCourseRecord, status: AcademicCourseRecord['status']) => {
  if (!record.id) return
  try {
    await updateRecord(record.id, { status })
    await loadSummary()
  } catch (error) {
    setError(t('academicMap.errors.record'))
  }
}

const handleGradeInput = (record: AcademicCourseRecord, value: string) => {
  gradeDrafts.value = {
    ...gradeDrafts.value,
    [recordKey(record)]: value,
  }
}

const handleGradeCommit = async (record: AcademicCourseRecord) => {
  if (!record.id) return
  const key = recordKey(record)
  const nextGrade = gradeDraft(record).trim()
  const currentGrade = (record.grade || '').trim()
  if (nextGrade === currentGrade) return

  try {
    savingGradeKeys.value = new Set(savingGradeKeys.value).add(key)
    await updateRecord(record.id, {
      grade: nextGrade || null,
      keep_grade: Boolean(nextGrade),
    })
    await loadSummary()
  } catch {
    handleGradeInput(record, record.grade || '')
    setError(t('academicMap.errors.record'))
  } finally {
    const nextSaving = new Set(savingGradeKeys.value)
    nextSaving.delete(key)
    savingGradeKeys.value = nextSaving
  }
}

const handlePlannerToggle = async (record: AcademicCourseRecord) => {
  if (!isLoggedIn.value) {
    setError(t('scheduler.loginHint'))
    return
  }
  if (!activeSchedulerSemester.value) {
    setError(t('scheduler.noSemesters'))
    return
  }

  const code = normalizedCourseCode(record)
  if (!code || cartUpdatingCodes.value.has(code)) return

  try {
    cartUpdatingCodes.value = new Set(cartUpdatingCodes.value).add(code)
    if (isInPlannerCart(record)) {
      await removeFromCart(activeSchedulerSemester.value, code)
    } else {
      await addToCart(activeSchedulerSemester.value, code)
    }
    await refreshPlannerCart()
    setMessage()
  } catch (err) {
    const errorMessageText = err instanceof Error ? err.message : ''
    if (errorMessageText.includes('no sections')) {
      setError(t('scheduler.cartCourseUnavailable', {
        course: record.course_code || code,
        semester: activeSchedulerSemesterLabel.value,
      }))
    } else if (errorMessageText.includes('already in cart')) {
      await refreshPlannerCart()
      setError(t('scheduler.cartAlreadyAdded', {
        course: record.course_code || code,
        semester: activeSchedulerSemesterLabel.value,
      }))
    } else {
      setError(t('scheduler.cartFailed'))
    }
  } finally {
    const nextUpdating = new Set(cartUpdatingCodes.value)
    nextUpdating.delete(code)
    cartUpdatingCodes.value = nextUpdating
  }
}

const handleDeleteRecord = async (record: AcademicCourseRecord) => {
  if (!record.id) return
  try {
    await deleteRecord(record.id)
    await loadSummary()
    setMessage(t('academicMap.messages.recordDeleted'))
  } catch (error) {
    setError(t('academicMap.errors.record'))
  }
}

const handleClearRecords = async () => {
  if (!window.confirm(t('academicMap.privacy.clearMapConfirm'))) return
  try {
    isClearingMap.value = true
    const result = await clearRecords()
    await loadSummary()
    setMessage(t('academicMap.messages.recordsCleared', { count: result.deleted_records }))
  } catch (error) {
    setError(t('academicMap.errors.clearRecords'))
  } finally {
    isClearingMap.value = false
  }
}

const handleSelectMajor = (major: string) => {
  activeMajor.value = major
}

watch(isLoggedIn, value => {
  if (!value) {
    plannerCourses.value = []
    return
  }
  loadPlannerContext()
})

onMounted(() => {
  loadSummary()
  loadPlannerContext()
})

useHead({
  title: computed(() => t('academicMap.metaTitle')),
})
</script>

<template>
  <div class="am-page">
    <CourseToolsHeader mode="academicMap" :title="t('academicMap.title')" />

    <div v-if="!isLoggedIn" class="am-card am-login-card">
      <h2>{{ t('academicMap.login.title') }}</h2>
      <p>{{ t('academicMap.login.copy') }}</p>
      <NuxtLink :to="getLocalePath('/login')" class="am-primary-btn">
        {{ t('actions.login') }}
      </NuxtLink>
    </div>

    <template v-else>
      <div v-if="errorMessage" class="am-message am-message--error">
        {{ errorMessage }}
      </div>

      <div v-if="isLoading && !summary" class="am-loading">
        <div class="am-spinner"></div>
        <span>{{ t('academicMap.loading') }}</span>
      </div>

      <template v-else>
        <AcademicMapTargetMajorEditor
          :cohort="profile.cohort"
          :target-majors="profile.target_majors"
          :saving="isSavingProfile"
          @save="handleProfileSave"
        />

        <AcademicMapAcademicProgressCards :summary="summary" :active-major="activeMajor" />

        <div class="am-stack am-content-flow">
          <AcademicMapRequirementMatrix
            :matrices="summary?.requirement_matrix || []"
            :active-major="activeMajor"
            :profile="profile"
            @select-major="handleSelectMajor"
          />

          <AcademicMapCourseHistoryImport
            ref="importRef"
            :parsing="isParsing"
            :saving="isSavingImport"
            :existing-records="records"
            :draft-storage-key="importDraftStorageKey"
            @parse="handleParse"
            @save="handleImportSave"
          />
        </div>

        <section class="am-card am-records">
          <div class="am-section-head">
            <div>
              <h2>{{ t('academicMap.records.title') }}</h2>
              <small>{{ t('academicMap.records.summary', { count: records.length }) }}</small>
            </div>
            <div class="am-records-tools">
              <button class="am-outline-btn am-outline-btn--danger" :disabled="isClearingMap" type="button" @click="handleClearRecords">
                {{ isClearingMap ? t('academicMap.privacy.clearingMap') : t('academicMap.privacy.clearMap') }}
              </button>
            </div>
          </div>

          <div v-if="records.length === 0" class="am-empty">
            {{ t('academicMap.records.empty') }}
          </div>

          <div v-else class="am-term-list">
            <div v-for="group in groupedRecords" :key="group.term" class="am-term-group">
              <h3>{{ group.term }}</h3>
              <article v-for="record in group.items" :key="record.id || record.course_code" class="am-record-row">
                <div class="am-record-main">
                  <div class="am-record-code-row">
                    <strong>{{ record.course_code }}</strong>
                    <span class="am-unit-chip">{{ record.units || 0 }} {{ t('academicMap.units') }}</span>
                  </div>
                  <span>{{ record.course_title || t('academicMap.records.untitled') }}</span>
                </div>
                <div class="am-record-actions">
                  <div class="am-record-field am-record-field--status">
                    <span class="am-record-label">{{ t('academicMap.records.statusLabel') }}</span>
                    <AcademicMapCourseStatusChips
                      :model-value="record.status"
                      compact
                      @update:model-value="handleStatusChange(record, $event)"
                    />
                  </div>
                  <label class="am-record-field am-record-field--grade">
                    <span class="am-record-label">{{ t('academicMap.records.gpaLabel') }}</span>
                    <input
                      :value="gradeDraft(record)"
                      class="am-grade-input"
                      type="text"
                      :aria-label="t('academicMap.records.gpaAria', { course: record.course_code })"
                      :placeholder="t('academicMap.records.gpaPlaceholder')"
                      :disabled="isSavingGrade(record)"
                      @input="handleGradeInput(record, ($event.target as HTMLInputElement).value)"
                      @blur="handleGradeCommit(record)"
                      @keydown.enter.prevent="handleGradeCommit(record)"
                    />
                  </label>
                  <div class="am-record-icon-group">
                    <button
                      :class="['am-cart-btn', { 'is-added': isInPlannerCart(record) }]"
                      type="button"
                      :aria-label="isInPlannerCart(record) ? t('academicMap.records.removeFromCart', { course: record.course_code }) : t('academicMap.records.addToCart', { course: record.course_code })"
                      :title="isInPlannerCart(record) ? t('academicMap.records.removeFromCart', { course: record.course_code }) : t('academicMap.records.addToCart', { course: record.course_code })"
                      :disabled="isLoadingPlanner || isCartUpdating(record)"
                      @click="handlePlannerToggle(record)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path class="am-cart-btn__basket" d="M5 6h2l1.7 8.2h8.1l1.6-5.6H8.2" />
                        <circle class="am-cart-btn__wheel" cx="10" cy="18" r="1.35" />
                        <circle class="am-cart-btn__wheel" cx="16" cy="18" r="1.35" />
                        <path v-if="isInPlannerCart(record)" class="am-cart-btn__check" d="M11 11.5l2.1 2.1L18 8.8" />
                      </svg>
                    </button>
                    <button class="am-icon-btn" type="button" :aria-label="t('academicMap.records.delete')" @click="handleDeleteRecord(record)">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h16" />
                        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
                        <path d="M7.5 7l.7 11a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-11" />
                        <path d="M10 10.5v5" />
                        <path d="M14 10.5v5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.am-page {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 64px;
}

.am-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  padding: 18px;
}

.am-stack {
  display: grid;
  gap: 16px;
  align-content: start;
}

.am-content-flow {
  margin-top: 16px;
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

  small {
    color: var(--text-muted);
    display: inline-flex;
    font-size: 0.78rem;
    font-weight: 700;
    margin-top: 5px;
  }
}

.am-primary-btn,
.am-outline-btn {
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  padding: 8px 18px;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.am-primary-btn {
  background: var(--interactive-primary);
  border: 0;
  color: var(--text-inverse);
}

.am-outline-btn {
  background: var(--surface-primary);
  border: 1px solid var(--border-focus);
  color: var(--interactive-active);

  & + .am-outline-btn {
    margin-left: 8px;
    margin-top: 8px;
  }

  &--danger {
    border-color: color-mix(in srgb, var(--semantic-error) 35%, transparent);
    color: var(--semantic-error);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
}

.am-message {
  border: 1px solid color-mix(in srgb, var(--semantic-success) 28%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--semantic-success) 9%, transparent);
  color: var(--semantic-success);
  margin-bottom: 16px;
  padding: 10px 14px;

  &--error {
    background: color-mix(in srgb, var(--semantic-error) 8%, transparent);
    border-color: color-mix(in srgb, var(--semantic-error) 25%, transparent);
    color: var(--semantic-error);
  }
}

.am-loading,
.am-empty {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 56px 20px;
}

.am-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.am-login-card {
  max-width: 520px;

  h2 {
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.65;
    margin: 0 0 16px;
  }
}

.am-records {
  margin-top: 16px;
}

.am-records-tools {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.am-term-list {
  display: grid;
  gap: 16px;
}

.am-term-group {
  h3 {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0 0 8px;
  }
}

.am-record-row {
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface-primary) 0%, var(--surface-secondary) 100%);
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(510px, auto);
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  & + & {
    margin-top: 8px;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--interactive-primary) 38%, var(--border-primary));
    box-shadow: var(--shadow-medium);
    transform: translateY(-1px);
  }
}

.am-record-main {
  display: grid;
  gap: 6px;
  min-width: 0;

  strong {
    color: var(--interactive-active);
  }

  span {
    color: var(--text-primary);
    font-weight: 650;
    overflow-wrap: anywhere;
  }

}

.am-record-code-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.am-unit-chip {
  align-items: center;
  background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 20%, var(--border-primary));
  border-radius: 999px;
  color: var(--interactive-active);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 800;
  min-height: 24px;
  padding: 0 9px;
  white-space: nowrap;
}

.am-record-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.am-record-field {
  align-items: center;
  display: inline-flex;
  gap: 7px;
}

.am-record-field--grade {
  cursor: text;
}

.am-record-label {
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 800;
  white-space: nowrap;
}

.am-grade-input {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 760;
  height: 34px;
  outline: none;
  padding: 0 10px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
  width: 72px;

  &::placeholder {
    color: var(--text-muted);
    font-weight: 650;
  }

  &:focus {
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 14%, transparent);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

.am-record-icon-group {
  align-items: center;
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 3px;
  padding: 3px;
}

.am-icon-btn,
.am-cart-btn {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 32px;
  height: 32px;
  justify-content: center;
  padding: 0;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
  width: 32px;

  svg {
    display: block;
    height: 18px;
    width: 18px;
  }

  path,
  circle {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
}

.am-cart-btn {
  color: var(--interactive-primary);

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--interactive-primary) 26%, transparent);
    transform: translateY(-1px);
  }

  &.is-added {
    background: var(--interactive-primary);
    border-color: var(--interactive-primary);
    color: var(--text-inverse);
  }

  .am-cart-btn__wheel {
    fill: currentColor;
  }
}

.am-icon-btn {
  color: var(--text-secondary);

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    background: color-mix(in srgb, var(--semantic-error) 8%, transparent);
    border-color: color-mix(in srgb, var(--semantic-error) 18%, transparent);
    color: var(--semantic-error);
  }
}

@media (max-width: 900px) {
  .am-record-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .am-record-actions {
    justify-content: flex-start;
  }

  .am-records-tools {
    justify-content: flex-start;
  }
}

@media (max-width: 680px) {
  .am-record-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    width: 100%;
  }

  .am-record-field--status {
    align-items: flex-start;
    flex-direction: column;
    grid-column: 1 / -1;
  }
}
</style>
