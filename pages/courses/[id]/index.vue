<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { AcademicCourseRecord } from '~/types/academic-map'
import type { CourseOverviewOffering, CourseOverviewPayload } from '~/types/course-overview'
import type { CartCourse, SemesterInfo } from '~/utils/scheduler'
import { buildCourseListBackQuery } from '~/utils/courseOffering'
import {
  compactCourseCode,
  getCourseUniverseActiveSchedulerSemester,
  getCourseUniverseSchedulerSemesterLabel,
} from '~/utils/courseUniverse'
import {
  getCourseOverviewAcademicState,
  getCourseOverviewPlannerState,
} from '~/utils/courseOverviewDetail'

definePageMeta({ layout: 'keguang' })

const route = useRoute()
const { t } = useI18n()
const { locale, getLocalePath } = useAppLocale()
const { isLoggedIn } = useAuth()
const {
  fetchCourseOverview,
  markCourseInterested,
  cancelCourseInterest,
} = useCourseOverview()
const {
  getSemesters,
  getCart,
  addToCart,
  removeFromCart,
} = useScheduler()

const overview = ref<CourseOverviewPayload | null>(null)
const academicRecord = ref<AcademicCourseRecord | null>(null)
const semesters = ref<SemesterInfo[]>([])
const plannerCourses = ref<CartCourse[]>([])
const isLoading = ref(true)
const isSavingInterest = ref(false)
const isLoadingPlanner = ref(false)
const showAllOfferings = ref(false)
const error = ref('')
const statusMessage = ref('')
const plannerMessage = ref('')
const plannerNoticeTone = ref<'info' | 'success' | 'error'>('info')
const plannerUpdatingTag = ref('')

const courseCode = computed(() => compactCourseCode(String(route.params.id || '')))
const course = computed(() => overview.value?.course || null)
const offerings = computed(() => overview.value?.offerings || [])
const visibleOfferings = computed(() => showAllOfferings.value ? offerings.value : offerings.value.slice(0, 3))
const hasHiddenOfferings = computed(() => offerings.value.length > visibleOfferings.value.length)
const academicState = computed(() => getCourseOverviewAcademicState(academicRecord.value))
const listBackQuery = computed(() => buildCourseListBackQuery(route.query as Record<string, unknown>))
const cameFromUniverse = computed(() => route.query.from === 'universe')
const backTo = computed(() => cameFromUniverse.value
  ? getLocalePath({ path: '/courses', query: { focus: course.value?.code || courseCode.value } })
  : getLocalePath({ path: '/courses/explore', query: listBackQuery.value }))
const backLabel = computed(() => cameFromUniverse.value
  ? t('courses.overviewPage.backToUniverse')
  : t('courses.backToCourses'))
const activeSchedulerSemester = computed(() => getCourseUniverseActiveSchedulerSemester(semesters.value))
const activeSchedulerSemesterLabel = computed(() => {
  const semester = semesters.value.find(item => item.id === activeSchedulerSemester.value)
  if (!semester) return activeSchedulerSemester.value
  return getCourseUniverseSchedulerSemesterLabel(semester, locale.value)
})
const cartCourseCodes = computed(() => plannerCourses.value.map(item => item.course_code))
const activePlannerOffering = computed(() => offerings.value.find((offering) => (
  offering.scheduler_semester_id === activeSchedulerSemester.value
)) || null)
const heroPlannerState = computed(() => activePlannerOffering.value
  ? getOfferingPlannerState(activePlannerOffering.value)
  : null)
const isHeroPlannerUpdating = computed(() => (
  !!activePlannerOffering.value
  && plannerUpdatingTag.value === activePlannerOffering.value.offering_tag
))
const heroPlannerActionLabel = computed(() => {
  if (isHeroPlannerUpdating.value) return t('actions.saving')
  return heroPlannerState.value?.status === 'in_cart'
    ? t('courseUniverse.actions.removeFromPlannerCart')
    : t('courseUniverse.actions.addToPlannerCart')
})

const ruleRows = computed(() => [
  { key: 'preRequirement', value: course.value?.pre_requirement },
  { key: 'coRequirement', value: course.value?.co_requirement },
  { key: 'exclusion', value: course.value?.exclusion },
].filter(item => item.value))

const courseUniverseTo = computed(() => getLocalePath({
  path: '/courses',
  query: { focus: course.value?.code || courseCode.value },
}))

const refreshOverview = async () => {
  overview.value = await fetchCourseOverview(courseCode.value, locale.value)
  academicRecord.value = overview.value.academic_record
}

const refreshPlannerCart = async () => {
  if (!isLoggedIn.value || !activeSchedulerSemester.value) {
    plannerCourses.value = []
    return
  }
  plannerCourses.value = await getCart(activeSchedulerSemester.value)
}

const loadPlannerContext = async () => {
  try {
    isLoadingPlanner.value = true
    semesters.value = await getSemesters()
    await refreshPlannerCart()
  } catch {
    plannerMessage.value = t('courses.overviewPage.plannerLoadFailed')
    plannerNoticeTone.value = 'error'
  } finally {
    isLoadingPlanner.value = false
  }
}

const loadPage = async () => {
  try {
    isLoading.value = true
    error.value = ''
    plannerMessage.value = ''
    await Promise.all([
      refreshOverview(),
      loadPlannerContext(),
    ])
  } catch (err: any) {
    error.value = err.message || t('courses.overviewPage.loadFailed')
  } finally {
    isLoading.value = false
  }
}

const saveInterest = async () => {
  if (!course.value) return
  if (!isLoggedIn.value) {
    statusMessage.value = t('courses.overviewPage.loginToMark')
    return
  }
  try {
    isSavingInterest.value = true
    statusMessage.value = ''
    const result = await markCourseInterested(course.value.code)
    academicRecord.value = result.record || null
    statusMessage.value = t('courses.overviewPage.interestSaved')
  } catch (err: any) {
    academicRecord.value = (err && err.record as AcademicCourseRecord) || academicRecord.value
    statusMessage.value = t('courses.overviewPage.interestFailed')
  } finally {
    isSavingInterest.value = false
  }
}

const removeInterest = async () => {
  if (!course.value) return
  if (!isLoggedIn.value) {
    statusMessage.value = t('courses.overviewPage.loginToMark')
    return
  }
  try {
    isSavingInterest.value = true
    statusMessage.value = ''
    await cancelCourseInterest(course.value.code)
    academicRecord.value = null
    statusMessage.value = t('courses.overviewPage.interestRemoved')
  } catch {
    statusMessage.value = t('courses.overviewPage.interestFailed')
  } finally {
    isSavingInterest.value = false
  }
}

const toggleInterest = () => {
  if (!academicState.value.canToggleInterest || isSavingInterest.value) return
  if (academicState.value.isInterested) {
    removeInterest()
    return
  }
  saveInterest()
}

const offeringHomeTo = (offeringTag: string) => getLocalePath({
  path: `/courses/${course.value?.code || courseCode.value}/offerings/${offeringTag}`,
  query: listBackQuery.value,
})

const getOfferingPlannerState = (offering: CourseOverviewOffering) => getCourseOverviewPlannerState({
  activeSemesterId: activeSchedulerSemester.value,
  cartCourseCodes: cartCourseCodes.value,
  courseCode: course.value?.code || courseCode.value,
  offeringSemesterId: offering.scheduler_semester_id,
})

const togglePlannerCourse = async (offering: CourseOverviewOffering) => {
  if (!course.value) return
  const state = getOfferingPlannerState(offering)
  if (!state.canToggle || plannerUpdatingTag.value) return

  plannerMessage.value = ''
  plannerNoticeTone.value = 'info'

  if (!isLoggedIn.value) {
    plannerMessage.value = t('scheduler.loginHint')
    plannerNoticeTone.value = 'error'
    return
  }

  plannerUpdatingTag.value = offering.offering_tag
  const normalizedCode = compactCourseCode(course.value.code)
  try {
    if (state.status === 'in_cart') {
      await removeFromCart(activeSchedulerSemester.value, normalizedCode)
      plannerMessage.value = t('scheduler.cartRemoved', {
        course: course.value.display_code || normalizedCode,
        semester: activeSchedulerSemesterLabel.value,
      })
    } else {
      await addToCart(activeSchedulerSemester.value, normalizedCode)
      plannerMessage.value = t('scheduler.cartAdded', {
        course: course.value.display_code || normalizedCode,
        semester: activeSchedulerSemesterLabel.value,
      })
    }
    plannerNoticeTone.value = 'success'
    await refreshPlannerCart()
  } catch (err) {
    const errorMessageText = err instanceof Error ? err.message : ''
    plannerNoticeTone.value = 'error'
    if (errorMessageText.includes('no sections')) {
      plannerMessage.value = t('scheduler.cartCourseUnavailable', {
        course: course.value.display_code || normalizedCode,
        semester: activeSchedulerSemesterLabel.value,
      })
    } else if (errorMessageText.includes('already in cart')) {
      plannerMessage.value = t('scheduler.cartAlreadyAdded', {
        course: course.value.display_code || normalizedCode,
        semester: activeSchedulerSemesterLabel.value,
      })
      await refreshPlannerCart()
    } else {
      plannerMessage.value = t('scheduler.cartFailed')
    }
  } finally {
    plannerUpdatingTag.value = ''
  }
}

const toggleHeroPlannerCourse = () => {
  if (!activePlannerOffering.value) return
  togglePlannerCourse(activePlannerOffering.value)
}

const formatOfferingMeta = (offering: CourseOverviewOffering) => {
  const parts = [t('courses.overviewPage.sectionsCount', {
    count: offering.section_count || 0,
  })]
  if (offering.instructors?.length) parts.push(offering.instructors.join(', '))
  return parts.join(' · ')
}

watch(isLoggedIn, () => {
  refreshPlannerCart().catch(() => {
    plannerMessage.value = t('courses.overviewPage.plannerLoadFailed')
    plannerNoticeTone.value = 'error'
  })
})

onMounted(loadPage)

useHead({
  title: computed(() => `${course.value?.display_code || courseCode.value} ${course.value?.title || ''} - ${t('courses.overviewPage.metaTitle')}`),
  meta: [{
    name: 'description',
    content: computed(() => t('courses.overviewPage.metaDescription', {
      course: course.value?.title || courseCode.value,
    })),
  }],
})
</script>

<template>
  <div class="kg-course-overview">
    <div class="kg-back-bar">
      <NuxtLink :to="backTo" class="kg-back-link">← {{ backLabel }}</NuxtLink>
    </div>

    <div v-if="isLoading" class="kg-state-card">
      <div class="kg-spinner"></div>
      <span>{{ t('courses.loading') }}</span>
    </div>

    <div v-else-if="error" class="kg-state-card kg-state-card--error">
      <p>{{ error }}</p>
      <button type="button" class="kg-btn kg-btn--ghost" @click="loadPage">{{ t('common.retry') }}</button>
    </div>

    <template v-else-if="course">
      <div class="kg-overview-grid">
        <main class="kg-main-stack">
          <section class="kg-card kg-hero">
            <div class="kg-hero__top">
              <p class="kg-eyebrow">{{ t('courses.overviewPage.eyebrow') }}</p>
              <div class="kg-hero__meta">
                <span v-if="course.credits" class="kg-meta-chip">{{ t('courses.credits', { count: course.credits }) }}</span>
                <span :class="['kg-status-badge', course.is_active ? 'active' : 'inactive']">
                  {{ course.is_active ? t('courses.statusActive') : t('courses.statusInactive') }}
                </span>
                <span :class="['kg-academic-chip', `is-${academicState.status}`]">
                  {{ t(`courses.overviewPage.academicStatus.${academicState.status}`) }}
                </span>
                <button
                  v-if="academicState.canToggleInterest"
                  type="button"
                  :class="['kg-interest-btn', { 'is-active': academicState.isInterested }]"
                  :aria-label="academicState.isInterested ? t('courses.overviewPage.cancelInterested') : t('courses.overviewPage.markInterested')"
                  :title="academicState.isInterested ? t('courses.overviewPage.cancelInterested') : t('courses.overviewPage.markInterested')"
                  :disabled="isSavingInterest"
                  @click="toggleInterest"
                >
                  <ForumUiIcon name="bookmark" />
                </button>
                <button
                  v-if="activePlannerOffering"
                  type="button"
                  :class="['kg-cart-btn', { 'is-added': heroPlannerState?.status === 'in_cart' }]"
                  :aria-label="heroPlannerActionLabel"
                  :title="activeSchedulerSemesterLabel ? `${heroPlannerActionLabel} · ${activeSchedulerSemesterLabel}` : heroPlannerActionLabel"
                  :disabled="isHeroPlannerUpdating || isLoadingPlanner || !heroPlannerState?.canToggle"
                  @click="toggleHeroPlannerCourse"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path class="kg-cart-btn__basket" d="M5 6h2l1.7 8.2h8.1l1.6-5.6H8.2" />
                    <circle class="kg-cart-btn__wheel" cx="10" cy="18" r="1.35" />
                    <circle class="kg-cart-btn__wheel" cx="16" cy="18" r="1.35" />
                    <path v-if="heroPlannerState?.status === 'in_cart'" class="kg-cart-btn__check" d="M11 11.5l2.1 2.1L18 8.8" />
                  </svg>
                </button>
              </div>
            </div>

            <h1>
              <span class="kg-course-code">{{ course.display_code }}</span>
              <span>{{ course.title }}</span>
            </h1>
            <p v-if="course.description" class="kg-description">{{ course.description }}</p>
            <p v-if="statusMessage" class="kg-inline-note">{{ statusMessage }}</p>
            <p v-if="plannerMessage" :class="['kg-inline-note', `is-${plannerNoticeTone}`]">
              {{ plannerMessage }}
            </p>
          </section>

          <section class="kg-card">
            <div class="kg-section-head">
              <div>
                <p class="kg-eyebrow">{{ t('courses.overviewPage.rulesEyebrow') }}</p>
                <h2>{{ t('courses.overviewPage.rulesTitle') }}</h2>
              </div>
              <NuxtLink :to="courseUniverseTo" class="kg-btn kg-btn--ghost kg-btn--compact">
                {{ t('courses.overviewPage.openInMap') }}
              </NuxtLink>
            </div>
            <div v-if="ruleRows.length" class="kg-rule-list">
              <div v-for="rule in ruleRows" :key="rule.key" class="kg-rule-row">
                <span>{{ t(`courses.overviewPage.rules.${rule.key}`) }}</span>
                <p>{{ rule.value }}</p>
              </div>
            </div>
            <div v-else class="kg-empty-state">
              {{ t('courses.overviewPage.noRules') }}
            </div>
          </section>
        </main>

        <aside class="kg-side-stack">
          <section class="kg-card kg-offerings-card">
            <div class="kg-section-head kg-section-head--tight">
              <div>
                <p class="kg-eyebrow">{{ t('courses.overviewPage.offeringsEyebrow') }}</p>
                <h2>{{ t('courses.overviewPage.offeringsTitle') }}</h2>
              </div>
              <button
                v-if="offerings.length > 3"
                type="button"
                class="kg-link-button"
                @click="showAllOfferings = !showAllOfferings"
              >
                {{ showAllOfferings ? t('courses.overviewPage.showRecent') : t('courses.overviewPage.showAll', { count: offerings.length }) }}
              </button>
            </div>

            <div v-if="offerings.length === 0" class="kg-empty-state kg-empty-state--compact">
              {{ t('courses.overviewPage.noOfferings') }}
            </div>

            <div v-else class="kg-offering-list">
              <article v-for="offering in visibleOfferings" :key="offering.offering_tag" class="kg-offering-item">
                <div class="kg-offering-item__body">
                  <h3>{{ offering.display_name }}</h3>
                  <p>{{ formatOfferingMeta(offering) }}</p>
                </div>

                <div class="kg-offering-item__actions">
                  <NuxtLink :to="offeringHomeTo(offering.offering_tag)" class="kg-btn kg-btn--primary kg-btn--block">
                    {{ t('courses.overviewPage.openOffering') }}
                  </NuxtLink>
                </div>
              </article>
            </div>

            <p v-if="hasHiddenOfferings" class="kg-inline-note">
              {{ t('courses.overviewPage.hiddenOfferings', { count: offerings.length - visibleOfferings.length }) }}
            </p>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-course-overview {
  margin: 0 auto;
  max-width: 1180px;
  padding: 20px 20px 60px;
  width: 100%;
}

.kg-back-bar {
  display: flex;
  margin-bottom: 16px;
}

.kg-back-link {
  color: var(--interactive-primary);
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    color: var(--interactive-hover);
  }
}

.kg-card,
.kg-state-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  min-width: 0;
}

.kg-card {
  padding: 22px 24px;
}

.kg-state-card {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  min-height: 240px;
  padding: 40px 20px;
}

.kg-state-card--error {
  color: var(--semantic-error);
}

.kg-spinner {
  animation: spin 0.7s linear infinite;
  border: 3px solid var(--border-primary);
  border-radius: 50%;
  border-top-color: var(--interactive-primary);
  height: 28px;
  width: 28px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.kg-overview-grid {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 340px;
}

.kg-main-stack,
.kg-side-stack {
  display: grid;
  gap: 18px;
}

.kg-side-stack {
  position: sticky;
  top: 104px;
}

.kg-hero {
  display: grid;
  gap: 12px;
}

.kg-hero__top {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.kg-hero h1 {
  color: var(--text-primary);
  display: flex;
  flex-wrap: wrap;
  font-size: 1.62rem;
  column-gap: 12px;
  row-gap: 4px;
  line-height: 1.25;
  margin: 0;
}

.kg-course-code {
  white-space: nowrap;
}

.kg-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.kg-eyebrow {
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  margin: 0 0 6px;
  text-transform: uppercase;
}

.kg-description,
.kg-side-copy,
.kg-inline-note {
  color: var(--text-secondary);
  line-height: 1.65;
}

.kg-description {
  font-size: 0.94rem;
  margin: 0;
  max-width: 72ch;
}

.kg-side-copy {
  font-size: 0.9rem;
  margin: 8px 0 0;
}

.kg-side-copy--small {
  font-size: 0.8rem;
  line-height: 1.45;
}

.kg-inline-note {
  font-size: 0.82rem;
  margin: 10px 0 0;
}

.kg-inline-note.is-success {
  color: var(--semantic-success);
}

.kg-inline-note.is-error {
  color: var(--semantic-error);
}

.kg-section-head {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    color: var(--text-primary);
    font-size: 1.08rem;
    margin: 0;
  }
}

.kg-section-head--tight {
  align-items: flex-start;
  gap: 10px;
}

.kg-meta-chip,
.kg-status-badge,
.kg-academic-chip {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  min-height: 30px;
  padding: 0 11px;
}

.kg-meta-chip {
  background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 25%, var(--border-primary));
  color: var(--interactive-active);
}

.kg-status-badge.active {
  background: color-mix(in srgb, var(--semantic-success) 12%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--semantic-success) 32%, var(--border-primary));
  color: var(--semantic-success);
}

.kg-status-badge.inactive {
  background: var(--surface-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
}

.kg-academic-chip {
  background: var(--surface-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
}

.kg-academic-chip.is-completed {
  background: color-mix(in srgb, var(--semantic-success) 12%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--semantic-success) 34%, var(--border-primary));
  color: var(--semantic-success);
}

.kg-academic-chip.is-in_progress,
.kg-academic-chip.is-planned {
  background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--interactive-primary) 28%, var(--border-primary));
  color: var(--interactive-active);
}

.kg-academic-chip.is-interested {
  background: color-mix(in srgb, var(--semantic-warning) 14%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--semantic-warning) 32%, var(--border-primary));
  color: var(--semantic-warning);
}

.kg-interest-btn {
  align-items: center;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  font-size: 1rem;
  height: 30px;
  justify-content: center;
  padding: 0;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  width: 30px;

  &:hover:not(:disabled) {
    border-color: var(--interactive-primary);
    color: var(--interactive-primary);
  }

  &.is-active {
    background: color-mix(in srgb, var(--semantic-warning) 14%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--semantic-warning) 36%, var(--border-primary));
    color: var(--semantic-warning);

    :deep(svg path) {
      fill: currentColor;
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.kg-cart-btn {
  align-items: center;
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 30%, var(--border-primary));
  border-radius: 12px;
  box-sizing: border-box;
  color: var(--interactive-primary);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 36px;
  height: 36px;
  justify-content: center;
  min-height: 36px;
  padding: 0;
  transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.18s;
  width: 36px;

  svg {
    display: block;
    height: 20px;
    width: 20px;
  }

  .kg-cart-btn__basket,
  .kg-cart-btn__check {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  .kg-cart-btn__wheel {
    fill: currentColor;
  }

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
    border-color: var(--interactive-primary);
    transform: translateY(-1px);
  }

  &.is-added {
    background: var(--interactive-primary);
    border-color: var(--interactive-primary);
    color: var(--text-inverse);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
}

.kg-offerings-card {
  padding: 20px;
}

.kg-offering-list {
  display: grid;
  gap: 10px;
}

.kg-offering-item {
  background: var(--surface-primary);
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 18%, var(--border-primary));
  border-radius: 12px;
  display: grid;
  gap: 12px;
  padding: 16px;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;

  &:hover {
    background: color-mix(in srgb, var(--interactive-primary) 4%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--interactive-primary) 36%, var(--border-primary));
    transform: translateY(-1px);
  }
}

.kg-offering-item__body {
  display: grid;
  gap: 8px;
  min-width: 0;

  h3 {
    color: var(--text-primary);
    font-size: 1.08rem;
    line-height: 1.25;
    margin: 0;
  }

  p {
    color: var(--text-secondary);
    font-size: 0.84rem;
    line-height: 1.5;
    margin: 0;
    overflow: hidden;
    text-wrap: pretty;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
  }
}

.kg-offering-item__actions {
  display: grid;
  gap: 8px;
}

.kg-btn {
  align-items: center;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  justify-content: center;
  min-height: 38px;
  padding: 0 13px;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.kg-btn--compact {
  min-height: 34px;
  white-space: nowrap;
}

.kg-btn--primary {
  background: var(--interactive-primary);
  border: 1px solid var(--interactive-primary);
  color: var(--text-inverse);

  &:hover:not(:disabled) {
    background: var(--interactive-hover);
    border-color: var(--interactive-hover);
  }
}

.kg-btn--ghost {
  background: transparent;
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);

  &:hover:not(:disabled) {
    border-color: var(--interactive-primary);
    color: var(--interactive-primary);
  }
}

.kg-btn--block {
  width: 100%;
}

.kg-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.kg-link-button {
  background: transparent;
  border: 0;
  color: var(--interactive-primary);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 4px 0;
  white-space: nowrap;

  &:hover {
    color: var(--interactive-hover);
  }
}

.kg-empty-state {
  background: var(--surface-secondary);
  border: 1px dashed var(--border-primary);
  border-radius: 14px;
  color: var(--text-secondary);
  padding: 22px 16px;
  text-align: center;
}

.kg-empty-state--compact {
  padding: 18px 12px;
}

.kg-rule-list {
  display: grid;
  gap: 12px;
}

.kg-rule-row {
  border-top: 1px solid var(--border-primary);
  padding-top: 12px;

  &:first-child {
    border-top: 0;
    padding-top: 0;
  }

  span {
    color: var(--text-primary);
    display: block;
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 5px;
  }

  p {
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.65;
    margin: 0;
  }
}

@media (max-width: 980px) {
  .kg-course-overview {
    padding: 16px 14px 48px;
  }

  .kg-overview-grid {
    grid-template-columns: 1fr;
  }

  .kg-side-stack {
    position: static;
  }
}

@media (max-width: 640px) {
  .kg-card {
    padding: 18px;
  }

  .kg-hero__top,
  .kg-section-head {
    flex-direction: column;
  }

  .kg-hero h1 {
    flex-direction: column;
  }

  .kg-hero__meta {
    justify-content: flex-start;
  }
}
</style>
