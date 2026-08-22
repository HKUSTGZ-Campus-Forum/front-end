import { describe, expect, it } from 'vitest'

import type { CartCourse, PlanSelection } from '../../utils/scheduler'
import {
  buildSchedulerPlanCourses,
  buildSchedulerPlanWriteInput,
  schedulerPlanContentFingerprint,
} from '../../utils/schedulerPlans'

const courses: CartCourse[] = [
  {
    course_code: 'AIAA 1001',
    course_title: 'Foundations',
    credit: 3,
    subject: 'AIAA',
    pg_course: false,
    klms_course: false,
    enabled: true,
    layers: {
      0: [{ id: 2, layer: 0, enabled: true, sections: [] }],
      1: [{ id: 8, layer: 1, enabled: true, sections: [] }],
    },
  },
  {
    course_code: 'MATH 1002',
    course_title: 'Calculus',
    credit: 4,
    subject: 'MATH',
    pg_course: false,
    klms_course: false,
    enabled: false,
    layers: { 0: [{ id: 1, layer: 0, enabled: true, sections: [] }] },
  },
]

const selections: PlanSelection[] = [
  { courseIndex: 0, bundleId: 8, layer: 1 },
  { courseIndex: 1, bundleId: 1, layer: 0 },
  { courseIndex: 0, bundleId: 2, layer: 0 },
]

describe('saved scheduler plans', () => {
  it('serializes the exact selected bundle per enabled course and layer', () => {
    expect(buildSchedulerPlanCourses(courses, selections)).toEqual([{
      course_code: 'AIAA 1001',
      selections: [
        { bundle_id: 2, layer: 0 },
        { bundle_id: 8, layer: 1 },
      ],
    }])
  })

  it('copies blocked periods and trims plan metadata', () => {
    const bannedPeriods = Array.from({ length: 7 }, () => Array(8).fill(false))
    bannedPeriods[0][0] = true
    const payload = buildSchedulerPlanWriteInput({
      name: '  Morning plan  ',
      description: '  no evening classes  ',
      semesterId: '2610',
      visibility: 'unlisted',
      courses,
      selections,
      bannedPeriods,
      version: 3,
    })
    expect(payload.name).toBe('Morning plan')
    expect(payload.description).toBe('no evening classes')
    expect(payload.version).toBe(3)
    expect(payload.banned_periods).not.toBe(bannedPeriods)
    expect(payload.banned_periods[0]).not.toBe(bannedPeriods[0])
  })

  it('uses a deterministic content fingerprint that ignores metadata', () => {
    const bannedPeriods = Array.from({ length: 7 }, () => Array(8).fill(false))
    const left = schedulerPlanContentFingerprint({ courses, selections, bannedPeriods })
    const right = schedulerPlanContentFingerprint({ courses, selections: [...selections], bannedPeriods })
    expect(left).toBe(right)
    bannedPeriods[2][4] = true
    expect(schedulerPlanContentFingerprint({ courses, selections, bannedPeriods })).not.toBe(left)
  })
})
