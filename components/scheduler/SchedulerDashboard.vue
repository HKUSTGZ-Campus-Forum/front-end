<!-- front-end/components/scheduler/SchedulerDashboard.vue -->
<script setup lang="ts">
import { ref, computed, onUnmounted, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse, CourseDetail } from '~/utils/scheduler'
import {
  getMaxDayNum,
  POPULARITY_HISTORY_SEMESTER_ID,
  solvePlans,
} from '~/utils/scheduler'
import { createBooleanIntentTracker, createLatestRequestTracker } from '~/utils/schedulerAsync'

const props = defineProps<{
  semesterId: string
  initialCourseList: CartCourse[]
  isLoggedIn: boolean
  loading: boolean
  cartLoadError: boolean
}>()

const emit = defineEmits<{
  (e: 'retry-cart-load'): void
}>()

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { getCourseDetail, getPopularity, getPopularityHistory } = useScheduler()
const loggedIn = toRef(props, 'isLoggedIn')
const cart = useSchedulerCart(
  props.semesterId,
  loggedIn,
  toRef(props, 'initialCourseList'),
)
const courseList = cart.courses
const popularityCourseCodes = computed(() => courseList.value.map(course => course.course_code))
const popularity = useSchedulerPopularity({
  semesterId: props.semesterId,
  isLoggedIn: loggedIn,
  courseCodes: popularityCourseCodes,
  getPopularity,
})
const canShowPopularityHistory = computed(() => (
  props.semesterId === POPULARITY_HISTORY_SEMESTER_ID
  && popularity.canShowPopularity.value
))
const viewIndex = ref(1)
const bannedPeriods = ref<boolean[][]>(
  Array.from({ length: 7 }, () => Array(8).fill(false))
)
const filterMode = ref(false)
const showCartPanel = ref(false)
const showGuestHint = ref(true)
const selectedCourse = ref<CourseDetail | null>(null)
const showCourseDetail = ref(false)
const historyCourse = ref<CartCourse | null>(null)
const showPopularityHistory = ref(false)
const courseDetailStatus = ref<'loading' | 'ready' | 'error'>('loading')
const requestedCourseCode = ref('')
const detailRequests = createLatestRequestTracker()
const toggleIntents = createBooleanIntentTracker()
const cartError = ref('')
const historyAccessError = ref('')
const displayOptions = ref({
  name: true,
  section: true,
  location: true,
  instructor: false,
  duration: false,
})

watch(canShowPopularityHistory, (authorized) => {
  if (!authorized) closePopularityHistory()
}, { flush: 'sync' })

watch(
  () => courseList.value.map(course => course.course_code).sort().join('\u0000'),
  () => {
    if (
      historyCourse.value
      && !courseList.value.some(course => course.course_code === historyCourse.value?.course_code)
    ) {
      closePopularityHistory()
    }
  },
  { flush: 'sync' },
)

const solverResult = computed(() => solvePlans(courseList.value, bannedPeriods.value))
const planList = computed(() => solverResult.value.status === 'ok' ? solverResult.value.plans : [])
const plansTruncated = computed(() => solverResult.value.status === 'ok' && solverResult.value.truncated)
const planCountLabel = computed(() => {
  if (!plansTruncated.value || solverResult.value.status !== 'ok') return String(planList.value.length)
  return solverResult.value.truncationReason === 'plan-limit'
    ? t('scheduler.planCountTruncated', { count: planList.value.length })
    : t('scheduler.planCountIncomplete', { count: planList.value.length })
})
const enabledCourses = computed(() => courseList.value.filter(course => course.enabled))
const totalCredits = computed(() => enabledCourses.value.reduce((sum, course) => sum + course.credit, 0))

const currentPlan = computed(() => {
  const plan = planList.value[viewIndex.value - 1]
  return plan || []
})

const maxDayNum = computed(() => getMaxDayNum(courseList.value, currentPlan.value))

const planMessage = computed(() => {
  if (props.loading || props.cartLoadError) return null
  if (solverResult.value.status === 'empty-cart') return t('scheduler.emptyCartHint')
  if (solverResult.value.status === 'all-disabled') return t('scheduler.allDisabled')
  if (solverResult.value.status === 'unavailable-layer') {
    return t('scheduler.unavailableLayer', {
      course: solverResult.value.courseCode,
      layer: solverResult.value.layer,
    })
  }
  if (solverResult.value.status === 'search-limit') return t('scheduler.searchLimited')
  if (solverResult.value.status === 'no-solution') return t('scheduler.noSolution')
  if (solverResult.value.status === 'ok' && solverResult.value.truncated) {
    return solverResult.value.truncationReason === 'plan-limit'
      ? t('scheduler.plansTruncated', { count: solverResult.value.plans.length })
      : t('scheduler.searchLimited')
  }
  return null
})

// Reset viewIndex when plans change
watch(planList, (plans) => {
  if (viewIndex.value > plans.length) {
    viewIndex.value = Math.max(1, plans.length)
  }
})

watch(() => props.semesterId, () => {
  closeCourseDetail()
})

async function handleShowInfo(code: string) {
  const request = detailRequests.begin()
  requestedCourseCode.value = code
  selectedCourse.value = null
  courseDetailStatus.value = 'loading'
  showCourseDetail.value = true
  try {
    const course = await getCourseDetail(code, props.semesterId, request.signal)
    if (!request.isCurrent() || requestedCourseCode.value !== code) return
    selectedCourse.value = course
    courseDetailStatus.value = 'ready'
  } catch {
    if (request.isCurrent()) courseDetailStatus.value = 'error'
  }
}

function closeCourseDetail() {
  detailRequests.invalidate()
  showCourseDetail.value = false
  selectedCourse.value = null
}

function retryCourseDetail() {
  if (requestedCourseCode.value) void handleShowInfo(requestedCourseCode.value)
}

async function handleCartAction(action: () => Promise<void>) {
  cartError.value = ''
  try {
    await action()
  } catch {
    cartError.value = t('scheduler.cartFailed')
  } finally {
    // A write response can be lost after the server commits. The cart action
    // reconciles that ambiguity; popularity must follow the same outcome even
    // when the user still sees the write error.
    await popularity.refresh()
  }
}

async function handleQueuedToggleAction(
  action: () => Promise<void>,
  releaseIntent: () => void,
) {
  try {
    await handleCartAction(action)
  } finally {
    releaseIntent()
  }
}

function handleShowPopularityHistory(code: string) {
  const course = courseList.value.find(item => item.course_code === code)
  if (!course || !canShowPopularityHistory.value) return
  historyAccessError.value = ''
  historyCourse.value = course
  showPopularityHistory.value = true
}

function closePopularityHistory() {
  showPopularityHistory.value = false
  historyCourse.value = null
}

function handlePopularityHistoryAccessLost(kind: 'authentication' | 'authorization' | 'scope') {
  historyAccessError.value = t(`scheduler.popularityHistory${
    kind === 'authentication'
      ? 'AuthenticationLost'
      : kind === 'authorization'
        ? 'AuthorizationLost'
        : 'ScopeLost'
  }`)
  closePopularityHistory()
}

function handleAddCourse(code: string) {
  return handleCartAction(() => cart.add(code))
}

function handleRemoveCourse(code: string) {
  return handleCartAction(() => cart.remove(code))
}

function handleToggleCourse(code: string, currentEnabled: boolean) {
  const key = `course:${code}`
  const enabled = toggleIntents.next(key, currentEnabled)
  void handleQueuedToggleAction(() => cart.toggleCourse(code, enabled), () => {
    toggleIntents.clearIfCurrent(key, enabled)
  })
}

function handleToggleBundle(
  code: string,
  bundleId: number,
  layer: number,
  currentEnabled: boolean,
) {
  const key = `bundle:${code}:${bundleId}:${layer}`
  const enabled = toggleIntents.next(key, currentEnabled)
  void handleQueuedToggleAction(() => cart.toggleBundle(code, bundleId, layer, enabled), () => {
    toggleIntents.clearIfCurrent(key, enabled)
  })
}

function handleToggleLayer(code: string, layer: number, enabled: boolean) {
  const course = courseList.value.find(item => item.course_code === code)
  const keys = (course?.layers[layer] || []).map(bundle => `bundle:${code}:${bundle.id}:${layer}`)
  for (const key of keys) toggleIntents.set(key, enabled)
  void handleQueuedToggleAction(() => cart.toggleLayer(code, layer, enabled), () => {
    for (const key of keys) toggleIntents.clearIfCurrent(key, enabled)
  })
}

function toggleBan(day: number, period: number) {
  bannedPeriods.value[day][period] = !bannedPeriods.value[day][period]
}

onUnmounted(() => detailRequests.invalidate())
</script>

<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <div class="dashboard__heading">
        <NuxtLink class="dashboard__back" :to="getLocalePath('/courses/planner')">
          {{ t('scheduler.backToSemesters') }}
        </NuxtLink>
        <h1>{{ t('scheduler.title') }}</h1>
        <p>{{ t('scheduler.workspaceSubtitle') }}</p>
      </div>
      <div class="dashboard__summary" aria-label="planner summary">
        <div class="dashboard__summary-item">
          <span>{{ t('scheduler.selectedCourses') }}</span>
          <strong>{{ enabledCourses.length }}</strong>
        </div>
        <div class="dashboard__summary-item">
          <span>{{ t('scheduler.planCount') }}</span>
          <strong>{{ planCountLabel }}</strong>
        </div>
        <div class="dashboard__summary-item">
          <span>{{ t('scheduler.totalCredits') }}</span>
          <strong>{{ totalCredits }}</strong>
        </div>
      </div>
    </header>

    <div v-if="!isLoggedIn && showGuestHint" class="dashboard__notice dashboard__notice--warning">
      <span>{{ t('scheduler.guestHint') }}</span>
      <button type="button" :aria-label="t('scheduler.close')" @click="showGuestHint = false">&times;</button>
    </div>

    <div v-if="popularity.forbidden.value" class="dashboard__notice dashboard__notice--warning">
      {{ t('scheduler.popularityVerifiedOnly') }}
    </div>

    <div v-if="cartLoadError" class="dashboard__notice dashboard__notice--error" role="alert">
      <span>{{ t('scheduler.cartLoadFailed') }}</span>
      <button type="button" @click="emit('retry-cart-load')">{{ t('common.retry') }}</button>
    </div>

    <div v-if="cartError || historyAccessError || planMessage" class="dashboard__notice">
      {{ cartError || historyAccessError || planMessage }}
    </div>

    <div v-if="!cartLoadError && !loading" class="dashboard__body">
      <div class="dashboard__left">
        <div class="dashboard__timetable-card">
          <SchedulerTimetable
            :course-list="courseList"
            :current-plan="currentPlan"
            :banned-periods="bannedPeriods"
            :filter-mode="filterMode"
            :display-options="displayOptions"
            :max-day-num="maxDayNum"
            :popularity-by-course="popularity.popularityByCourse.value"
            :show-popularity="popularity.canShowPopularity.value"
            @toggle-ban="toggleBan"
          />
          <SchedulerBottomPanel
            :current-index="viewIndex"
            :total-plans="planList.length"
            @update:index="viewIndex = $event"
          />
        </div>
      </div>

      <div class="dashboard__right">
        <SchedulerSidePanel
          :course-list="courseList"
          :current-plan="currentPlan"
          :display-options="displayOptions"
          :popularity-by-course="popularity.popularityByCourse.value"
          :popularity-generated-at="popularity.generatedAt.value"
          :show-popularity="popularity.canShowPopularity.value"
          :show-popularity-history="canShowPopularityHistory"
          @toggle-course="handleToggleCourse"
          @toggle-bundle="handleToggleBundle"
          @toggle-layer="handleToggleLayer"
          @show-info="handleShowInfo"
          @show-popularity-history="handleShowPopularityHistory"
          @open-cart="showCartPanel = true"
          @toggle-filter="filterMode = !filterMode"
          @update:display-option="(key, value) => displayOptions[key] = value"
        />
      </div>
    </div>
    <div v-else-if="loading" class="dashboard__loading">{{ t('scheduler.loading') }}</div>

    <!-- Cart Panel Modal -->
    <SchedulerCartPanel
      :semester-id="semesterId"
      :course-list="courseList"
      :visible="showCartPanel && !loading && !cartLoadError"
      :add-course="handleAddCourse"
      :remove-course="handleRemoveCourse"
      @close="showCartPanel = false"
    />

    <SchedulerCourseDetail
      :visible="showCourseDetail"
      :course="selectedCourse"
      :status="courseDetailStatus"
      @close="closeCourseDetail"
      @retry="retryCourseDetail"
    />

    <SchedulerPopularityHistory
      :visible="showPopularityHistory"
      :semester-id="semesterId"
      :course="historyCourse"
      :get-history="getPopularityHistory"
      @close="closePopularityHistory"
      @access-lost="handlePopularityHistoryAccessLost"
    />
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 24px 28px;
  overflow: visible;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  &__heading {
    min-width: 0;

    h1 {
      margin: 4px 0 0;
      color: var(--text-primary);
      font-size: 1.5rem;
      line-height: 1.25;
      font-weight: 700;
    }

    p {
      margin: 7px 0 0;
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.55;
    }
  }

  &__back {
    color: var(--interactive-active);
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;

    &:hover {
      color: var(--interactive-hover);
    }
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(92px, 1fr));
    gap: 10px;
    flex: 0 0 min(420px, 42%);
  }

  &__summary-item {
    min-height: 62px;
    padding: 10px 14px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-small);

    span {
      display: block;
      margin-bottom: 4px;
      color: var(--text-secondary);
      font-size: 0.76rem;
      white-space: nowrap;
    }

    strong {
      color: var(--text-primary);
      font-size: 1.14rem;
      line-height: 1.2;
    }
  }

  &__notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 40px;
    padding: 9px 16px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    color: var(--text-secondary);
    font-size: 0.86rem;
    text-align: center;

    &--warning {
      background: color-mix(in srgb, var(--semantic-warning) 14%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--semantic-warning) 24%, var(--border-secondary));
      color: var(--text-primary);
    }

    button {
      width: 26px;
      height: 26px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;

      &:hover {
        border-color: color-mix(in srgb, var(--semantic-warning) 35%, transparent);
        background: color-mix(in srgb, var(--surface-primary) 70%, transparent);
      }
    }

    &--error {
      background: color-mix(in srgb, var(--semantic-error) 10%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--semantic-error) 24%, var(--border-secondary));
      color: var(--text-primary);

      button {
        width: auto;
        height: 32px;
        padding: 0 12px;
        border-color: color-mix(in srgb, var(--semantic-error) 30%, var(--border-secondary));
        background: var(--surface-primary);
        font-size: 0.82rem;
        font-weight: 700;
      }
    }
  }

  &__body {
    flex: 1;
    min-height: 620px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
    gap: 14px;
    overflow: visible;
  }

  &__left {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__timetable-card {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 10px;
    border: 1px solid var(--border-secondary);
    border-radius: 16px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-small);
  }

  &__right {
    min-width: 0;
    overflow: hidden;
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-tertiary);
  }
}

@media (max-width: 1024px) {
  .dashboard {
    &__header {
      align-items: stretch;
      flex-direction: column;
    }

    &__summary {
      flex-basis: auto;
      width: 100%;
    }

    &__body {
      grid-template-columns: 1fr;
      min-height: 0;
    }

    &__timetable-card {
      min-height: 620px;
    }

    &__right {
      overflow: visible;
    }
  }
}

@media (max-width: 768px) {
  .dashboard {
    min-height: calc(100vh - 64px);
    padding: 16px 14px 28px;

    &__summary {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    &__summary-item {
      padding: 9px 10px;

      span {
        white-space: normal;
      }
    }

    &__notice {
      align-items: flex-start;
      justify-content: space-between;
      text-align: left;
    }

    &__timetable-card {
      min-height: 560px;
      padding: 8px;
    }
  }
}

@media (max-width: 520px) {
  .dashboard {
    &__summary {
      grid-template-columns: 1fr;
    }
  }
}
</style>
