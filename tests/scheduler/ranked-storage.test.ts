import { describe, expect, it } from 'vitest'
import {
  createDefaultSchedulerOptimizerConfig,
  createSchedulerOptimizerFingerprint,
  parseSchedulerOptimizerConfig,
  stableSchedulerOptimizerStringify,
} from '../../utils/schedulerOptimizerStorage'

describe('scheduler optimizer storage', () => {
  it('creates a stable fingerprint independent of object key order', () => {
    const left = createSchedulerOptimizerFingerprint({ z: [2, 1], a: { y: true, x: 'v' } })
    const right = createSchedulerOptimizerFingerprint({ a: { x: 'v', y: true }, z: [2, 1] })

    expect(left).toEqual(right)
    expect(left.key).toMatch(/^ranked-v1-[0-9a-f]{16}$/)
    expect(stableSchedulerOptimizerStringify({ b: undefined, a: 1 })).toBe('{"a":1}')
  })

  it('keeps the canonical input so hash hits can be verified exactly', () => {
    const first = createSchedulerOptimizerFingerprint({ courses: ['COMP1001'], topX: 3 })
    const changed = createSchedulerOptimizerFingerprint({ courses: ['COMP1001'], topX: 4 })

    expect(first.canonicalInput).not.toBe(changed.canonicalInput)
    expect(first.canonicalInput).toContain('"topX":3')
  })

  it('parses known fields defensively and deduplicates candidate codes', () => {
    const fallback = createDefaultSchedulerOptimizerConfig(['COMP1001'])
    const parsed = parseSchedulerOptimizerConfig({
      schemaVersion: 1,
      mode: 'ranked',
      candidateCodes: ['COMP1002', 'COMP1002', '', 42],
      minCourses: 2,
      maxCourses: 5,
      topX: 4,
      profile: fallback.profile,
      rankedPlanKey: 'plan:v1:test',
      unknown: 'ignored',
    }, fallback)

    expect(parsed).toMatchObject({
      mode: 'ranked',
      candidateCodes: ['COMP1002'],
      minCourses: 2,
      maxCourses: 5,
      topX: 4,
      rankedPlanKey: 'plan:v1:test',
    })
  })

  it('falls back safely for an old schema or broken score profile', () => {
    const fallback = createDefaultSchedulerOptimizerConfig(['MATH1001'])
    expect(parseSchedulerOptimizerConfig({ schemaVersion: 0 }, fallback)).toEqual(fallback)

    const parsed = parseSchedulerOptimizerConfig({
      schemaVersion: 1,
      mode: 'ranked',
      candidateCodes: ['MATH1001'],
      minCourses: -1,
      maxCourses: 'nine',
      topX: 0,
      profile: { schemaVersion: 1, baseScore: 'not-a-number' },
    }, fallback)

    expect(parsed.minCourses).toBe(fallback.minCourses)
    expect(parsed.maxCourses).toBe(fallback.maxCourses)
    expect(parsed.topX).toBe(fallback.topX)
    expect(parsed.profile).toEqual(fallback.profile)
  })
})
