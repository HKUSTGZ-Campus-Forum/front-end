import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CartCourse } from '../../utils/scheduler'
import type { SchedulerOptimizerSolveResult } from '../../utils/schedulerOptimizer'

vi.mock('../../utils/schedulerOptimizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/schedulerOptimizer')>()
  return { ...actual, solveRankedScheduler: vi.fn() }
})

vi.mock('../../utils/schedulerOptimizerStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/schedulerOptimizerStorage')>()
  return {
    ...actual,
    readSchedulerOptimizerCachedResult: vi.fn(),
    writeSchedulerOptimizerCachedResult: vi.fn(),
  }
})

import { useSchedulerOptimizer } from '../../composables/useSchedulerOptimizer'
import { solveRankedScheduler } from '../../utils/schedulerOptimizer'
import {
  readSchedulerOptimizerCachedResult,
  writeSchedulerOptimizerCachedResult,
} from '../../utils/schedulerOptimizerStorage'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function completed(marker: string): SchedulerOptimizerSolveResult {
  return {
    status: 'complete',
    plans: [],
    requestedTopX: 1,
    cutoffScore: null,
    distinctScoreCount: 0,
    retainedCount: 0,
    feasibleCount: marker,
    processedWork: marker,
    totalWork: marker,
    visitedNodes: Number(marker),
  }
}

function course(code = 'TEST1001'): CartCourse {
  return {
    course_code: code,
    course_title: 'Optimizer Test Course',
    credit: 3,
    subject: 'TEST',
    pg_course: false,
    klms_course: false,
    enabled: true,
    layers: {
      1: [{
        id: 1,
        layer: 1,
        enabled: true,
        sections: [{
          semester_id: '2610',
          section_id: `${code}-L01`,
          name: 'L01',
          bundle: 1,
          layer: 1,
          quota: 30,
          section_type: 'L',
          is_main: true,
          lectures: [{
            day: 1,
            start_time: 900,
            end_time: 1020,
            room: 'Room 1',
            instructor: 'Teacher 1',
          }],
        }],
      }],
    },
  }
}

function setupOptimizer(courses: CartCourse[] = [course()]): {
  optimizer: ReturnType<typeof useSchedulerOptimizer>
  scope: EffectScope
} {
  const scope = effectScope()
  const optimizer = scope.run(() => useSchedulerOptimizer({
    semesterId: '2610',
    courseList: ref(courses),
    bannedPeriods: ref(Array.from({ length: 7 }, () => Array(8).fill(false))),
  }))!
  optimizer.candidateCodes.value = courses.map(entry => entry.course_code)
  optimizer.minCourses.value = 1
  optimizer.maxCourses.value = 1
  optimizer.topX.value = 1
  return { optimizer, scope }
}

const solveMock = vi.mocked(solveRankedScheduler)
const readCacheMock = vi.mocked(readSchedulerOptimizerCachedResult)
const writeCacheMock = vi.mocked(writeSchedulerOptimizerCachedResult)

describe('ranked scheduler optimizer async state', () => {
  beforeEach(() => {
    solveMock.mockReset()
    readCacheMock.mockReset()
    writeCacheMock.mockReset()
    readCacheMock.mockResolvedValue(null)
    writeCacheMock.mockResolvedValue(true)
  })

  it('drops a solved old snapshot and automatically reruns with the latest profile', async () => {
    const first = deferred<SchedulerOptimizerSolveResult>()
    const second = deferred<SchedulerOptimizerSolveResult>()
    solveMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { optimizer, scope } = setupOptimizer()
    await nextTick()

    const initialRun = optimizer.run(true)
    await vi.waitFor(() => expect(solveMock).toHaveBeenCalledTimes(1))
    optimizer.profile.value = { ...optimizer.profile.value, baseScore: '101' }
    await nextTick()
    first.resolve(completed('1'))
    await initialRun

    await vi.waitFor(() => expect(solveMock).toHaveBeenCalledTimes(2))
    expect(solveMock.mock.calls[1][0].profile.baseScore).toBe('101')
    expect(optimizer.runState.value).toBe('running')
    expect(optimizer.stale.value).toBe(false)

    second.resolve(completed('2'))
    await vi.waitFor(() => expect(optimizer.runState.value).toBe('complete'))
    expect(optimizer.result.value?.processedWork).toBe('2')
    expect(optimizer.stale.value).toBe(false)
    expect(writeCacheMock).toHaveBeenCalledTimes(1)
    scope.stop()
  })

  it('rechecks inputs after an asynchronous cache read before accepting the record', async () => {
    const firstRead = deferred<SchedulerOptimizerSolveResult | null>()
    const secondRead = deferred<SchedulerOptimizerSolveResult | null>()
    readCacheMock
      .mockImplementationOnce(() => firstRead.promise)
      .mockImplementationOnce(() => secondRead.promise)
    const { optimizer, scope } = setupOptimizer()
    await nextTick()

    const initialRun = optimizer.run()
    await vi.waitFor(() => expect(readCacheMock).toHaveBeenCalledTimes(1))
    optimizer.topX.value = 2
    await nextTick()
    firstRead.resolve(completed('1'))
    await initialRun

    await vi.waitFor(() => expect(readCacheMock).toHaveBeenCalledTimes(2))
    secondRead.resolve(completed('2'))
    await vi.waitFor(() => expect(optimizer.runState.value).toBe('complete'))
    expect(optimizer.result.value?.processedWork).toBe('2')
    expect(optimizer.cacheHit.value).toBe(true)
    expect(optimizer.stale.value).toBe(false)
    expect(solveMock).not.toHaveBeenCalled()
    scope.stop()
  })

  it('hides an old stale result while its replacement is running', async () => {
    solveMock.mockResolvedValueOnce(completed('1'))
    const replacement = deferred<SchedulerOptimizerSolveResult>()
    solveMock.mockImplementationOnce(() => replacement.promise)
    const { optimizer, scope } = setupOptimizer()
    await nextTick()

    await optimizer.run(true)
    optimizer.profile.value = { ...optimizer.profile.value, baseScore: '102' }
    await nextTick()
    expect(optimizer.stale.value).toBe(true)

    const replacementRun = optimizer.run(true)
    await vi.waitFor(() => expect(optimizer.runState.value).toBe('running'))
    expect(optimizer.stale.value).toBe(false)
    replacement.resolve(completed('2'))
    await replacementRun
    expect(optimizer.runState.value).toBe('complete')
    expect(optimizer.stale.value).toBe(false)
    scope.stop()
  })

  it('caps the solve maximum when an unavailable candidate leaves the minimum reachable', async () => {
    const unavailable = course('TEST1002')
    unavailable.layers[1][0]!.enabled = false
    solveMock.mockResolvedValueOnce(completed('1'))
    const { optimizer, scope } = setupOptimizer([course(), unavailable])
    optimizer.minCourses.value = 1
    optimizer.maxCourses.value = 2
    await nextTick()

    await optimizer.run(true)

    expect(solveMock).toHaveBeenCalledTimes(1)
    expect(solveMock.mock.calls[0][0].courses).toHaveLength(1)
    expect(solveMock.mock.calls[0][0].maxCourses).toBe(1)
    expect(optimizer.maxCourses.value).toBe(2)
    expect(optimizer.unavailableCourseCodes.value).toEqual(['TEST1002'])
    expect(optimizer.runState.value).toBe('complete')
    scope.stop()
  })

  it('keeps the stored course range within the live candidate count', async () => {
    const courses = Array.from({ length: 6 }, (_, index) => course(`TEST${index + 1}`))
    const { optimizer, scope } = setupOptimizer(courses)
    optimizer.minCourses.value = 4
    optimizer.maxCourses.value = 6

    optimizer.candidateCodes.value = courses.slice(0, 3).map(entry => entry.course_code)

    expect(optimizer.minCourses.value).toBe(3)
    expect(optimizer.maxCourses.value).toBe(3)
    scope.stop()
  })
})
