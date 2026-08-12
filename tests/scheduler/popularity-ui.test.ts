import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('scheduler popularity UI contract', () => {
  it('uses the authenticated no-store endpoint and handles forbidden access', () => {
    const scheduler = source('../../composables/useScheduler.ts')
    const start = scheduler.indexOf('async function getPopularity')
    const end = scheduler.indexOf('async function getMapComponents', start)
    const popularityMethod = scheduler.slice(start, end)

    expect(popularityMethod).toContain('fetchWithAuth')
    expect(popularityMethod).not.toContain('fetchPublic')
    expect(popularityMethod).toContain('/api/scheduler/popularity/${semester}')
    expect(popularityMethod).toContain("cache: 'no-store'")
    expect(popularityMethod).toContain('resp.status === 403')
  })

  it('refreshes after cart mutations without coupling refresh failures to cart state', () => {
    const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')
    const handlerStart = dashboard.indexOf('async function handleCartAction')
    const handlerEnd = dashboard.indexOf('function toggleBan', handlerStart)
    const handler = dashboard.slice(handlerStart, handlerEnd)

    expect(handler.indexOf('await action()')).toBeLessThan(handler.indexOf('await popularity.refresh()'))
    expect(dashboard).toContain('popularityVerifiedOnly')
    expect(dashboard).toContain(':show-popularity="popularity.canShowPopularity.value"')
    expect(dashboard).toContain(':popularity-generated-at="popularity.generatedAt.value"')
  })

  it('keeps section identifiers on lecture blocks and shows section counts on disabled cards', () => {
    const timetable = source('../../components/scheduler/SchedulerTimetable.vue')
    const courseCard = source('../../components/scheduler/SchedulerCourseCard.vue')

    expect(timetable).toContain('sectionId: section.section_id')
    expect(timetable).toContain('coursePopularity?.sections[section.section_id]')
    expect(timetable).toContain('showPopularity && block.popularity')
    expect(courseCard).toContain('course.enabled || (showPopularity && popularity)')
    expect(courseCard).toContain('v-for="section in bundle.sections"')
    expect(courseCard).toContain('popularity.sections[section.section_id]')
  })

  it('keeps the popularity payload anonymous', () => {
    const schedulerTypes = source('../../utils/scheduler.ts')
    const start = schedulerTypes.indexOf('export interface SchedulerPopularityCounts')
    const end = schedulerTypes.indexOf('// --- Constants ---', start)
    const popularityTypes = schedulerTypes.slice(start, end)

    expect(popularityTypes).not.toMatch(/user_?id|username|email|display_name/i)
  })

  it('loads history only from the authenticated user-triggered dialog', () => {
    const scheduler = source('../../composables/useScheduler.ts')
    const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')
    const sidePanel = source('../../components/scheduler/SchedulerSidePanel.vue')
    const courseCard = source('../../components/scheduler/SchedulerCourseCard.vue')
    const history = source('../../components/scheduler/SchedulerPopularityHistory.vue')
    const chart = source('../../components/scheduler/SchedulerPopularityHistoryChart.client.vue')
    const start = scheduler.indexOf('async function getPopularityHistory')
    const end = scheduler.indexOf('async function getMapComponents', start)
    const historyMethod = scheduler.slice(start, end)

    expect(historyMethod).toContain('fetchWithAuth')
    expect(historyMethod).toContain('/api/scheduler/popularity/${semester}/history')
    expect(historyMethod).toContain("cache: 'no-store'")
    expect(historyMethod).toContain("params.set('from', options.from)")
    expect(historyMethod).toContain("params.set('to', options.to)")
    expect(historyMethod).toContain('signal: options.signal')
    expect(courseCard).toContain('v-if="showPopularityHistory"')
    expect(sidePanel).toContain(':show-popularity-history="showPopularityHistory"')
    expect(dashboard).toContain("props.semesterId === POPULARITY_HISTORY_SEMESTER_ID")
    expect(courseCard).toContain("@click.stop=\"emit('show-popularity-history'")
    expect(sidePanel).toContain('@show-popularity-history')
    expect(dashboard).toContain('@show-popularity-history="handleShowPopularityHistory"')
    expect(history).toContain('await props.getHistory')
    expect(history).toContain('activeRequest?.abort()')
    expect(history).toContain('signal: requestController.signal')
    expect(history).not.toContain('onMounted(')
    expect(history).toContain('Asia/Shanghai')
    expect(history).toContain('<table>')
    expect(chart).toContain("curve: 'stepline'")
    expect(chart).toContain('dashArray: [7, 0]')
    expect(chart).toContain("animations: { enabled: !props.reducedMotion }")
  })

  it('closes and clears history on authorization loss', () => {
    const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')
    const history = source('../../components/scheduler/SchedulerPopularityHistory.vue')

    expect(dashboard).toContain('watch(canShowPopularityHistory')
    expect(dashboard).toContain('if (!authorized) closePopularityHistory()')
    expect(dashboard).toContain('showPopularityHistory.value = false')
    expect(dashboard).toContain('historyCourse.value = null')
    expect(history).toContain('response.value = null')
    expect(history).toContain("status.value = 'idle'")
    expect(history).toContain("emit('access-lost', loadError.kind)")
    expect(dashboard).toContain('@access-lost="handlePopularityHistoryAccessLost"')
    expect(dashboard).toContain("kind === 'authentication'")
    expect(dashboard).toContain("kind === 'authorization'")
    expect(dashboard).toContain('!courseList.value.some')
  })

  it('refreshes open history on five-minute boundaries only while visible', () => {
    const history = source('../../components/scheduler/SchedulerPopularityHistory.vue')

    expect(history).toContain('getNextPopularityHistoryRefreshDelay()')
    expect(history).toContain('document.hidden')
    expect(history).toContain("document.addEventListener('visibilitychange', handleVisibilityChange)")
    expect(history).toContain("document.removeEventListener('visibilitychange', handleVisibilityChange)")
    expect(history).toContain('clearRefreshTimer()')
    expect(history).toContain('void loadHistory(true)')
    expect(history).toContain("t('scheduler.popularityHistoryRefresh')")
    expect(history).toContain('getPopularityHistoryDataState(result)')
  })

  it('types authentication, authorization, and scope failures separately', () => {
    const scheduler = source('../../composables/useScheduler.ts')
    const history = source('../../components/scheduler/SchedulerPopularityHistory.vue')

    expect(scheduler).toContain("SchedulerPopularityHistoryAccessError('authentication', 401)")
    expect(scheduler).toContain("SchedulerPopularityHistoryAccessError('authorization', 403)")
    expect(scheduler).toContain("SchedulerPopularityHistoryAccessError('scope', 404)")
    expect(scheduler).toContain("requestError.message.startsWith('Authentication')")
    expect(history).toContain('loadError instanceof SchedulerPopularityHistoryAccessError')
    expect(history).toContain('popularityHistoryNotStarted')
    expect(history).not.toContain('lookingPeak')
    expect(history).not.toContain('schedulingPeak')
  })
})
