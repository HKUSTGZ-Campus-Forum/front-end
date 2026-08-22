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
})
