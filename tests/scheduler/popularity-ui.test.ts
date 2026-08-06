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
})
