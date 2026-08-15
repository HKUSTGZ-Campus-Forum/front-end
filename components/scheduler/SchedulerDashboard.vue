<!-- front-end/components/scheduler/SchedulerDashboard.vue -->
<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  CartCourse,
  SchedulerPopularityByCourse,
} from '~/utils/scheduler'
import {
  getMaxDayNum,
  POPULARITY_HISTORY_SEMESTER_ID,
  schedulerCourseKey,
  solvePlans,
} from '~/utils/scheduler'
import {
  createBooleanIntentTracker,
  createLatestSettlementTracker,
  getSchedulerCartMutationFailureKind,
} from '~/utils/schedulerAsync'

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
const { getPopularity, getPopularityHistory } = useScheduler()
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
const historyCourse = ref<CartCourse | null>(null)
const showPopularityHistory = ref(false)
const toggleIntents = createBooleanIntentTracker()
const cartActionSettlements = createLatestSettlementTracker()
const cartError = ref<'ambiguous' | 'failed' | 'unverified' | ''>('')
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

watch(cart.requiresReload, (locked) => {
  if (locked) showCartPanel.value = false
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

const planMessage = computed<{ level: 'info' | 'warning' | 'error'; title: string; description: string } | null>(() => {
  if (props.loading || props.cartLoadError) return null
  if (solverResult.value.status === 'empty-cart') {
    return {
      level: 'info',
      title: t('scheduler.emptyCartTitle'),
      description: t('scheduler.emptyCartHint'),
    }
  }
  if (solverResult.value.status === 'all-disabled') {
    return {
      level: 'warning',
      title: t('scheduler.allDisabledTitle'),
      description: t('scheduler.allDisabled'),
    }
  }
  if (solverResult.value.status === 'unavailable-layer') {
    return {
      level: 'error',
      title: t('scheduler.unavailableLayerTitle'),
      description: t('scheduler.unavailableLayer', {
        course: solverResult.value.courseCode,
        layer: solverResult.value.layer,
      }),
    }
  }
  if (solverResult.value.status === 'search-limit') {
    return {
      level: 'error',
      title: t('scheduler.searchLimitedTitle'),
      description: t('scheduler.searchLimited'),
    }
  }
  if (solverResult.value.status === 'no-solution') {
    return {
      level: 'error',
      title: t('scheduler.noSolutionTitle'),
      description: t('scheduler.noSolution'),
    }
  }
  if (solverResult.value.status === 'ok' && solverResult.value.truncated) {
    return {
      level: 'info',
      title: t('scheduler.plansTruncatedTitle'),
      description: solverResult.value.truncationReason === 'plan-limit'
        ? t('scheduler.plansTruncated', { count: solverResult.value.plans.length })
        : t('scheduler.searchLimited'),
    }
  }
  return null
})

const planEmoji = computed(() => {
  const msg = planMessage.value
  if (!msg) return ''
  if (msg.level === 'info') return '😉'
  if (msg.level === 'warning') return '😲'
  return '😢'
})

// Reset viewIndex when plans change
watch(planList, (plans) => {
  if (viewIndex.value > plans.length) {
    viewIndex.value = Math.max(1, plans.length)
  }
})

async function handleCartAction(action: () => Promise<void>) {
  const settlement = cartActionSettlements.begin()
  try {
    await action()
    if (settlement.isCurrent()) cartError.value = ''
  } catch (error) {
    if (!settlement.isCurrent()) return
    const kind = getSchedulerCartMutationFailureKind(error)
    cartError.value = kind === 'write-ambiguous-reconciled'
      ? 'ambiguous'
      : kind === 'state-unverified' || kind === 'blocked'
        ? 'unverified'
        : 'failed'
  } finally {
    // A write response can be lost after the server commits. The cart action
    // reconciles that ambiguity; popularity must follow the same outcome even
    // when the user still sees the write error.
    await popularity.refresh()
  }
}

async function reloadCartAfterUnverifiedMutation() {
  const settlement = cartActionSettlements.begin()
  try {
    await cart.reloadAuthoritative()
    if (settlement.isCurrent()) cartError.value = ''
  } catch {
    if (settlement.isCurrent()) cartError.value = 'unverified'
  } finally {
    await popularity.refresh()
  }
}

const cartErrorMessage = computed(() => (
  cartError.value === 'ambiguous'
    ? t('scheduler.cartMutationAmbiguous')
    : cartError.value === 'unverified'
      ? t('scheduler.cartStateUnverified')
      : cartError.value === 'failed'
        ? t('scheduler.cartFailed')
      : ''
))

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
  const intent = toggleIntents.next(key, currentEnabled)
  void handleQueuedToggleAction(() => cart.toggleCourse(code, intent.value), () => {
    toggleIntents.clearIfCurrent(key, intent.token)
  })
}

function handleToggleBundle(
  code: string,
  bundleId: number,
  layer: number,
  currentEnabled: boolean,
) {
  const key = `bundle:${code}:${bundleId}:${layer}`
  const intent = toggleIntents.next(key, currentEnabled)
  void handleQueuedToggleAction(() => cart.toggleBundle(code, bundleId, layer, intent.value), () => {
    toggleIntents.clearIfCurrent(key, intent.token)
  })
}

function handleToggleLayer(code: string, layer: number, enabled: boolean) {
  const course = courseList.value.find(item => item.course_code === code)
  const keys = (course?.layers[layer] || []).map(bundle => `bundle:${code}:${bundle.id}:${layer}`)
  const intents = keys.map(key => [key, toggleIntents.set(key, enabled)] as const)
  void handleQueuedToggleAction(() => cart.toggleLayer(code, layer, enabled), () => {
    for (const [key, intent] of intents) toggleIntents.clearIfCurrent(key, intent.token)
  })
}

function toggleBan(day: number, period: number) {
  bannedPeriods.value[day][period] = !bannedPeriods.value[day][period]
}
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

    <div v-if="!isLoggedIn && showGuestHint && !planMessage" class="dashboard__notice dashboard__notice--warning">
      <span>{{ t('scheduler.guestHint') }}</span>
      <button type="button" :aria-label="t('scheduler.close')" @click="showGuestHint = false">&times;</button>
    </div>

    <div v-if="cartLoadError" class="dashboard__notice dashboard__notice--error" role="alert">
      <span>{{ t('scheduler.cartLoadFailed') }}</span>
      <button type="button" @click="emit('retry-cart-load')">{{ t('common.retry') }}</button>
    </div>

    <div
      v-if="cartErrorMessage || historyAccessError"
      class="dashboard__notice"
      :class="{ 'dashboard__notice--error': cartError === 'unverified' }"
      :role="cartError === 'unverified' ? 'alert' : undefined"
    >
      <span>{{ cartErrorMessage || historyAccessError }}</span>
      <button
        v-if="cartError === 'unverified'"
        type="button"
        :disabled="cart.reloading.value"
        @click="reloadCartAfterUnverifiedMutation"
      >
        {{ cart.reloading.value ? t('scheduler.loading') : t('common.retry') }}
      </button>
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
            @toggle-ban="toggleBan"
          />
          <SchedulerBottomPanel
            :current-index="viewIndex"
            :total-plans="planList.length"
            @update:index="viewIndex = $event"
          />

          <!-- Dim overlay with solver hint. Scoped to the timetable card only
               (like the original planner), so the side panel stays visible. -->
          <Transition name="overlay">
            <div v-if="planMessage" class="dashboard__overlay" role="status">
              <span class="dashboard__overlay-emoji" aria-hidden="true">{{ planEmoji }}</span>
              <p class="dashboard__overlay-title">{{ planMessage.title }}</p>
              <p class="dashboard__overlay-description">{{ planMessage.description }}</p>
            </div>
          </Transition>
        </div>
      </div>

      <div class="dashboard__right">
        <SchedulerSidePanel
          :course-list="courseList"
          :current-plan="currentPlan"
          :display-options="displayOptions"
          :popularity-by-course="popularity.popularityByCourse.value"
          :show-popularity="popularity.canShowPopularity.value"
          :semester-id="semesterId"
          :filter-mode="filterMode"
          :mutations-disabled="cart.requiresReload.value || cart.reloading.value"
          @toggle-course="handleToggleCourse"
          @toggle-bundle="handleToggleBundle"
          @toggle-layer="handleToggleLayer"
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
      :visible="showCartPanel && !loading && !cartLoadError && !cart.requiresReload.value"
      :add-course="handleAddCourse"
      :remove-course="handleRemoveCourse"
      @close="showCartPanel = false"
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
  position: relative;
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
    position: relative;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    // Light mode: white rounded card on the blue page background. Dark mode:
    // transparent (theme variables) so the table blends with the page.
    background: var(--timetable-card-bg);
    border: var(--timetable-card-border);
    border-radius: var(--timetable-card-radius);
    box-shadow: var(--timetable-card-shadow);
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

  // Dim overlay (solver hint). Scoped to the timetable card (the nearest
  // positioned ancestor), stays below modal layers (cart panel z-index 1120).
  // Non-interactive on purpose: the hint clears as soon as the cart/banned
  // periods change.
  &__overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px;
    background: var(--overlay-backdrop);
    pointer-events: none;
    text-align: center;
  }

  &__overlay-emoji {
    font-size: 3.4rem;
    line-height: 1;
    margin-bottom: 14px;
  }

  &__overlay-title {
    margin: 0;
    color: var(--overlay-text);
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
  }

  &__overlay-description {
    max-width: 440px;
    margin: 10px 0 0;
    color: var(--overlay-text-secondary);
    font-size: 0.94rem;
    line-height: 1.6;
  }
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
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
