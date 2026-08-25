import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n?/g, '\n')
}

describe('scheduler hardening UI contract', () => {
  it('shows an explicit capped-plan count and truncation message', () => {
    const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')

    expect(dashboard).toContain('solverResult.value.truncated')
    expect(dashboard).toContain("t('scheduler.planCountTruncated'")
    expect(dashboard).toContain("t('scheduler.planCountIncomplete'")
    expect(dashboard).toContain("t('scheduler.plansTruncated'")
    expect(dashboard).toContain("t('scheduler.searchLimited'")
    expect(dashboard).toContain('<strong>{{ planCountLabel }}</strong>')
  })

  it('awaits cart callbacks and guards all requests with latest-request trackers', () => {
    const cartPanel = source('../../components/scheduler/SchedulerCartPanel.vue')
    const schedulerApi = source('../../composables/useScheduler.ts')

    expect(cartPanel).toContain('addCourse: (code: string) => Promise<void>')
    expect(cartPanel).toContain('removeCourse: (code: string) => Promise<void>')
    expect(cartPanel).toContain('runPendingSchedulerAction(pendingCodes.value')
    expect(cartPanel).not.toContain("emit('add'")
    expect(cartPanel).not.toContain("emit('remove'")
    // Subject chips are curated/hardcoded now, so there is no subject request
    // left unguarded (only search remains, tracked below)
    expect(cartPanel).not.toContain('subjectRequests')
    expect(cartPanel).toContain('searchRequests = createLatestRequestTracker()')
    expect(cartPanel).toContain(`searchRequests.invalidate()
  searching.value = false
  errorMessage.value = ''
  currentPage.value = 1
  searchResults.value = []
  totalResults.value = 0`)
    expect(cartPanel).toContain(`if (!visible || !query.trim()) {
    return
  }

  searching.value = true`)
    expect(cartPanel).toContain('request.isCurrent()')
    expect(schedulerApi).toContain('signal?: AbortSignal')
    expect(schedulerApi).toContain('{ signal }')
  })

  it('renders retryable cart, semester, and detail load failures', () => {
    const planner = source('../../pages/courses/planner/[semester].vue')
    const semesterIndex = source('../../pages/courses/planner/index.vue')
    const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')
    const infoPopover = source('../../components/scheduler/SchedulerCourseInfoPopover.vue')

    expect(planner).toContain(':cart-load-error="loadError"')
    expect(planner).toContain('@retry-cart-load="reload"')
    expect(dashboard).toContain("t('scheduler.cartLoadFailed')")
    expect(dashboard).toContain("emit('retry-cart-load')")
    expect(dashboard).toContain('v-if="!cartLoadError && !loading"')
    expect(dashboard).toContain(':visible="showCartPanel && !loading && !cartLoadError && !cart.requiresReload.value"')
    expect(semesterIndex).toContain('v-else-if="loadError"')
    expect(semesterIndex).toContain("t('scheduler.semestersLoadFailed')")
    expect(semesterIndex.indexOf('v-else-if="loadError"')).toBeLessThan(
      semesterIndex.indexOf("t('scheduler.noSemesters')"),
    )
    expect(infoPopover).toContain("'loading' | 'ready' | 'error'")
    expect(infoPopover).toContain("t('scheduler.courseDetailLoadFailed')")
    expect(infoPopover).toContain('function retry()')
    expect(infoPopover).toContain('detailRequests = createLatestRequestTracker()')
    expect(infoPopover).toContain('detailRequests.invalidate()')
    expect(infoPopover).toContain('watch(() => [props.courseCode, props.semesterId]')
    expect(dashboard).not.toContain('detailRequests')
    expect(dashboard).not.toContain('closeCourseDetail')
    expect(dashboard).toContain('finally {')
    expect(dashboard).toContain('await popularity.refresh()')
    expect(dashboard).toContain('toggleIntents.next(key, currentEnabled)')
    expect(dashboard).toContain('intent.token')
    expect(dashboard).toContain('cart.requiresReload.value || cart.reloading.value')
    expect(dashboard).toContain('reloadCartAfterUnverifiedMutation')
    expect(dashboard).toContain('watch(cart.requiresReload')
    expect(dashboard).toContain("kind === 'write-ambiguous-reconciled'")
    expect(dashboard).toContain("kind === 'state-unverified' || kind === 'blocked'")
    expect(dashboard).toContain("cartError.value = kind === 'write-ambiguous-reconciled'")
    expect(dashboard).toContain('settlement.isCurrent()')
    expect(dashboard).toContain("? 'ambiguous'")
    expect(dashboard).toContain(": 'failed'")
    expect(dashboard).toContain('@toggle-course="handleToggleCourseByMode"')
    expect(dashboard).toContain('handleToggleCourse(code, currentEnabled)')
    expect(dashboard).toContain('optimizer.toggleCandidate(code)')
    expect(dashboard).toContain('@toggle-bundle="handleToggleBundle"')
    expect(dashboard).toContain(':semester-id="semesterId"')
  })

  it('keeps the new error and truncation messages translated', () => {
    const en = JSON.parse(source('../../i18n/locales/en.json')).scheduler
    const zh = JSON.parse(source('../../i18n/locales/zh.json')).scheduler
    const keys = [
      'planCountTruncated',
      'planCountIncomplete',
      'plansTruncated',
      'searchLimited',
      'cartLoadFailed',
      'semestersLoadFailed',
      'courseDetailLoadFailed',
      'cartMutationAmbiguous',
      'cartStateUnverified',
    ]

    for (const key of keys) {
      expect(en[key]).toBeTruthy()
      expect(zh[key]).toBeTruthy()
    }

    expect(en.cartFailed).not.toMatch(/refresh/i)
    expect(en.cartStateUnverified).toMatch(/locked/i)
  })

  it('keeps banned period markers visible outside edit mode', () => {
    const timetable = source('../../components/scheduler/SchedulerTimetable.vue')

    // Ban cells are always rendered (not gated behind `v-if="filterMode"`),
    // so blocked periods stay visible after leaving edit mode.
    expect(timetable).not.toContain('<template v-if="filterMode">')
    expect(timetable).toContain("'timetable__cell--readonly': !filterMode")
    // Only edit mode makes the cells clickable.
    expect(timetable).toContain('if (!props.filterMode) return')
    expect(timetable).toContain("emit('toggle-ban', day, period)")
    // Hover hint icons render only in edit mode.
    expect(timetable).toContain('v-if="filterMode && !isBanned(d - 1, p - 1)"')
    expect(timetable).toContain('v-else-if="filterMode"')
    // Read-only markers pass pointer events through to lecture blocks.
    expect(timetable).toContain('&--readonly {')
    expect(timetable).toContain('pointer-events: none;')
    // The revert (unban) icon is hidden at rest and only fades in on hover.
    expect(timetable).toContain('&--unban {')
    expect(timetable).not.toContain('&--banned &-icon--unban {')
    expect(timetable).toContain('&--banned:hover &-icon--unban {')
    expect(timetable).toContain('opacity: 0.9;')
  })

  it('persists the plan index and banned periods per semester, display options globally', () => {
    const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')

    // Plan index and banned periods are stored per semester; display options
    // are a global pref.
    expect(dashboard).toContain("const PLAN_INDEX_STORAGE_PREFIX = 'scheduler.plan-index.'")
    expect(dashboard).toContain("const BANNED_PERIODS_STORAGE_PREFIX = 'scheduler.banned-periods.'")
    expect(dashboard).toContain("const DISPLAY_OPTIONS_STORAGE_KEY = 'scheduler.display-options'")
    expect(dashboard).toContain('`${PLAN_INDEX_STORAGE_PREFIX}${props.semesterId}`')
    expect(dashboard).toContain('`${BANNED_PERIODS_STORAGE_PREFIX}${props.semesterId}`')

    // Restore is guarded (SSR-safe localStorage access wrapped in try/catch).
    expect(dashboard).toContain('localStorage.getItem(`${PLAN_INDEX_STORAGE_PREFIX}${props.semesterId}`)')
    expect(dashboard).toContain('localStorage.getItem(`${BANNED_PERIODS_STORAGE_PREFIX}${props.semesterId}`)')
    expect(dashboard).toContain('localStorage.getItem(DISPLAY_OPTIONS_STORAGE_KEY)')
    // A restored index waits for the plan list, then clamps to its length.
    expect(dashboard).toContain('Math.min(pendingPlanIndex.value, plans.length)')
    // Only known boolean display keys are applied from a stored payload.
    expect(dashboard).toContain("typeof parsed[key] === 'boolean'")
    // Banned periods are validated against the 7×8 boolean grid shape.
    expect(dashboard).toContain('function parseBannedPeriods(payload: unknown): boolean[][] | null')
    expect(dashboard).toContain('payload.length !== 7')
    expect(dashboard).toContain('row.length !== 8')
    expect(dashboard).toContain("typeof value !== 'boolean'")
    // Writes happen through deep watchers so in-place mutations persist.
    expect(dashboard).toContain('watch(bannedPeriods, (periods) => {')
    expect(dashboard).toContain('watch(displayOptions, (options) => {')
    expect(dashboard).toContain('}, { deep: true })')
  })
})
