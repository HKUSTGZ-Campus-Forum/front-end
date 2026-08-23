import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import {
  getSchedulerCoursePopularity,
  indexSchedulerPopularity,
  type SchedulerPopularityResponse,
} from '../../utils/scheduler'
import {
  useSchedulerPopularity,
  type SchedulerVisibilitySource,
} from '../../composables/useSchedulerPopularity'

class FakeVisibility implements SchedulerVisibilitySource {
  hidden = false
  private listeners = new Set<() => void>()

  addEventListener(_type: 'visibilitychange', listener: () => void) {
    this.listeners.add(listener)
  }

  removeEventListener(_type: 'visibilitychange', listener: () => void) {
    this.listeners.delete(listener)
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden
    for (const listener of this.listeners) listener()
  }
}

function popularityResponse(
  courseCode = 'AIAA1001',
  cart = 2,
  savedPlans = 3,
): SchedulerPopularityResponse {
  return {
    semester_id: '2540',
    generated_at: '2026-08-07T12:00:00Z',
    courses: [{
      course_code: courseCode,
      cart_count: cart,
      saved_plan_count: savedPlans,
    }],
  }
}

async function flushRequests() {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
}

const scopes: EffectScope[] = []

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('scheduler popularity', () => {
  it('indexes the two distinct user counts by normalized course code', () => {
    const indexed = indexSchedulerPopularity({
      semester_id: '2540',
      generated_at: '2026-08-07T12:00:00Z',
      courses: [
        popularityResponse('AIAA1001', 1, 2).courses[0],
        popularityResponse('DSAA1001', 8, 13).courses[0],
      ],
    })

    expect(getSchedulerCoursePopularity(indexed, 'AIAA 1001')).toMatchObject({
      cart_count: 1,
      saved_plan_count: 2,
    })
    expect(getSchedulerCoursePopularity(indexed, 'dsaa1001')).toMatchObject({
      cart_count: 8,
      saved_plan_count: 13,
    })
  })

  it('does not fetch for guests or an empty cart', async () => {
    const visibility = new FakeVisibility()
    const isLoggedIn = ref(false)
    const courseCodes = ref<string[]>(['AIAA1001'])
    const getPopularity = vi.fn(async () => popularityResponse())
    const scope = effectScope()
    scopes.push(scope)

    scope.run(() => useSchedulerPopularity({
      semesterId: '2540',
      isLoggedIn,
      courseCodes,
      getPopularity,
      visibilitySource: visibility,
    }))
    await flushRequests()
    expect(getPopularity).not.toHaveBeenCalled()

    courseCodes.value = []
    isLoggedIn.value = true
    await flushRequests()
    expect(getPopularity).not.toHaveBeenCalled()
  })

  it('polls every 15 seconds only while visible and refreshes on return', async () => {
    vi.useFakeTimers()
    const visibility = new FakeVisibility()
    const getPopularity = vi.fn(async () => popularityResponse())
    const scope = effectScope()
    scopes.push(scope)

    scope.run(() => useSchedulerPopularity({
      semesterId: '2540',
      isLoggedIn: ref(true),
      courseCodes: ref(['AIAA1001']),
      getPopularity,
      visibilitySource: visibility,
    }))
    await flushRequests()
    expect(getPopularity).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(15_000)
    expect(getPopularity).toHaveBeenCalledTimes(2)

    visibility.setHidden(true)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(getPopularity).toHaveBeenCalledTimes(2)

    visibility.setHidden(false)
    await flushRequests()
    expect(getPopularity).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(15_000)
    expect(getPopularity).toHaveBeenCalledTimes(4)
  })

  it('clears on logout and ignores a stale authenticated response', async () => {
    let resolveRequest!: (value: SchedulerPopularityResponse) => void
    const pendingRequest = new Promise<SchedulerPopularityResponse>((resolve) => {
      resolveRequest = resolve
    })
    const isLoggedIn = ref(true)
    const scope = effectScope()
    scopes.push(scope)

    const state = scope.run(() => useSchedulerPopularity({
      semesterId: '2540',
      isLoggedIn,
      courseCodes: ref(['AIAA1001']),
      getPopularity: vi.fn(() => pendingRequest),
      visibilitySource: new FakeVisibility(),
    }))!

    isLoggedIn.value = false
    await flushRequests()
    expect(state.canShowPopularity.value).toBe(false)
    expect(state.popularityByCourse.value).toEqual({})

    resolveRequest(popularityResponse())
    await pendingRequest
    await flushRequests()
    expect(state.canShowPopularity.value).toBe(false)
    expect(state.popularityByCourse.value).toEqual({})
  })

  it('treats 403 as forbidden, exposes no counts, and stops polling', async () => {
    vi.useFakeTimers()
    const getPopularity = vi.fn(async () => null)
    const scope = effectScope()
    scopes.push(scope)

    const state = scope.run(() => useSchedulerPopularity({
      semesterId: '2540',
      isLoggedIn: ref(true),
      courseCodes: ref(['AIAA1001']),
      getPopularity,
      visibilitySource: new FakeVisibility(),
    }))!
    await flushRequests()

    expect(state.forbidden.value).toBe(true)
    expect(state.canShowPopularity.value).toBe(false)
    expect(state.popularityByCourse.value).toEqual({})
    await vi.advanceTimersByTimeAsync(45_000)
    expect(getPopularity).toHaveBeenCalledTimes(1)
  })

  it('sorts code changes, refreshes explicitly, and queues without overlapping', async () => {
    const visibility = new FakeVisibility()
    const courseCodes = ref<string[]>(['DSAA1001'])
    const pendingResolvers: Array<(value: SchedulerPopularityResponse) => void> = []
    let activeRequests = 0
    let maximumActiveRequests = 0
    const getPopularity = vi.fn((_semester: string, codes: readonly string[]) => {
      activeRequests += 1
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests)
      return new Promise<SchedulerPopularityResponse>((resolve) => {
        pendingResolvers.push((value) => {
          activeRequests -= 1
          resolve(value)
        })
      })
    })
    const scope = effectScope()
    scopes.push(scope)

    const state = scope.run(() => useSchedulerPopularity({
      semesterId: '2540',
      isLoggedIn: ref(true),
      courseCodes,
      getPopularity,
      visibilitySource: visibility,
    }))!
    expect(getPopularity).toHaveBeenCalledTimes(1)

    courseCodes.value = ['DSAA1001', 'AIAA1001']
    await nextTick()
    const explicitRefresh = state.refresh()
    expect(getPopularity).toHaveBeenCalledTimes(1)

    pendingResolvers.shift()!(popularityResponse('DSAA1001'))
    await flushRequests()
    expect(getPopularity).toHaveBeenCalledTimes(2)
    expect(getPopularity).toHaveBeenLastCalledWith('2540', ['AIAA1001', 'DSAA1001'])
    expect(maximumActiveRequests).toBe(1)

    pendingResolvers.shift()!(popularityResponse('AIAA1001'))
    await explicitRefresh
    expect(maximumActiveRequests).toBe(1)
  })
})
