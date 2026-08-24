<!-- front-end/components/scheduler/SchedulerDashboard.vue -->
<script setup lang="ts">
import { ref, computed, toRef, watch, onMounted } from 'vue'
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
import type { SchedulerSavedPlan, SchedulerPlanVisibility } from '~/utils/scheduler'
import {
  buildSchedulerPlanWriteInput,
  schedulerPlanContentFingerprint,
} from '~/utils/schedulerPlans'

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
const route = useRoute()
const router = useRouter()
const {
  getPopularity,
  getPopularityHistory,
  getPlan,
  createPlan,
  updatePlan,
  clearCart,
} = useScheduler()
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

// Resizable side panel: defaults to max(400px, 1/6 of the viewport) on wide
// screens, clamped while dragging and remembered in localStorage.
const SIDE_PANEL_MIN = 320
const SIDE_PANEL_MAX = 640
const SIDE_PANEL_STORAGE_KEY = 'scheduler.side-panel-width'
const bodyRef = ref<HTMLElement | null>(null)
const sidePanelWidth = ref(400)
const sidePanelWidthPx = computed(() => `${sidePanelWidth.value}px`)

function clampSidePanelWidth(width: number): number {
  return Math.min(SIDE_PANEL_MAX, Math.max(SIDE_PANEL_MIN, Math.round(width)))
}

onMounted(() => {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(SIDE_PANEL_STORAGE_KEY)
  } catch {
    // Storage unavailable; fall through to the default width.
  }
  if (saved !== null) {
    const parsed = Number(saved)
    if (Number.isFinite(parsed) && parsed > 0) {
      sidePanelWidth.value = clampSidePanelWidth(parsed)
    } else {
      sidePanelWidth.value = clampSidePanelWidth(Math.max(400, window.innerWidth / 6))
    }
  } else {
    sidePanelWidth.value = clampSidePanelWidth(Math.max(400, window.innerWidth / 6))
  }

  // Restore the per-semester plan index. If plans are already solved apply it
  // now; otherwise the planList watcher applies it once they arrive.
  try {
    const savedIndex = localStorage.getItem(`${PLAN_INDEX_STORAGE_PREFIX}${props.semesterId}`)
    if (savedIndex !== null) {
      const parsed = Number(savedIndex)
      if (Number.isFinite(parsed) && parsed > 0) {
        pendingPlanIndex.value = parsed
      }
    }
  } catch {
    // Storage unavailable; fall through to the default index.
  }
  if (pendingPlanIndex.value !== null && planList.value.length > 0) {
    viewIndex.value = Math.min(pendingPlanIndex.value, planList.value.length)
    pendingPlanIndex.value = null
  }

  // Restore the global display options. Only known boolean keys are applied so
  // a stale or foreign payload cannot corrupt the menu.
  try {
    const savedOptions = localStorage.getItem(DISPLAY_OPTIONS_STORAGE_KEY)
    if (savedOptions !== null) {
      const parsed = JSON.parse(savedOptions)
      if (parsed && typeof parsed === 'object') {
        for (const key of Object.keys(displayOptions.value)) {
          if (typeof parsed[key] === 'boolean') {
            displayOptions.value[key as keyof typeof displayOptions.value] = parsed[key]
          }
        }
      }
    }
  } catch {
    // Malformed payload; keep the defaults.
  }

  // Restore the hover-preview toggle; on by default otherwise.
  try {
    const savedPreview = localStorage.getItem(PREVIEW_SECTION_ENABLED_STORAGE_KEY)
    if (savedPreview === 'false') previewSectionEnabled.value = false
  } catch {
    // Storage unavailable; keep the default (on).
  }

  // Restore the per-semester banned periods. The shape check guards against
  // malformed or foreign payloads; a failed parse keeps the empty grid.
  try {
    const savedBans = localStorage.getItem(`${BANNED_PERIODS_STORAGE_PREFIX}${props.semesterId}`)
    if (savedBans !== null) {
      const parsed = parseBannedPeriods(JSON.parse(savedBans))
      if (parsed) bannedPeriods.value = parsed
    }
  } catch {
    // Malformed payload; keep the defaults.
  }
})

function onResizeStart(event: MouseEvent) {
  event.preventDefault()
  document.body.classList.add('scheduler-resizing')
  const onMove = (moveEvent: MouseEvent) => {
    const rect = bodyRef.value?.getBoundingClientRect()
    if (!rect) return
    // The handle sits at the side panel's left edge: width = body right - x.
    sidePanelWidth.value = clampSidePanelWidth(rect.right - moveEvent.clientX)
  }
  const onUp = () => {
    document.body.classList.remove('scheduler-resizing')
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    try {
      localStorage.setItem(SIDE_PANEL_STORAGE_KEY, String(sidePanelWidth.value))
    } catch {
      // Storage unavailable; keep the in-memory width for this session.
    }
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

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
const activeSavedPlan = ref<SchedulerSavedPlan | null>(null)
const savedPlanBaseline = ref('')
const showPlanDialog = ref(false)
const planSubmitting = ref(false)
const planActionError = ref('')
const planActionMessage = ref('')
const displayOptions = ref({
  name: true,
  section: true,
  location: true,
  instructor: false,
  duration: false,
})
// Which bundle the side panel is currently hovering, so the timetable can
// outline its time slots. `null` when nothing is hovered (or preview is off).
const previewSection = ref<{ code: string; layer: number; bundleId: number } | null>(null)
// User toggle for the hover time-slot preview; on by default.
const previewSectionEnabled = ref(true)

// Persisted state. The current plan index is remembered per semester (plan
// lists are semester-specific); banned periods follow the same per-semester
// scope since the blocked grid belongs to that semester's timetable; display
// options are a global preference.
const PLAN_INDEX_STORAGE_PREFIX = 'scheduler.plan-index.'
const BANNED_PERIODS_STORAGE_PREFIX = 'scheduler.banned-periods.'
const DISPLAY_OPTIONS_STORAGE_KEY = 'scheduler.display-options'
const PREVIEW_SECTION_ENABLED_STORAGE_KEY = 'scheduler.preview-section-enabled'
// Holds a restored plan index until the plan list is solved (plans load
// asynchronously after mount); the planList watcher applies it when ready.
const pendingPlanIndex = ref<number | null>(null)

// Banned periods persist as a 7-day × 8-period boolean grid. A payload that
// does not match that exact shape (malformed JSON, an older version, a
// foreign key) is ignored so it cannot corrupt the planner state.
function parseBannedPeriods(payload: unknown): boolean[][] | null {
  if (!Array.isArray(payload) || payload.length !== 7) return null
  const result: boolean[][] = []
  for (const row of payload) {
    if (!Array.isArray(row) || row.length !== 8) return null
    const parsed: boolean[] = []
    for (const value of row) {
      if (typeof value !== 'boolean') return null
      parsed.push(value)
    }
    result.push(parsed)
  }
  return result
}

watch(viewIndex, (index) => {
  try {
    localStorage.setItem(`${PLAN_INDEX_STORAGE_PREFIX}${props.semesterId}`, String(index))
  } catch {
    // Storage unavailable; keep the in-memory index for this session.
  }
})

watch(bannedPeriods, (periods) => {
  try {
    localStorage.setItem(
      `${BANNED_PERIODS_STORAGE_PREFIX}${props.semesterId}`,
      JSON.stringify(periods),
    )
  } catch {
    // Storage unavailable; keep the in-memory bans for this session.
  }
}, { deep: true })

watch(displayOptions, (options) => {
  try {
    localStorage.setItem(DISPLAY_OPTIONS_STORAGE_KEY, JSON.stringify(options))
  } catch {
    // Storage unavailable; keep the in-memory options for this session.
  }
}, { deep: true })

watch(previewSectionEnabled, (enabled) => {
  try {
    localStorage.setItem(PREVIEW_SECTION_ENABLED_STORAGE_KEY, String(enabled))
  } catch {
    // Storage unavailable; keep the in-memory preference for this session.
  }
  // Nothing should stay highlighted once preview is switched off.
  if (!enabled) previewSection.value = null
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

const currentPlanFingerprint = computed(() => schedulerPlanContentFingerprint({
  courses: courseList.value,
  selections: currentPlan.value,
  bannedPeriods: bannedPeriods.value,
}))
const savedPlanDirty = computed(() => Boolean(
  activeSavedPlan.value?.is_owner
  && savedPlanBaseline.value
  && currentPlanFingerprint.value !== savedPlanBaseline.value,
))
const canSaveCurrentPlan = computed(() => (
  props.isLoggedIn
  && solverResult.value.status === 'ok'
  && currentPlan.value.length > 0
  && !cart.requiresReload.value
))

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

const planIcon = computed(() => {
  const msg = planMessage.value
  if (!msg) return ''
  if (msg.level === 'info') return 'lucide:face-slightly-smiling'
  if (msg.level === 'warning') return 'lucide:face-neutral'
  return 'lucide:face-slightly-frowning'
})

// Reset viewIndex when plans change; a restored (persisted) plan index is
// applied as soon as plans are available, clamped to the plan count.
watch(planList, (plans) => {
  if (pendingPlanIndex.value !== null) {
    if (plans.length > 0) {
      viewIndex.value = Math.min(pendingPlanIndex.value, plans.length)
      pendingPlanIndex.value = null
    }
    return
  }
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

function clearBans() {
  bannedPeriods.value = Array.from({ length: 7 }, () => Array(8).fill(false))
}

function onPreviewBundle(code: string, layer: number, bundleId: number) {
  if (previewSectionEnabled.value) {
    previewSection.value = { code, layer, bundleId }
  }
}

function onClearPreview() {
  previewSection.value = null
}

function fingerprintSavedPlan(plan: SchedulerSavedPlan): string {
  return schedulerPlanContentFingerprint({
    courses: plan.courses || [],
    selections: plan.selections || [],
    bannedPeriods: plan.banned_periods || Array.from({ length: 7 }, () => Array(8).fill(false)),
  })
}

async function loadActiveSavedPlan() {
  const publicId = typeof route.query.plan === 'string' ? route.query.plan : ''
  if (!publicId) return
  try {
    const plan = await getPlan(publicId)
    activeSavedPlan.value = plan
    savedPlanBaseline.value = fingerprintSavedPlan(plan)
  } catch {
    activeSavedPlan.value = null
    savedPlanBaseline.value = ''
  }
}

onMounted(() => void loadActiveSavedPlan())

function openSaveDialog() {
  planActionMessage.value = ''
  planActionError.value = ''
  if (!props.isLoggedIn) {
    showGuestHint.value = true
    return
  }
  if (!canSaveCurrentPlan.value) {
    planActionError.value = t('scheduler.savedPlans.noSavablePlan')
    return
  }
  showPlanDialog.value = true
}

async function saveCurrentPlan(metadata: {
  name: string
  description: string
  visibility: SchedulerPlanVisibility
  saveAsNew: boolean
}) {
  planSubmitting.value = true
  planActionError.value = ''
  try {
    const shouldUpdate = Boolean(activeSavedPlan.value?.is_owner && !metadata.saveAsNew)
    const input = buildSchedulerPlanWriteInput({
      ...metadata,
      semesterId: props.semesterId,
      courses: courseList.value,
      selections: currentPlan.value,
      bannedPeriods: bannedPeriods.value,
      version: shouldUpdate ? activeSavedPlan.value!.version : undefined,
    })
    const saved = shouldUpdate
      ? await updatePlan(activeSavedPlan.value!.public_id, input as typeof input & { version: number })
      : await createPlan(input)
    activeSavedPlan.value = saved
    savedPlanBaseline.value = fingerprintSavedPlan(saved)
    showPlanDialog.value = false
    planActionMessage.value = shouldUpdate
      ? t('scheduler.savedPlans.updatedMessage')
      : t('scheduler.savedPlans.savedMessage')
    await router.replace({ query: { ...route.query, plan: saved.public_id } })
  } catch (error) {
    const code = (error as Error & { code?: string }).code
    planActionError.value = code === 'version_conflict'
      ? t('scheduler.savedPlans.versionConflict')
      : (error instanceof Error ? error.message : t('scheduler.savedPlans.saveFailed'))
  } finally {
    planSubmitting.value = false
  }
}

async function startNewPlan() {
  if (!window.confirm(t('scheduler.savedPlans.newConfirm'))) return
  planActionError.value = ''
  planActionMessage.value = ''
  try {
    if (props.isLoggedIn) {
      await clearCart(props.semesterId)
      await cart.reloadAuthoritative()
    } else {
      courseList.value = []
    }
    clearBans()
    activeSavedPlan.value = null
    savedPlanBaseline.value = ''
    const nextQuery = { ...route.query }
    delete nextQuery.plan
    await router.replace({ query: nextQuery })
    planActionMessage.value = t('scheduler.savedPlans.newReady')
  } catch {
    planActionError.value = t('scheduler.savedPlans.newFailed')
  }
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <div class="dashboard__heading">
        <div class="dashboard__heading-row">
          <NuxtLink
            class="dashboard__back"
            :to="getLocalePath('/courses/planner')"
            :aria-label="t('scheduler.backToSemesters')"
          >
            <Icon name="lucide:arrow-left" class="dashboard__back-icon" aria-hidden="true" />
          </NuxtLink>
          <h1>{{ t('scheduler.title') }}</h1>
        </div>
        <p>{{ t('scheduler.workspaceSubtitle') }}</p>
      </div>
      <div class="dashboard__header-side">
        <nav class="dashboard__plan-actions" :aria-label="t('scheduler.savedPlans.navigation')">
          <button type="button" class="dashboard__action" @click="startNewPlan">
            <Icon name="lucide:file-plus-2" aria-hidden="true" />
            {{ t('scheduler.savedPlans.new') }}
          </button>
          <button
            type="button"
            class="dashboard__action dashboard__action--primary"
            :disabled="isLoggedIn && !canSaveCurrentPlan"
            @click="openSaveDialog"
          >
            <Icon :name="savedPlanDirty ? 'lucide:save' : 'lucide:bookmark-plus'" aria-hidden="true" />
            {{ activeSavedPlan?.is_owner ? t('scheduler.savedPlans.saveChanges') : t('scheduler.savedPlans.save') }}
            <span v-if="savedPlanDirty" class="dashboard__dirty" :title="t('scheduler.savedPlans.unsavedChanges')"></span>
          </button>
          <NuxtLink
            class="dashboard__action"
            :to="getLocalePath({ path: '/courses/planner/plans', query: { fromSemester: props.semesterId } })"
          >
            <Icon name="lucide:folders" aria-hidden="true" />
            {{ t('scheduler.savedPlans.mine') }}
          </NuxtLink>
          <NuxtLink
            class="dashboard__action"
            :to="getLocalePath({ path: '/courses/planner/shared', query: { fromSemester: props.semesterId } })"
          >
            <Icon name="lucide:users" aria-hidden="true" />
            {{ t('scheduler.savedPlans.shared') }}
          </NuxtLink>
        </nav>
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
      </div>
    </header>

    <div v-if="planActionMessage" class="dashboard__notice dashboard__notice--success" role="status">
      <span>{{ planActionMessage }}</span>
      <button type="button" :aria-label="t('scheduler.close')" @click="planActionMessage = ''">&times;</button>
    </div>

    <div v-if="planActionError && !showPlanDialog" class="dashboard__notice dashboard__notice--error" role="alert">
      <span>{{ planActionError }}</span>
      <button type="button" :aria-label="t('scheduler.close')" @click="planActionError = ''">&times;</button>
    </div>

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

    <div
      v-if="!cartLoadError && !loading"
      ref="bodyRef"
      class="dashboard__body"
      :style="{ '--side-panel-width': sidePanelWidthPx }"
    >
      <div class="dashboard__left">
        <div class="dashboard__timetable-card">
          <SchedulerTimetable
            :course-list="courseList"
            :current-plan="currentPlan"
            :banned-periods="bannedPeriods"
            :filter-mode="filterMode"
            :display-options="displayOptions"
            :max-day-num="maxDayNum"
            :preview-section="previewSection"
            :preview-section-enabled="previewSectionEnabled"
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
              <span
                :class="['dashboard__overlay-icon', `is-${planMessage.level}`]"
                aria-hidden="true"
              >
                <Icon v-if="planIcon" :name="planIcon" />
              </span>
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
          :preview-section-enabled="previewSectionEnabled"
          @toggle-course="handleToggleCourse"
          @toggle-bundle="handleToggleBundle"
          @toggle-layer="handleToggleLayer"
          @open-cart="showCartPanel = true"
          @toggle-filter="filterMode = !filterMode"
          @clear-bans="clearBans"
          @update:display-option="(key, value) => displayOptions[key] = value"
          @preview-bundle="onPreviewBundle"
          @clear-preview="onClearPreview"
          @update:preview-section-enabled="(value) => previewSectionEnabled = value"
        />
      </div>

      <!-- Drag handle between timetable and side panel (wide screens only) -->
      <div
        class="dashboard__resize-handle"
        role="separator"
        aria-orientation="vertical"
        @mousedown="onResizeStart"
      >
        <Icon name="lucide:grip-vertical" class="dashboard__resize-handle-icon" aria-hidden="true" />
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

    <SchedulerPlanDialog
      :visible="showPlanDialog"
      :initial-name="activeSavedPlan?.name || ''"
      :initial-description="activeSavedPlan?.description || ''"
      :initial-visibility="activeSavedPlan?.visibility || 'private'"
      :allow-update="Boolean(activeSavedPlan?.is_owner)"
      :submitting="planSubmitting"
      :error="planActionError"
      @close="showPlanDialog = false"
      @save="saveCurrentPlan"
    />
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  position: relative;
  /* Fill the workspace below the fixed 64px top bar. The timetable consumes
     the remaining height after the header, so adding plan actions does not
     push its pagination below the initial viewport. */
  height: calc(100vh - 64px);
  height: calc(100dvh - 64px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 24px 28px;
  overflow-y: auto;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  &__header-side {
    align-items: flex-end;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  &__plan-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    justify-content: flex-end;
  }

  &__action {
    align-items: center;
    background: var(--surface-primary);
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    gap: 6px;
    min-height: 34px;
    padding: 0 11px;
    position: relative;
    text-decoration: none;
    transition: background 0.16s, border-color 0.16s, color 0.16s;

    &:hover {
      border-color: color-mix(in srgb, var(--interactive-primary) 34%, var(--border-secondary));
      color: var(--interactive-active);
    }

    &:disabled { cursor: not-allowed; opacity: 0.5; }

    &--primary {
      background: var(--btn-primary-bg);
      border-color: transparent;
      color: var(--text-inverse);
    }
  }

  &__dirty {
    background: var(--semantic-warning);
    border: 2px solid var(--btn-primary-bg);
    border-radius: 50%;
    height: 8px;
    position: absolute;
    right: -1px;
    top: -1px;
    width: 8px;
  }

  &__heading {
    min-width: 0;

    &-row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    h1 {
      margin: 0;
      color: var(--text-primary);
      font-size: 1.5rem;
      line-height: 1.25;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    p {
      margin: 5px 0 0 calc(32px + 12px); /* aligns with the title, clearing the icon button + row gap */
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.55;
    }
  }

  &__back {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-primary);
    color: var(--interactive-active);
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s, color 0.15s;

    &:hover {
      background: var(--surface-secondary);
      border-color: color-mix(in srgb, var(--interactive-primary) 35%, var(--border-secondary));
      color: var(--interactive-hover);
    }
  }

  &__back-icon {
    font-size: 0.92rem;
    line-height: 1;
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(92px, 1fr));
    gap: 10px;
    flex: 0 0 min(420px, 42%);
  }

  &__summary-item {
    min-height: 46px;
    padding: 6px 12px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-small);

    span {
      display: block;
      margin-bottom: 2px;
      color: var(--text-secondary);
      font-size: 0.72rem;
      white-space: nowrap;
    }

    strong {
      color: var(--text-primary);
      font-size: 1.02rem;
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

    &--success {
      background: color-mix(in srgb, var(--semantic-success) 10%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--semantic-success) 24%, var(--border-secondary));
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
    /* 400px is the timetable's readable floor and 86px is the plan pager.
       Above that floor, the timetable fluidly absorbs the remaining viewport
       height; short viewports can still scroll the dashboard as a fallback. */
    min-height: 486px;
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--side-panel-width, 400px);
    /* Single bounded row: the grid fills the body height and never grows past
       it, so the side panel stays within the row and its course list scrolls
       internally while the timetable keeps its size. */
    grid-template-rows: minmax(0, 1fr);
    gap: 14px;
    overflow: hidden;
  }

  &__resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    right: calc(var(--side-panel-width, 400px));
    width: 14px; /* matches the grid gap, so the pill is centered in the gutter */
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: col-resize;

    /* White vertical pill (rounded bar) floating in the gutter between the
       two panels: tall enough to cover the grip dots, white fill, inset from
       both edges so it reads as a separate handle, not part of either panel. */
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 64px;
      border-radius: 999px;
      background: var(--surface-primary);
      box-shadow: var(--shadow-small);
      transition: background 0.15s, box-shadow 0.15s;
    }

    &-icon {
      position: relative;
      z-index: 1;
      font-size: 15px;
      line-height: 1;
      color: var(--text-secondary);
      transition: color 0.15s;
    }

    &:hover,
    &:active {
      .dashboard__resize-handle-icon {
        color: var(--interactive-primary);
      }
    }
  }

  &__left {
    min-width: 0;
    min-height: 0;
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
    /* Light mode: white rounded card on the blue page background. Dark mode:
       transparent (theme variables) so the table blends with the page. */
    background: var(--timetable-card-bg);
    border: var(--timetable-card-border);
    border-radius: var(--timetable-card-radius);
    box-shadow: var(--timetable-card-shadow);
  }

  &__right {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
  }

  /* Dim overlay (solver hint). Scoped to the timetable card (the nearest
     positioned ancestor), stays below modal layers (cart panel z-index 1120).
     Non-interactive on purpose: the hint clears as soon as the cart/banned
     periods change. */
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

  &__overlay-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3.4rem;
    line-height: 1;
    margin-bottom: 14px;
    color: var(--overlay-text);

    &.is-warning {
      color: var(--semantic-warning);
    }

    &.is-error {
      color: var(--semantic-error);
    }
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
    text-wrap: balance;
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

/* While dragging the side-panel handle, suppress text selection and keep the
   col-resize cursor over the whole page. */
:global(body.scheduler-resizing) {
  user-select: none;
  cursor: col-resize;
}

@media (max-width: 1024px) {
  .dashboard {
    /* Single-column layout flows naturally again: no fixed height, no inner
       scroll, the page scrolls as usual. */
    height: auto;
    min-height: calc(100vh - 84px);
    overflow: visible;

    &__header {
      align-items: stretch;
      flex-direction: column;
    }

    &__header-side { align-items: stretch; }
    &__plan-actions { justify-content: flex-start; }

    &__resize-handle {
      display: none;
    }

    &__summary {
      flex-basis: auto;
      width: 100%;
    }

    &__body {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
      min-height: 0;
      overflow: visible;
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

    &__plan-actions {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    &__action { flex: 0 0 auto; }

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
    // Keep the three summary cards on a single row even on small phones,
    // and keep their labels from wrapping/overflowing in the narrow columns.
    &__summary {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    &__summary-item {
      padding: 8px 6px;
      text-align: center;

      span {
        font-size: 0.68rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      strong {
        font-size: 0.98rem;
      }
    }
  }
}
</style>
