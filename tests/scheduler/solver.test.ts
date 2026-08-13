import { describe, expect, it } from 'vitest'
import {
  SCHEDULER_PLAN_LIMIT,
  SCHEDULER_SEARCH_NODE_LIMIT,
  getMaxDayNum,
  solvePlans,
  type CartCourse,
  type SchedulerLecture,
} from '../../utils/scheduler'

function lecture(day: number, start_time: number, end_time: number): SchedulerLecture {
  return { day, start_time, end_time, room: 'R', instructor: 'I' }
}

function course(
  code: string,
  layers: Record<number, { id: number; lectures: SchedulerLecture[]; enabled?: boolean }[]>,
): CartCourse {
  return {
    course_code: code,
    course_title: code,
    credit: 3,
    subject: code.slice(0, 4),
    pg_course: false,
    klms_course: false,
    enabled: true,
    layers: Object.fromEntries(
      Object.entries(layers).map(([layer, bundles]) => [
        Number(layer),
        bundles.map(bundle => ({
          id: bundle.id,
          layer: Number(layer),
          enabled: bundle.enabled ?? true,
          sections: [{
            semester_id: '2530',
            section_id: `${code}-${layer}-${bundle.id}`,
            name: `L${bundle.id}`,
            bundle: bundle.id,
            layer: Number(layer),
            quota: 10,
            section_type: 'L',
            is_main: true,
            lectures: bundle.lectures,
          }],
        })),
      ]),
    ),
  }
}

const noBans = () => Array.from({ length: 7 }, () => Array(8).fill(false))

describe('solvePlans', () => {
  it('chooses one bundle from every enabled layer', () => {
    const result = solvePlans([
      course('AIAA1001', {
        0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }],
        1: [{ id: 2, lectures: [lecture(2, 1030, 1200)] }],
      }),
    ], noBans())

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('expected plans')
    expect(result.plans).toEqual([[
      { courseIndex: 0, layer: 0, bundleId: 1 },
      { courseIndex: 0, layer: 1, bundleId: 2 },
    ]])
  })

  it('uses day minus one when applying a Monday ban', () => {
    const banned = noBans()
    banned[0][0] = true
    const result = solvePlans([
      course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }] }),
    ], banned)

    expect(result).toMatchObject({
      status: 'unavailable-layer',
      courseCode: 'AIAA1001',
      layer: 0,
    })
  })

  it('rejects overlap between layers of the same course', () => {
    const result = solvePlans([
      course('AIAA1001', {
        0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }],
        1: [{ id: 2, lectures: [lecture(1, 1000, 1130)] }],
      }),
    ], noBans())

    expect(result.status).toBe('no-solution')
  })

  it('rejects overlap between different courses', () => {
    const result = solvePlans([
      course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(2, 900, 1030)] }] }),
      course('DSAA1001', { 0: [{ id: 1, lectures: [lecture(2, 1000, 1130)] }] }),
    ], noBans())

    expect(result.status).toBe('no-solution')
  })

  it('expands the timetable to seven columns only for weekend lectures', () => {
    const weekday = course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(5, 900, 1030)] }] })
    const weekend = course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(7, 900, 1030)] }] })
    const plan = [{ courseIndex: 0, layer: 0, bundleId: 1 }]

    expect(getMaxDayNum([weekday], plan)).toBe(5)
    expect(getMaxDayNum([weekend], plan)).toBe(7)
  })

  it('reports empty and disabled carts separately', () => {
    expect(solvePlans([], noBans()).status).toBe('empty-cart')
    const disabled = course('AIAA1001', { 0: [{ id: 1, lectures: [] }] })
    disabled.enabled = false
    expect(solvePlans([disabled], noBans()).status).toBe('all-disabled')
  })

  it('reports truncation only when another valid plan exists beyond the cap', () => {
    const threePlans = course('AIAA1001', {
      0: [1, 2, 3].map(id => ({ id, lectures: [] })),
    })

    const exact = solvePlans([threePlans], noBans(), { maxPlans: 3 })
    expect(exact).toMatchObject({ status: 'ok', truncated: false, limit: 3 })
    if (exact.status !== 'ok') throw new Error('expected plans')
    expect(exact.plans).toHaveLength(3)

    const truncated = solvePlans([threePlans], noBans(), { maxPlans: 2 })
    expect(truncated).toMatchObject({
      status: 'ok',
      truncated: true,
      truncationReason: 'plan-limit',
      limit: 2,
    })
    if (truncated.status !== 'ok') throw new Error('expected plans')
    expect(truncated.plans).toHaveLength(2)
    expect(truncated.plans).toEqual(exact.plans.slice(0, 2))
  })

  it('bounds large Cartesian results at the default plan limit', () => {
    const courses = Array.from({ length: 6 }, (_, courseIndex) => course(
      `TEST${courseIndex}`,
      { 0: [1, 2, 3, 4].map(id => ({ id, lectures: [] })) },
    ))

    const result = solvePlans(courses, noBans())

    expect(result).toMatchObject({
      status: 'ok',
      truncated: true,
      truncationReason: 'plan-limit',
      limit: SCHEDULER_PLAN_LIMIT,
      searchNodeLimit: SCHEDULER_SEARCH_NODE_LIMIT,
    })
    if (result.status !== 'ok') throw new Error('expected plans')
    expect(result.plans).toHaveLength(SCHEDULER_PLAN_LIMIT)
  })

  it('rejects invalid plan limits', () => {
    const oneCourse = course('AIAA1001', { 0: [{ id: 1, lectures: [] }] })

    expect(() => solvePlans([oneCourse], noBans(), { maxPlans: 0 })).toThrow(RangeError)
    expect(() => solvePlans([oneCourse], noBans(), { maxPlans: 1.5 })).toThrow(RangeError)
    expect(() => solvePlans([], noBans(), { maxPlans: 0 })).toThrow(RangeError)
    expect(() => solvePlans([oneCourse], noBans(), { maxSearchNodes: 0 })).toThrow(RangeError)
  })

  it('bounds sparse searches that cannot prove whether a solution exists', () => {
    const fixed = course('FIXD1001', {
      0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }],
    })
    const combinatorialMiddle = Array.from({ length: 5 }, (_, courseIndex) => course(
      `MID${courseIndex}`,
      { 0: [1, 2, 3, 4].map(id => ({ id, lectures: [] })) },
    ))
    const conflictingTail = course('TAIL1001', {
      0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }],
    })

    const result = solvePlans(
      [fixed, ...combinatorialMiddle, conflictingTail],
      noBans(),
      { maxSearchNodes: 25 },
    )

    expect(result).toEqual({ status: 'search-limit', plans: [], searchNodeLimit: 25 })
  })

  it('marks partial plans as incomplete when the search-node budget is reached', () => {
    const manyPlans = [
      course('AIAA1001', { 0: [1, 2].map(id => ({ id, lectures: [] })) }),
      course('DSAA1001', { 0: [1, 2, 3, 4].map(id => ({ id, lectures: [] })) }),
    ]

    const result = solvePlans(manyPlans, noBans(), { maxPlans: 100, maxSearchNodes: 3 })

    expect(result).toMatchObject({
      status: 'ok',
      truncated: true,
      truncationReason: 'search-limit',
      searchNodeLimit: 3,
    })
    if (result.status !== 'ok') throw new Error('expected partial plans')
    expect(result.plans).toHaveLength(2)
  })
})
