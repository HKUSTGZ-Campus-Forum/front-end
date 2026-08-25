import { describe, expect, it } from 'vitest'

import {
  buildSchedulerOptimizerCourses,
  schedulerHhmmToMinutes,
  scoreSchedulerOptimizerSelection,
  solveRankedScheduler,
  type SchedulerOptimizerCourse,
  type SchedulerOptimizerScoreProfile,
  type SchedulerOptimizerSelectedCourse,
} from '../../utils/schedulerOptimizer'
import {
  schedulerLecturesOverlap,
  solvePlans,
  type CartCourse,
  type SchedulerLecture,
  type SchedulerSection,
} from '../../utils/scheduler'

function lecture(
  day: number,
  start_time: number,
  end_time: number,
  date_ranges?: SchedulerLecture['date_ranges'],
): SchedulerLecture {
  return { day, start_time, end_time, room: 'R', instructor: 'I', date_ranges }
}

type BundleFixture = {
  id: number
  enabled?: boolean
  sections?: Array<{
    id: string
    name?: string
    isMain?: boolean
    sectionType?: string
    lectures?: SchedulerLecture[]
  }>
  lectures?: SchedulerLecture[]
}

function cartCourse(
  code: string,
  credit: number,
  layerFixtures: Record<number, BundleFixture[]>,
): CartCourse {
  return {
    course_code: code,
    course_title: `Course ${code}`,
    credit,
    subject: code.slice(0, 4),
    pg_course: false,
    klms_course: false,
    enabled: true,
    layers: Object.fromEntries(Object.entries(layerFixtures).map(([layerText, bundles]) => {
      const layer = Number(layerText)
      return [layer, bundles.map((bundle) => {
        const sectionFixtures = bundle.sections ?? [{
          id: `${code}-${layer}-${bundle.id}`,
          name: `${layer === 0 ? 'L' : 'T'}${String(bundle.id).padStart(2, '0')}`,
          isMain: layer === 0,
          sectionType: layer === 0 ? 'L' : 'T',
          lectures: bundle.lectures ?? [],
        }]
        const sections: SchedulerSection[] = sectionFixtures.map(section => ({
          semester_id: '2610',
          section_id: section.id,
          name: section.name ?? section.id,
          bundle: bundle.id,
          layer,
          quota: 10,
          section_type: section.sectionType ?? (layer === 0 ? 'L' : 'T'),
          is_main: section.isMain ?? layer === 0,
          lectures: section.lectures ?? [],
        }))
        return {
          id: bundle.id,
          layer,
          enabled: bundle.enabled ?? true,
          sections,
        }
      })]
    })),
  }
}

function noBans(): boolean[][] {
  return Array.from({ length: 7 }, () => Array(8).fill(false))
}

function emptyProfile(
  overrides: Partial<SchedulerOptimizerScoreProfile> = {},
): SchedulerOptimizerScoreProfile {
  return {
    schemaVersion: 1,
    baseScore: '0',
    creditDelta: '0',
    countRules: [],
    courseRules: [],
    sectionRules: [],
    earlyRules: [],
    timeRules: [],
    ...overrides,
  }
}

function parseComparableDecimal(value: string): { coefficient: bigint; scale: number } {
  const negative = value.startsWith('-')
  const unsigned = value.replace(/^[+-]/, '')
  const [whole, fraction = ''] = unsigned.split('.')
  return {
    coefficient: (negative ? -1n : 1n) * BigInt(whole + fraction),
    scale: fraction.length,
  }
}

function compareScore(left: string, right: string): number {
  const parsedLeft = parseComparableDecimal(left)
  const parsedRight = parseComparableDecimal(right)
  const scale = Math.max(parsedLeft.scale, parsedRight.scale)
  const leftCoefficient = parsedLeft.coefficient * 10n ** BigInt(scale - parsedLeft.scale)
  const rightCoefficient = parsedRight.coefficient * 10n ** BigInt(scale - parsedRight.scale)
  return leftCoefficient < rightCoefficient ? -1 : leftCoefficient > rightCoefficient ? 1 : 0
}

function selectionSignature(selected: readonly SchedulerOptimizerSelectedCourse[]): string {
  return JSON.stringify([...selected]
    .sort((left, right) => left.course.code.localeCompare(right.course.code, 'en'))
    .map(entry => [entry.course.code, entry.option.id]))
}

function planSignature(plan: { chosen: Array<{ courseCode: string; optionId: string }> }): string {
  return JSON.stringify(plan.chosen.map(entry => [entry.courseCode, entry.optionId]))
}

function bruteForceTopDistinct(
  courses: readonly SchedulerOptimizerCourse[],
  minCourses: number,
  maxCourses: number,
  topX: number,
  profile: SchedulerOptimizerScoreProfile,
) {
  const feasible: Array<{ signature: string; score: string }> = []
  const selected: SchedulerOptimizerSelectedCourse[] = []

  const canPlace = (course: SchedulerOptimizerCourse, optionIndex: number) => {
    const candidate = course.options[optionIndex]
    return selected.every(entry => !candidate.lectures.some(candidateLecture => (
      entry.option.lectures.some(existing => schedulerLecturesOverlap(candidateLecture, existing))
    )))
  }

  const visit = (index: number) => {
    if (index === courses.length) {
      if (selected.length < minCourses || selected.length > maxCourses) return
      feasible.push({
        signature: selectionSignature(selected),
        score: scoreSchedulerOptimizerSelection(selected, profile).score,
      })
      return
    }

    visit(index + 1)
    if (selected.length >= maxCourses) return
    const course = courses[index]
    for (let optionIndex = 0; optionIndex < course.options.length; optionIndex += 1) {
      if (!canPlace(course, optionIndex)) continue
      selected.push({ course, option: course.options[optionIndex] })
      visit(index + 1)
      selected.pop()
    }
  }
  visit(0)

  const distinctScores = [...new Set(feasible.map(entry => entry.score))]
    .sort((left, right) => compareScore(right, left))
    .slice(0, topX)
  const rankByScore = new Map(distinctScores.map((score, index) => [score, index + 1]))
  const retained = feasible
    .filter(entry => rankByScore.has(entry.score))
    .sort((left, right) => (
      compareScore(right.score, left.score)
      || left.signature.localeCompare(right.signature, 'en')
    ))
    .map(entry => ({ ...entry, rank: rankByScore.get(entry.score)! }))
  return { feasible, retained, distinctScores }
}

describe('scheduler ranked optimizer adapter', () => {
  it('treats a course with no selectable layer as unavailable', () => {
    const [prepared] = buildSchedulerOptimizerCourses([
      cartCourse('EMPTY1001', 3, {}),
    ], noBans(), ['EMPTY1001'])

    expect(prepared.options).toEqual([])
  })

  it('forms one full option across every layer and keeps each bundle atomic', () => {
    const firstHalf = [{ start_date: '2026-09-01', end_date: '2026-09-30' }]
    const secondHalf = [{ start_date: '2026-10-01', end_date: '2026-12-01' }]
    const course = cartCourse('AIAA1001', 3, {
      0: [
        {
          id: 1,
          sections: [
            { id: 'L01', lectures: [lecture(1, 900, 1030, firstHalf)] },
            // These overlap, but they belong to one atomic API bundle and must
            // not make the bundle disappear.
            { id: 'L01A', lectures: [lecture(1, 930, 1000, firstHalf)] },
          ],
        },
        { id: 2, lectures: [lecture(2, 900, 1030)] },
      ],
      1: [
        { id: 10, lectures: [lecture(1, 900, 1030, secondHalf)] },
        { id: 11, lectures: [lecture(3, 1030, 1200)] },
      ],
    })

    const [prepared] = buildSchedulerOptimizerCourses([course], noBans(), ['AIAA1001'])
    expect(prepared.options).toHaveLength(4)
    expect(prepared.options.every(option => option.selections.length === 2)).toBe(true)
    expect(prepared.options.some(option => (
      option.selections[0].bundleId === 1 && option.selections[1].bundleId === 10
    ))).toBe(true)
    expect(prepared.options.flatMap(option => option.sections).some(section => section.sectionId === 'L01')).toBe(true)
  })

  it('matches solvePlans for complete required and elective module selections', () => {
    const course = cartCourse('UCUG1000', 3, {
      0: [{ id: 1, sections: [{ id: 'M01-L01', sectionType: 'M01' }] }],
      1: [
        { id: 10, sections: [{ id: 'M02-L01', sectionType: 'M02' }] },
        { id: 11, sections: [{ id: 'M03-L01', sectionType: 'M03' }] },
      ],
      2: [
        { id: 20, sections: [{ id: 'M05-L01', sectionType: 'M05' }] },
        { id: 21, sections: [{ id: 'M06-L01', sectionType: 'M06' }] },
      ],
    })
    course.selection_policy = {
      kind: 'module',
      modules: [
        { code: 'M01', title: 'Required', credit: 1, available: true },
        { code: 'M02', title: 'Elective 2', credit: 1, available: true },
        { code: 'M03', title: 'Elective 3', credit: 1, available: true },
        { code: 'M05', title: 'Elective 5', credit: 1, available: true },
        { code: 'M06', title: 'Elective 6', credit: 1, available: true },
      ],
      groups: [
        { id: 'required', role: 'required', min_select: 1, max_select: 1, module_codes: ['M01'] },
        {
          id: 'electives',
          role: 'elective',
          min_select: 1,
          max_select: 2,
          module_codes: ['M02', 'M03', 'M05', 'M06'],
        },
      ],
    }

    const [prepared] = buildSchedulerOptimizerCourses([course], noBans(), ['UCUG1000'])
    const fixedSolver = solvePlans([course], noBans())
    expect(fixedSolver.status).toBe('ok')
    if (fixedSolver.status !== 'ok') throw new Error('expected fixed-solver module plans')

    expect(prepared.options.map(option => option.selections.map(selection => ({
      courseIndex: 0,
      ...selection,
    })))).toEqual(fixedSolver.plans)
    expect(prepared.options).toHaveLength(10)
    expect(new Set(prepared.options.map(option => option.selections.length))).toEqual(new Set([2, 3]))
    expect(prepared.options.find(option => option.selections.some(selection => (
      selection.layer === 2 && selection.bundleId === 21
    )))?.sections.some(section => section.sectionId === 'M06-L01')).toBe(true)
  })

  it('makes a module course unavailable when disabled and banned modules cannot meet a group minimum', () => {
    const course = cartCourse('UCUG1000', 3, {
      0: [{ id: 1, sections: [{ id: 'M01-L01', sectionType: 'M01' }] }],
      1: [
        {
          id: 2,
          enabled: false,
          sections: [{ id: 'M02-L01', sectionType: 'M02' }],
        },
        {
          id: 3,
          sections: [{
            id: 'M03-L01',
            sectionType: 'M03',
            lectures: [lecture(1, 900, 1030)],
          }],
        },
      ],
    })
    course.selection_policy = {
      kind: 'module',
      modules: [],
      groups: [
        { id: 'required', role: 'required', min_select: 1, max_select: 1, module_codes: ['M01'] },
        {
          id: 'electives',
          role: 'elective',
          min_select: 1,
          max_select: 1,
          module_codes: ['M02', 'M03'],
        },
      ],
    }
    const banned = noBans()
    banned[0][0] = true

    const [prepared] = buildSchedulerOptimizerCourses([course], banned, ['UCUG1000'])
    expect(prepared.options).toEqual([])
    expect(solvePlans([course], banned)).toMatchObject({
      status: 'unavailable-selection-group',
      groupId: 'electives',
    })
  })

  it('uses exact date ranges while rejecting conflicts inside a module selection', () => {
    const september = [{ start_date: '2026-09-01', end_date: '2026-09-30' }]
    const october = [{ start_date: '2026-10-01', end_date: '2026-10-31' }]
    const touchesSeptember = [{ start_date: '2026-09-30', end_date: '2026-10-31' }]
    const course = cartCourse('UCUG1000', 3, {
      0: [{
        id: 1,
        sections: [{
          id: 'M01-L01',
          sectionType: 'M01',
          lectures: [lecture(1, 900, 1030, september)],
        }],
      }],
      1: [
        {
          id: 2,
          sections: [{
            id: 'M02-L01',
            sectionType: 'M02',
            lectures: [lecture(1, 900, 1030, october)],
          }],
        },
        {
          id: 3,
          sections: [{
            id: 'M02-L02',
            sectionType: 'M02',
            lectures: [lecture(1, 900, 1030, touchesSeptember)],
          }],
        },
        {
          id: 4,
          sections: [
            {
              id: 'M02-L03A',
              sectionType: 'M02',
              lectures: [lecture(2, 900, 1030)],
            },
            {
              id: 'M02-L03B',
              sectionType: 'M02',
              lectures: [lecture(2, 1000, 1130)],
            },
          ],
        },
      ],
    })
    course.selection_policy = {
      kind: 'module',
      modules: [],
      groups: [
        { id: 'required', role: 'required', min_select: 1, max_select: 1, module_codes: ['M01'] },
        { id: 'elective', role: 'elective', min_select: 1, max_select: 1, module_codes: ['M02'] },
      ],
    }

    const [prepared] = buildSchedulerOptimizerCourses([course], noBans(), ['UCUG1000'])
    expect(prepared.options.map(option => option.selections)).toEqual([[
      { layer: 0, bundleId: 1 },
      { layer: 1, bundleId: 2 },
    ]])
  })

  it('filters hard banned periods before building options and validates HHMM', () => {
    const course = cartCourse('AIAA1001', 3, {
      0: [
        { id: 1, lectures: [lecture(1, 900, 1030)] },
        { id: 2, lectures: [lecture(2, 1030, 1200)] },
      ],
    })
    const banned = noBans()
    banned[0][0] = true
    const [prepared] = buildSchedulerOptimizerCourses([course], banned, ['AIAA1001'])
    expect(prepared.options.map(option => option.selections[0].bundleId)).toEqual([2])
    expect(schedulerHhmmToMinutes(1030)).toBe(630)
    expect(schedulerHhmmToMinutes(2400)).toBe(1440)
    expect(() => schedulerHhmmToMinutes(1060)).toThrow(/Invalid scheduler time/)
  })
})

describe('scheduler ranked optimizer scoring and ranking', () => {
  it('scores term-load credit when it differs from the catalogue credit', () => {
    const course = cartCourse('UCUG1000', 3, {
      0: [{ id: 1, lectures: [] }],
    })
    course.counts_toward_term_load = false
    course.term_load_credit = 0.5
    const [prepared] = buildSchedulerOptimizerCourses([course], noBans(), ['UCUG1000'])
    const scored = scoreSchedulerOptimizerSelection(
      [{ course: prepared, option: prepared.options[0] }],
      emptyProfile({ creditDelta: '2.5' }),
    )

    expect(prepared.credits).toBe('0.5')
    expect(scored.totalCredits).toBe('0.5')
    expect(scored.score).toBe('1.25')
  })

  it('scores a course once across multiple layers and targets L0x by section id', async () => {
    const course = cartCourse('AIAA1001', 0.12345678, {
      0: [{ id: 1, sections: [{ id: 'L01', name: 'L01', lectures: [lecture(1, 900, 1030)] }] }],
      1: [{ id: 2, sections: [{ id: 'T01', name: 'T01', lectures: [lecture(2, 1200, 1330)] }] }],
    })
    const [prepared] = buildSchedulerOptimizerCourses([course], noBans(), ['AIAA1001'])
    const profile = emptyProfile({
      baseScore: '1.25',
      creditDelta: '0.87654321',
      countRules: [{ id: 'one-course', enabled: true, courseCount: 1, delta: '1' }],
      courseRules: [{ id: 'course', enabled: true, courseCode: 'AIAA1001', delta: '-0.5' }],
      sectionRules: [{ id: 'l01', enabled: true, courseCode: 'AIAA1001', sectionId: 'L01', delta: '2.5' }],
      earlyRules: [{ id: 'early', enabled: true, day: 1, startMinute: 540, delta: '-5' }],
      timeRules: [
        {
          id: 'duplicate-occupied-days',
          enabled: true,
          days: [2, 2],
          startMinute: 720,
          endMinute: 730,
          state: 'occupied',
          application: 'per-day',
          delta: '-0.25',
        },
        {
          id: 'free-any-day',
          enabled: true,
          days: [1, 3],
          startMinute: 730,
          endMinute: 740,
          state: 'free',
          application: 'any-day',
          delta: '3',
        },
      ],
    })
    const selection = [{ course: prepared, option: prepared.options[0] }]
    const scored = scoreSchedulerOptimizerSelection(selection, profile)
    expect(scored.totalCredits).toBe('0.12345678')
    expect(scored.breakdown.map(item => item.kind)).toEqual([
      'base',
      'per-credit',
      'course-count',
      'course-selection',
      'section-selection',
      'early-start',
      'time-window',
      'time-window',
    ])
    const occupied = scored.breakdown.find(item => item.ruleId === 'duplicate-occupied-days')
    expect(occupied).toMatchObject({ amount: '-0.5', matchedDays: [2, 2], quantity: 2 })
    expect(scored.breakdown.find(item => item.ruleId === 'free-any-day')).toMatchObject({
      amount: '3',
      matchedDays: [1, 3],
      quantity: 1,
    })
    expect(scored.breakdown.filter(item => item.kind === 'section-selection')).toHaveLength(1)
    expect((scored.breakdown[1].amount.split('.')[1]?.length ?? 0)).toBeGreaterThan(8)

    const solved = await solveRankedScheduler({
      courses: [prepared],
      minCourses: 1,
      maxCourses: 1,
      topX: 1,
      profile,
    })
    expect(solved.status).toBe('complete')
    expect(solved.plans[0]).toMatchObject({
      score: scored.score,
      totalCredits: '0.12345678',
      courseCount: 1,
      scoreRank: 1,
    })
    expect(solved.plans[0].selections).toHaveLength(2)
  })

  it('keeps every tie in the top distinct score buckets and uses dense ranks', async () => {
    const course = cartCourse('ONLY1001', 0, {
      0: [
        { id: 1, sections: [{ id: 'HIGH', lectures: [] }] },
        { id: 2, sections: [{ id: 'MID-A', lectures: [] }] },
        { id: 3, sections: [{ id: 'MID-B', lectures: [] }] },
        { id: 4, sections: [{ id: 'LOW', lectures: [] }] },
      ],
    })
    const [prepared] = buildSchedulerOptimizerCourses([course], noBans(), ['ONLY1001'])
    const profile = emptyProfile({
      sectionRules: [
        { id: 'high', enabled: true, courseCode: 'ONLY1001', sectionId: 'HIGH', delta: '2' },
        { id: 'mid-a', enabled: true, courseCode: 'ONLY1001', sectionId: 'MID-A', delta: '1' },
        { id: 'mid-b', enabled: true, courseCode: 'ONLY1001', sectionId: 'MID-B', delta: '1.0' },
      ],
    })
    const result = await solveRankedScheduler({
      courses: [prepared],
      minCourses: 1,
      maxCourses: 1,
      topX: 2,
      profile,
    })

    expect(result.status).toBe('complete')
    expect(result.feasibleCount).toBe('4')
    expect(result.distinctScoreCount).toBe(2)
    expect(result.cutoffScore).toBe('1')
    expect(result.plans.map(plan => plan.score)).toEqual(['2', '1', '1'])
    expect(result.plans.map(plan => plan.scoreRank)).toEqual([1, 2, 2])
  })
})

describe('scheduler ranked optimizer search', () => {
  it('uses teaching date ranges for cross-course conflicts', async () => {
    const first = [{ start_date: '2026-09-01', end_date: '2026-09-30' }]
    const later = [{ start_date: '2026-10-01', end_date: '2026-12-01' }]
    const touching = [{ start_date: '2026-09-30', end_date: '2026-12-01' }]
    const left = cartCourse('LEFT1001', 1, {
      0: [{ id: 1, lectures: [lecture(1, 900, 1030, first)] }],
    })
    const disjoint = cartCourse('RIGHT1001', 1, {
      0: [{ id: 1, lectures: [lecture(1, 900, 1030, later)] }],
    })
    const overlapping = cartCourse('TOUCH1001', 1, {
      0: [{ id: 1, lectures: [lecture(1, 900, 1030, touching)] }],
    })

    const allowedCourses = buildSchedulerOptimizerCourses(
      [left, disjoint],
      noBans(),
      ['LEFT1001', 'RIGHT1001'],
    )
    const allowed = await solveRankedScheduler({
      courses: allowedCourses,
      minCourses: 2,
      maxCourses: 2,
      topX: 1,
      profile: emptyProfile(),
    })
    expect(allowed.status).toBe('complete')
    expect(allowed.feasibleCount).toBe('1')

    const blockedCourses = buildSchedulerOptimizerCourses(
      [left, overlapping],
      noBans(),
      ['LEFT1001', 'TOUCH1001'],
    )
    const blocked = await solveRankedScheduler({
      courses: blockedCourses,
      minCourses: 2,
      maxCourses: 2,
      topX: 1,
      profile: emptyProfile(),
    })
    expect(blocked.status).toBe('no-solution')
    expect(blocked.feasibleCount).toBe('0')
  })

  it('matches a simple brute-force oracle on real layer and bundle shapes', async () => {
    const cart = [
      cartCourse('A1001', 1.5, {
        0: [
          { id: 1, sections: [{ id: 'A-L1', lectures: [lecture(1, 900, 1030)] }] },
          { id: 2, sections: [{ id: 'A-L2', lectures: [lecture(2, 900, 1030)] }] },
        ],
        1: [
          { id: 10, sections: [{ id: 'A-T1', lectures: [lecture(3, 1030, 1200)] }] },
          { id: 11, sections: [{ id: 'A-T2', lectures: [lecture(4, 1030, 1200)] }] },
        ],
      }),
      cartCourse('B1001', 2, {
        0: [
          { id: 1, sections: [{ id: 'B-L1', lectures: [lecture(1, 1000, 1130)] }] },
          { id: 2, sections: [{ id: 'B-L2', lectures: [lecture(5, 900, 1030)] }] },
        ],
      }),
      cartCourse('C1001', 3, {
        0: [{ id: 1, sections: [{ id: 'C-L1', lectures: [] }] }],
      }),
      cartCourse('D1001', 1, {
        0: [
          { id: 1, sections: [{ id: 'D-L1', lectures: [lecture(3, 1100, 1230)] }] },
          { id: 2, sections: [{ id: 'D-L2', lectures: [lecture(7, 900, 1030)] }] },
        ],
      }),
    ]
    const courses = buildSchedulerOptimizerCourses(
      cart,
      noBans(),
      cart.map(course => course.course_code),
    )
    const profile = emptyProfile({
      baseScore: '100',
      creditDelta: '0.5',
      countRules: [
        { id: 'two', enabled: true, courseCount: 2, delta: '1.25' },
        { id: 'three', enabled: true, courseCount: 3, delta: '-0.75' },
      ],
      courseRules: [
        { id: 'prefer-c', enabled: true, courseCode: 'C1001', delta: '2' },
      ],
      sectionRules: [
        { id: 'prefer-a-l2', enabled: true, courseCode: 'A1001', sectionId: 'A-L2', delta: '1' },
      ],
      earlyRules: [
        { id: 'monday-nine', enabled: true, day: 1, startMinute: 540, delta: '-0.5' },
      ],
      timeRules: [
        {
          id: 'friday-free',
          enabled: true,
          days: [5],
          startMinute: 540,
          endMinute: 630,
          state: 'free',
          application: 'all-days',
          delta: '0.25',
        },
      ],
    })
    const oracle = bruteForceTopDistinct(courses, 1, 3, 3, profile)
    const result = await solveRankedScheduler({
      courses,
      minCourses: 1,
      maxCourses: 3,
      topX: 3,
      profile,
    })

    expect(result.status).toBe('complete')
    expect(result.feasibleCount).toBe(String(oracle.feasible.length))
    expect(result.distinctScoreCount).toBe(oracle.distinctScores.length)
    expect(result.cutoffScore).toBe(oracle.distinctScores.at(-1))
    expect(result.plans.map(plan => ({
      signature: planSignature(plan),
      score: plan.score,
      rank: plan.scoreRank,
    }))).toEqual(oracle.retained)
  })

  it('matches the brute-force oracle across mixed exact scoring rules', async () => {
    const nextRandom = (state: { value: number }) => {
      state.value = (state.value * 1664525 + 1013904223) >>> 0
      return state.value
    }

    for (let seed = 1; seed <= 12; seed += 1) {
      const random = { value: seed }
      const cart = Array.from({ length: 5 }, (_, courseIndex) => {
        const code = `R${seed}-${courseIndex}`
        return cartCourse(code, (courseIndex + 1) / 4, {
          0: Array.from({ length: 2 }, (_, optionIndex) => {
            const day = 1 + nextRandom(random) % 5
            const slot = nextRandom(random) % 4
            const start = [900, 1030, 1200, 1330][slot]
            const end = [1030, 1200, 1330, 1500][slot]
            const useFirstHalf = nextRandom(random) % 3 === 0
            return {
              id: optionIndex + 1,
              sections: [{
                id: `${code}-S${optionIndex + 1}`,
                lectures: [lecture(day, start, end, useFirstHalf
                  ? [{ start_date: '2026-09-01', end_date: '2026-10-15' }]
                  : undefined)],
              }],
            }
          }),
        })
      })
      const courses = buildSchedulerOptimizerCourses(
        cart,
        noBans(),
        cart.map(course => course.course_code),
      )
      const profile = emptyProfile({
        baseScore: '-0.1',
        creditDelta: '0.125',
        countRules: [
          { id: 'two', enabled: true, courseCount: 2, delta: '1.25' },
          { id: 'four', enabled: true, courseCount: 4, delta: '-0.75' },
        ],
        courseRules: [
          { id: 'course', enabled: true, courseCode: courses[0].code, delta: '0.33' },
        ],
        sectionRules: [
          {
            id: 'section',
            enabled: true,
            courseCode: courses[1].code,
            sectionId: courses[1].options[1].sections[0].sectionId,
            delta: '-0.125',
          },
        ],
        earlyRules: [
          { id: 'monday-nine', enabled: true, day: 1, startMinute: 540, delta: '-1' },
          { id: 'tuesday-noon', enabled: true, day: 2, startMinute: 720, delta: '0.2' },
        ],
        timeRules: [
          {
            id: 'occupied-per-day',
            enabled: true,
            days: [1, 2, 2],
            startMinute: 540,
            endMinute: 630,
            state: 'occupied',
            application: 'per-day',
            delta: '-0.1',
          },
          {
            id: 'free-any-day',
            enabled: true,
            days: [3, 4],
            startMinute: 630,
            endMinute: 720,
            state: 'free',
            application: 'any-day',
            delta: '0.05',
          },
          {
            id: 'occupied-all-days',
            enabled: true,
            days: [1, 5],
            startMinute: 720,
            endMinute: 810,
            state: 'occupied',
            application: 'all-days',
            delta: '0.3',
          },
        ],
      })
      const oracle = bruteForceTopDistinct(courses, 1, 4, 3, profile)
      const result = await solveRankedScheduler({
        courses,
        minCourses: 1,
        maxCourses: 4,
        topX: 3,
        profile,
      })

      expect(result.status).toBe('complete')
      expect(result.feasibleCount).toBe(String(oracle.feasible.length))
      expect(result.processedWork).toBe(result.totalWork)
      expect(result.distinctScoreCount).toBe(oracle.distinctScores.length)
      expect(result.cutoffScore).toBe(oracle.distinctScores.at(-1))
      expect(result.plans.map(plan => ({
        signature: planSignature(plan),
        score: plan.score,
        rank: plan.scoreRank,
      }))).toEqual(oracle.retained)
    }
  })

  it('can be cancelled without silently reporting a complete truncated result', async () => {
    const courses: SchedulerOptimizerCourse[] = Array.from({ length: 9 }, (_, courseIndex) => ({
      sourceIndex: courseIndex,
      code: `C${courseIndex}`,
      title: `Course ${courseIndex}`,
      credits: '1',
      options: Array.from({ length: 3 }, (_, optionIndex) => ({
        id: `O${optionIndex}`,
        selections: [{ layer: 0, bundleId: optionIndex }],
        lectures: [],
        sections: [],
      })),
    }))
    const controller = new AbortController()
    const result = await solveRankedScheduler({
      courses,
      minCourses: 0,
      maxCourses: 9,
      topX: 1,
      profile: emptyProfile(),
      signal: controller.signal,
      onProgress: () => controller.abort(),
    })

    expect(result.status).toBe('cancelled')
    expect(result.plans).toEqual([])
    expect(result.retainedCount).toBe(0)
    expect(result.cutoffScore).toBeNull()
    expect(BigInt(result.processedWork)).toBeGreaterThan(0n)
    expect(BigInt(result.processedWork)).toBeLessThan(BigInt(result.totalWork))
    expect(result.feasibleCount).not.toBe('0')
  })

  it('short-circuits a request that was cancelled before solving', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await solveRankedScheduler({
      courses: buildSchedulerOptimizerCourses([
        cartCourse('ONLY', 1, {
          0: [{ id: 1, lectures: [lecture(1, 540, 600)] }],
        }),
      ], noBans(), ['ONLY']),
      minCourses: 1,
      maxCourses: 1,
      topX: 1,
      profile: emptyProfile(),
      signal: controller.signal,
    })

    expect(result).toMatchObject({
      status: 'cancelled',
      plans: [],
      processedWork: '0',
      visitedNodes: 0,
    })
  })
})
