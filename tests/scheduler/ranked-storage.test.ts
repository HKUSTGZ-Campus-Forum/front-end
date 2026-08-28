import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canonicalSchedulerOptimizerCandidates,
  createDefaultSchedulerOptimizerConfig,
  createSchedulerOptimizerFingerprint,
  loadSchedulerOptimizerConfig,
  parseSchedulerOptimizerConfig,
  saveSchedulerOptimizerConfig,
  schedulerOptimizerFingerprintsEqual,
  stableSchedulerOptimizerStringify,
} from '../../utils/schedulerOptimizerStorage'
import type { SchedulerOptimizerCourse } from '../../utils/schedulerOptimizer'

describe('scheduler optimizer storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

  it('normalizes display-only cart ordering while retaining solver-relevant changes', () => {
    const candidates: SchedulerOptimizerCourse[] = [
      {
        sourceIndex: 0,
        code: 'COMP1001',
        title: 'Programming',
        credits: '3',
        options: [{
          id: '[[1,1]]',
          selections: [{ layer: 1, bundleId: 1 }],
          lectures: [{
            day: 1,
            start_time: 900,
            end_time: 1020,
            room: 'Room A',
            instructor: 'Teacher A',
            date_ranges: [
              { start_date: '2026-09-01', end_date: '2026-10-31', facility_id: 'A' },
              { start_date: '2026-11-01', end_date: '2026-12-20', facility_id: 'B' },
            ],
          }],
          sections: [{
            sectionId: 'COMP1001-L01',
            name: 'L01',
            sectionType: 'L',
            isMain: true,
            layer: 1,
            bundleId: 1,
          }],
        }],
      },
      {
        sourceIndex: 1,
        code: 'MATH1001',
        title: 'Calculus',
        credits: '4',
        options: [{
          id: '[[1,2]]',
          selections: [{ layer: 1, bundleId: 2 }],
          lectures: [{
            day: 2,
            start_time: 1030,
            end_time: 1150,
            room: 'Room B',
            instructor: 'Teacher B',
          }],
          sections: [{
            sectionId: 'MATH1001-L02',
            name: 'L02',
            sectionType: 'L',
            isMain: true,
            layer: 1,
            bundleId: 2,
          }],
        }],
      },
    ]
    const reordered = structuredClone(candidates).reverse()
    reordered[0].sourceIndex = 7
    reordered[1].sourceIndex = 3
    reordered[0].options[0].lectures[0].room = 'Updated room'
    reordered[0].options[0].lectures[0].instructor = 'Updated teacher'
    const reorderedRanges = reordered[1].options[0].lectures[0].date_ranges
    if (reorderedRanges) {
      reorderedRanges.reverse()
      reorderedRanges[0].facility_id = 'Updated facility'
    }

    const initial = createSchedulerOptimizerFingerprint({
      candidates: canonicalSchedulerOptimizerCandidates(candidates),
    })
    const displayOnlyChange = createSchedulerOptimizerFingerprint({
      candidates: canonicalSchedulerOptimizerCandidates(reordered),
    })
    expect(displayOnlyChange).toEqual(initial)
    expect(schedulerOptimizerFingerprintsEqual(initial, displayOnlyChange)).toBe(true)

    reordered[0].options[0].lectures[0].start_time = 1100
    const solverChange = createSchedulerOptimizerFingerprint({
      candidates: canonicalSchedulerOptimizerCandidates(reordered),
    })
    expect(schedulerOptimizerFingerprintsEqual(initial, solverChange)).toBe(false)

    const creditChange = structuredClone(candidates)
    creditChange[0].credits = '4'
    expect(schedulerOptimizerFingerprintsEqual(initial, createSchedulerOptimizerFingerprint({
      candidates: canonicalSchedulerOptimizerCandidates(creditChange),
    }))).toBe(false)

    const sectionChange = structuredClone(candidates)
    sectionChange[0].options[0].sections[0].sectionId = 'COMP1001-L02'
    expect(schedulerOptimizerFingerprintsEqual(initial, createSchedulerOptimizerFingerprint({
      candidates: canonicalSchedulerOptimizerCandidates(sectionChange),
    }))).toBe(false)

    const dateRangeChange = structuredClone(candidates)
    dateRangeChange[0].options[0].lectures[0].date_ranges![0].start_date = '2026-09-02'
    expect(schedulerOptimizerFingerprintsEqual(initial, createSchedulerOptimizerFingerprint({
      candidates: canonicalSchedulerOptimizerCandidates(dateRangeChange),
    }))).toBe(false)
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

  it('migrates legacy per-day early rules and collapses equivalent weekdays', () => {
    const fallback = createDefaultSchedulerOptimizerConfig(['COMP1001'])
    const legacyProfile = structuredClone(fallback.profile) as unknown as Record<string, unknown>
    legacyProfile.baseScore = '123.5'
    legacyProfile.earlyRules = [
      ...[1, 2, 3, 4, 5].map(day => ({
        id: `early-${day}`,
        enabled: true,
        day,
        startMinute: 540,
        delta: '-5',
      })),
      {
        id: 'duplicate-monday',
        enabled: true,
        day: 1,
        startMinute: 540,
        delta: '-5',
      },
      {
        id: 'custom-tuesday',
        enabled: true,
        day: 2,
        startMinute: 625,
        delta: '-2.5',
      },
    ]

    const parsed = parseSchedulerOptimizerConfig({
      schemaVersion: 1,
      mode: 'ranked',
      candidateCodes: ['COMP1001'],
      minCourses: 1,
      maxCourses: 1,
      topX: 3,
      profile: legacyProfile,
    }, fallback)

    expect(parsed.profile.baseScore).toBe('123.5')
    expect(parsed.profile.earlyRules).toEqual([
      {
        id: 'early-1',
        enabled: true,
        days: [1, 2, 3, 4, 5],
        startMinute: 540,
        delta: '-5',
      },
      {
        id: 'duplicate-monday',
        enabled: true,
        days: [1],
        startMinute: 540,
        delta: '-5',
      },
      {
        id: 'custom-tuesday',
        enabled: true,
        days: [2],
        startMinute: 625,
        delta: '-2.5',
      },
    ])
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

  it('keeps the last valid profile while persisting other preferences from an invalid draft', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    const fallback = createDefaultSchedulerOptimizerConfig(['COMP1001'])
    const valid = structuredClone(fallback)
    valid.profile.baseScore = '125.5'
    saveSchedulerOptimizerConfig('2610', valid)

    const editing = structuredClone(valid)
    editing.mode = 'ranked'
    editing.candidateCodes = ['COMP1001', 'MATH1001']
    editing.minCourses = 1
    editing.maxCourses = 2
    editing.topX = 7
    editing.rankedPlanKey = 'scheduler-ranked:v1:remembered'
    editing.profile.baseScore = '-'
    saveSchedulerOptimizerConfig('2610', editing)

    const preserved = loadSchedulerOptimizerConfig('2610', fallback)
    expect(preserved).toMatchObject({
      mode: 'ranked',
      candidateCodes: ['COMP1001', 'MATH1001'],
      minCourses: 1,
      maxCourses: 2,
      topX: 7,
      rankedPlanKey: 'scheduler-ranked:v1:remembered',
    })
    expect(preserved.profile.baseScore).toBe('125.5')

    editing.profile.baseScore = '-2.75'
    saveSchedulerOptimizerConfig('2610', editing)
    expect(loadSchedulerOptimizerConfig('2610', fallback).profile.baseScore).toBe('-2.75')
  })

  it('remembers multi-day early cutoffs and changes the result fingerprint when they change', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    const config = createDefaultSchedulerOptimizerConfig(['COMP1001'])
    config.profile.earlyRules = [{
      id: 'custom-early',
      enabled: true,
      days: [1, 3, 5],
      startMinute: 625,
      delta: '-2.75',
    }]

    saveSchedulerOptimizerConfig('2610', config)
    const loaded = loadSchedulerOptimizerConfig('2610', createDefaultSchedulerOptimizerConfig())
    expect(loaded.profile.earlyRules).toEqual(config.profile.earlyRules)

    const initial = createSchedulerOptimizerFingerprint({ profile: loaded.profile })
    const changedProfile = structuredClone(loaded.profile)
    changedProfile.earlyRules[0].days = [1, 2, 3, 5]
    const changed = createSchedulerOptimizerFingerprint({ profile: changedProfile })
    expect(schedulerOptimizerFingerprintsEqual(initial, changed)).toBe(false)
  })
})
