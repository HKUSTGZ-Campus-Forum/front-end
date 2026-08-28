import { describe, expect, it } from 'vitest'
import {
  moveSchedulerCourseRangeHandle,
  nearestSchedulerCourseRangeHandle,
  normalizeSchedulerCourseRange,
  schedulerCourseRangePercent,
  schedulerCourseRangeValueAtPosition,
} from '../../utils/schedulerCourseRange'

describe('scheduler course-count range', () => {
  it('normalizes stored endpoints against the current candidate count', () => {
    expect(normalizeSchedulerCourseRange(4, 10, 20)).toEqual({ minimum: 4, maximum: 10 })
    expect(normalizeSchedulerCourseRange(3, 9, 5)).toEqual({ minimum: 3, maximum: 5 })
    expect(normalizeSchedulerCourseRange(9, 3, 20)).toEqual({ minimum: 3, maximum: 3 })
    expect(normalizeSchedulerCourseRange(3, 9, 0)).toEqual({ minimum: 1, maximum: 1 })
    expect(normalizeSchedulerCourseRange(3, 9, Number.NaN)).toEqual({ minimum: 1, maximum: 1 })
  })

  it('allows equal endpoints but never lets one handle cross the other', () => {
    expect(moveSchedulerCourseRangeHandle(
      'minimum',
      10,
      { minimum: 4, maximum: 10 },
      20,
    )).toEqual({ minimum: 10, maximum: 10 })
    expect(moveSchedulerCourseRangeHandle(
      'minimum',
      11,
      { minimum: 4, maximum: 10 },
      20,
    )).toEqual({ minimum: 10, maximum: 10 })
    expect(moveSchedulerCourseRangeHandle(
      'maximum',
      3,
      { minimum: 4, maximum: 10 },
      20,
    )).toEqual({ minimum: 4, maximum: 4 })
  })

  it('chooses the nearest endpoint and can reopen an overlapped range both ways', () => {
    expect(nearestSchedulerCourseRangeHandle(
      5,
      { minimum: 4, maximum: 10 },
      'maximum',
    )).toBe('minimum')
    expect(nearestSchedulerCourseRangeHandle(
      9,
      { minimum: 4, maximum: 10 },
      'minimum',
    )).toBe('maximum')
    expect(nearestSchedulerCourseRangeHandle(
      7,
      { minimum: 7, maximum: 7 },
      'maximum',
      -1,
    )).toBe('minimum')
    expect(nearestSchedulerCourseRangeHandle(
      7,
      { minimum: 7, maximum: 7 },
      'minimum',
      1,
    )).toBe('maximum')
  })

  it('maps pointer positions and handle positions to exact integer values', () => {
    expect(schedulerCourseRangeValueAtPosition(100, 100, 190, 20)).toBe(1)
    expect(schedulerCourseRangeValueAtPosition(195, 100, 190, 20)).toBe(11)
    expect(schedulerCourseRangeValueAtPosition(290, 100, 190, 20)).toBe(20)
    expect(schedulerCourseRangeValueAtPosition(500, 100, 190, 20)).toBe(20)
    expect(schedulerCourseRangeValueAtPosition(100, 100, 0, 20)).toBe(1)

    expect(schedulerCourseRangePercent(1, 20)).toBe(0)
    expect(schedulerCourseRangePercent(10, 20)).toBeCloseTo(47.368421)
    expect(schedulerCourseRangePercent(20, 20)).toBe(100)
    expect(schedulerCourseRangePercent(1, 1)).toBe(0)
  })
})
