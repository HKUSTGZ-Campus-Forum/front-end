import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
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
    expect(cartPanel).toContain('subjectRequests = createLatestRequestTracker()')
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
    const detail = source('../../components/scheduler/SchedulerCourseDetail.vue')

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
    expect(detail).toContain("status: 'loading' | 'ready' | 'error'")
    expect(detail).toContain("t('scheduler.courseDetailLoadFailed')")
    expect(detail).toContain("$emit('retry')")
    expect(dashboard).toContain('detailRequests = createLatestRequestTracker()')
    expect(dashboard).toContain('detailRequests.invalidate()')
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
    expect(dashboard).toContain('@toggle-course="handleToggleCourse"')
    expect(dashboard).toContain('@toggle-bundle="handleToggleBundle"')
    expect(dashboard).toContain(`watch(() => props.semesterId, () => {
  closeCourseDetail()
})`)
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
})
