import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('saved scheduler plan UI contracts', () => {
  it('exposes all four product entry points from the planner dashboard', () => {
    const dashboard = read('components/scheduler/SchedulerDashboard.vue')
    expect(dashboard).toContain("t('scheduler.savedPlans.new')")
    expect(dashboard).toContain("t('scheduler.savedPlans.save')")
    expect(dashboard).toContain("'/courses/planner/plans'")
    expect(dashboard).toContain("'/courses/planner/shared'")
  })

  it('keeps private constraints out of shared-page rendering', () => {
    const sharedIndex = read('pages/courses/planner/shared/index.vue')
    const sharedDetail = read('pages/courses/planner/shared/[publicId].vue')
    expect(sharedIndex).not.toContain('banned_periods')
    expect(sharedDetail).not.toContain('banned_periods')
  })

  it('includes narrow-screen layouts for the dialog and plan pages', () => {
    expect(read('components/scheduler/SchedulerPlanDialog.vue')).toContain('@media (max-width: 520px)')
    expect(read('pages/courses/planner/plans.vue')).toContain('@media (max-width: 600px)')
    expect(read('pages/courses/planner/shared/index.vue')).toContain('@media (max-width: 600px)')
  })

  it('provides an accessible route back to the originating planner workspace', () => {
    const navigation = read('components/scheduler/SchedulerPlanNavigation.vue')
    const origin = read('composables/useSchedulerPlanNavigation.ts')
    const dashboard = read('components/scheduler/SchedulerDashboard.vue')
    const mine = read('pages/courses/planner/plans.vue')
    const shared = read('pages/courses/planner/shared/index.vue')
    const detail = read('pages/courses/planner/shared/[publicId].vue')

    expect(navigation).toContain("t('scheduler.savedPlans.backToPlanner')")
    expect(navigation).toContain(':to="plannerTo"')
    expect(navigation).toContain('aria-current')
    expect(navigation).toContain('min-height: 44px')
    expect(navigation).toContain('@media (max-width: 600px)')
    expect(origin).toContain('normalizeSchedulerPlanOrigin')
    expect(origin).toContain('SCHEDULER_PLAN_ORIGIN_QUERY')
    expect(dashboard).toContain('fromSemester: props.semesterId')
    expect(mine).toContain('<SchedulerPlanNavigation active="mine" />')
    expect(shared).toContain('<SchedulerPlanNavigation active="shared" />')
    expect(shared).toContain('toPlanPage(`/courses/planner/shared/${plan.public_id}`)')
    expect(detail).toContain(':to="sharedTo"')
    expect(detail).toContain("toPlanPage('/courses/planner/plans', { plan: copy.public_id })")
  })
})
