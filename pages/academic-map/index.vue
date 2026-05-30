<script setup lang="ts">
import type {
  AcademicCourseRecord,
  AcademicMapSummary,
  AcademicProfile,
  AcademicRequirementRow,
} from '~/types/academic-map'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()
const { isLoggedIn } = useAuth()
const { getLocalePath } = useAppLocale()
const {
  deleteGrades,
  clearRecords,
  deleteRecord,
  fetchSummary,
  parseCourseHistory,
  saveImportedRecords,
  updateProfile,
  updateRecord,
} = useAcademicMap()

const summary = ref<AcademicMapSummary | null>(null)
const isLoading = ref(false)
const isSavingProfile = ref(false)
const isParsing = ref(false)
const isSavingImport = ref(false)
const isClearingGrades = ref(false)
const isClearingMap = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const importRef = ref<InstanceType<typeof AcademicMapCourseHistoryImport> | null>(null)
const activeMajor = ref<string | null>(null)
const selectedRequirementRow = ref<AcademicRequirementRow | null>(null)
const selectedDetail = ref<'prerequisites' | 'grades' | null>(null)

const records = computed(() => summary.value?.records || [])
const profile = computed<AcademicProfile>(() => summary.value?.profile || {
  cohort: null,
  target_majors: [],
  grade_policy: 'keep_private',
})

const groupedRecords = computed(() => {
  const groups = new Map<string, AcademicCourseRecord[]>()
  for (const record of records.value) {
    const term = record.term_label || t('academicMap.records.noTerm')
    groups.set(term, [...(groups.get(term) || []), record])
  }
  return Array.from(groups.entries()).map(([term, items]) => ({ term, items }))
})

watch(summary, value => {
  const firstMajor = value?.requirement_matrix?.[0]?.program_code || null
  if (!activeMajor.value && firstMajor) {
    activeMajor.value = firstMajor
  }
  if (
    activeMajor.value
    && value?.requirement_matrix?.length
    && !value.requirement_matrix.some(matrix => matrix.program_code === activeMajor.value)
  ) {
    activeMajor.value = firstMajor
  }
})

const setMessage = (message = '') => {
  successMessage.value = message
  errorMessage.value = ''
}

const setError = (message: string) => {
  errorMessage.value = message
  successMessage.value = ''
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

const handleProfileSave = async (payload: Partial<AcademicProfile>) => {
  try {
    isSavingProfile.value = true
    await updateProfile(payload)
    await loadSummary()
    setMessage(t('academicMap.messages.profileSaved'))
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

const handleImportSave = async (payload: { records: AcademicCourseRecord[]; keepGrades: boolean }) => {
  try {
    isSavingImport.value = true
    await saveImportedRecords(payload.records, payload.keepGrades)
    await loadSummary()
    setMessage(t('academicMap.messages.importSaved'))
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

const handleDeleteGrades = async () => {
  try {
    isClearingGrades.value = true
    const result = await deleteGrades()
    await loadSummary()
    setMessage(t('academicMap.messages.gradesDeleted', { count: result.cleared_count }))
  } catch (error) {
    setError(t('academicMap.errors.grades'))
  } finally {
    isClearingGrades.value = false
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

const handleSelectRow = (row: AcademicRequirementRow) => {
  selectedRequirementRow.value = row
  selectedDetail.value = null
}

const handleSelectDetail = (detail: 'prerequisites' | 'grades') => {
  selectedDetail.value = detail
  selectedRequirementRow.value = null
}

const handleSelectMajor = (major: string) => {
  activeMajor.value = major
  selectedRequirementRow.value = null
  selectedDetail.value = null
}

onMounted(loadSummary)

useHead({
  title: computed(() => t('academicMap.metaTitle')),
})
</script>

<template>
  <div class="am-page">
    <header class="am-hero">
      <div>
        <p class="am-eyebrow">{{ t('academicMap.eyebrow') }}</p>
        <h1>{{ t('academicMap.title') }}</h1>
        <p>{{ t('academicMap.subtitle') }}</p>
      </div>
      <NuxtLink :to="getLocalePath('/courses')" class="am-ghost-link">
        {{ t('academicMap.openCourses') }}
      </NuxtLink>
    </header>

    <div v-if="!isLoggedIn" class="am-card am-login-card">
      <h2>{{ t('academicMap.login.title') }}</h2>
      <p>{{ t('academicMap.login.copy') }}</p>
      <NuxtLink :to="getLocalePath('/login')" class="am-primary-btn">
        {{ t('actions.login') }}
      </NuxtLink>
    </div>

    <template v-else>
      <div v-if="errorMessage || successMessage" class="am-message" :class="{ 'am-message--error': errorMessage }">
        {{ errorMessage || successMessage }}
      </div>

      <div v-if="isLoading && !summary" class="am-loading">
        <div class="am-spinner"></div>
        <span>{{ t('academicMap.loading') }}</span>
      </div>

      <template v-else>
        <AcademicMapAcademicProgressCards :summary="summary" @select-detail="handleSelectDetail" />

        <div class="am-main-grid">
          <div class="am-stack">
            <AcademicMapRequirementMatrix
              :matrices="summary?.requirement_matrix || []"
              :active-major="activeMajor"
              :profile="profile"
              @select-major="handleSelectMajor"
              @select-row="handleSelectRow"
            />

            <AcademicMapCourseHistoryImport
              ref="importRef"
              :parsing="isParsing"
              :saving="isSavingImport"
              @parse="handleParse"
              @save="handleImportSave"
            />
          </div>

          <aside class="am-stack">
            <AcademicMapRequirementDetailPanel
              :summary="summary"
              :selected-row="selectedRequirementRow"
              :selected-detail="selectedDetail"
            />

            <AcademicMapTargetMajorEditor
              :cohort="profile.cohort"
              :target-majors="profile.target_majors"
              :saving="isSavingProfile"
              @save="handleProfileSave"
            />

            <section class="am-card">
              <div class="am-section-head">
                <div>
                  <h2>{{ t('academicMap.privacy.title') }}</h2>
                  <p>{{ t('academicMap.privacy.copy') }}</p>
                </div>
              </div>
              <button class="am-outline-btn" :disabled="isClearingGrades" type="button" @click="handleDeleteGrades">
                {{ isClearingGrades ? t('academicMap.privacy.deleting') : t('academicMap.privacy.deleteGrades') }}
              </button>
              <button class="am-outline-btn am-outline-btn--danger" :disabled="isClearingMap" type="button" @click="handleClearRecords">
                {{ isClearingMap ? t('academicMap.privacy.clearingMap') : t('academicMap.privacy.clearMap') }}
              </button>
            </section>

            <section class="am-card">
              <div class="am-section-head">
                <div>
                  <h2>{{ t('academicMap.future.title') }}</h2>
                  <p>{{ t('academicMap.future.copy') }}</p>
                </div>
              </div>
              <div class="am-signal-list">
                <span>{{ t('academicMap.future.signals.courseHistory') }}</span>
                <span>{{ t('academicMap.future.signals.targetMajors') }}</span>
                <span>{{ t('academicMap.future.signals.statusIntent') }}</span>
                <span>{{ t('academicMap.future.signals.privateGrades') }}</span>
              </div>
            </section>
          </aside>
        </div>

        <section class="am-card am-records">
          <div class="am-section-head">
            <div>
              <h2>{{ t('academicMap.records.title') }}</h2>
              <p>{{ t('academicMap.records.copy') }}</p>
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
                  <strong>{{ record.course_code }}</strong>
                  <span>{{ record.course_title || t('academicMap.records.untitled') }}</span>
                  <small>
                    {{ record.units || 0 }} {{ t('academicMap.units') }}
                    <template v-if="record.keep_grade && record.grade"> / {{ t('academicMap.records.privateGrade', { grade: record.grade }) }}</template>
                  </small>
                </div>
                <div class="am-record-actions">
                  <AcademicMapCourseStatusChips
                    :model-value="record.status"
                    compact
                    @update:model-value="handleStatusChange(record, $event)"
                  />
                  <button class="am-icon-btn" type="button" :aria-label="t('academicMap.records.delete')" @click="handleDeleteRecord(record)">
                    x
                  </button>
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

.am-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 22px;

  h1 {
    color: var(--text-primary);
    font-size: 1.7rem;
    line-height: 1.25;
    margin: 2px 0 6px;
  }

  p {
    color: var(--text-secondary);
    margin: 0;
    max-width: 720px;
  }
}

.am-eyebrow {
  color: var(--interactive-active);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.am-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  padding: 18px;
}

.am-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.7fr);
  gap: 16px;
  margin-top: 16px;
}

.am-stack {
  display: grid;
  gap: 16px;
  align-content: start;
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

.am-primary-btn,
.am-outline-btn,
.am-ghost-link {
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

.am-primary-btn,
.am-ghost-link {
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
    border-color: rgba(255, 90, 90, 0.35);
    color: #b13434;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
}

.am-message {
  border: 1px solid rgba(38, 200, 120, 0.28);
  border-radius: 14px;
  background: rgba(38, 200, 120, 0.09);
  color: #157a45;
  margin-bottom: 16px;
  padding: 10px 14px;

  &--error {
    background: rgba(255, 90, 90, 0.08);
    border-color: rgba(255, 90, 90, 0.25);
    color: #b13434;
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

.am-signal-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    border: 1px solid var(--border-primary);
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 700;
    padding: 6px 10px;
  }
}

.am-records {
  margin-top: 16px;
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
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;

  & + & {
    margin-top: 8px;
  }
}

.am-record-main {
  display: grid;
  gap: 3px;
  min-width: 0;

  strong {
    color: var(--interactive-active);
  }

  span {
    color: var(--text-primary);
    font-weight: 650;
    overflow-wrap: anywhere;
  }

  small {
    color: var(--text-tertiary);
  }
}

.am-record-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.am-icon-btn {
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  height: 28px;
  width: 28px;
}

@media (max-width: 900px) {
  .am-hero,
  .am-main-grid,
  .am-record-row {
    grid-template-columns: 1fr;
  }

  .am-hero,
  .am-record-row {
    flex-direction: column;
  }

  .am-record-actions {
    justify-content: flex-start;
  }
}
</style>
