import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSchedulerCart } from '../../composables/useSchedulerCart'
import type { CartCourse } from '../../utils/scheduler'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scheduler cart refresh ordering', () => {
  it('ignores a stale refresh failure after a newer refresh succeeds', async () => {
    const first = deferred<CartCourse[]>()
    const second = deferred<CartCourse[]>()
    const getCart = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    vi.stubGlobal('useScheduler', () => ({ getCart }))

    const cart = useSchedulerCart('2610', ref(true), ref<CartCourse[]>([]))
    const olderRefresh = cart.refresh()
    const newerRefresh = cart.refresh()
    const latestCourses = [{ course_code: 'AIAA1001' } as CartCourse]

    second.resolve(latestCourses)
    await newerRefresh
    first.reject(new Error('stale request failed'))

    await expect(olderRefresh).resolves.toBeUndefined()
    expect(cart.courses.value).toEqual(latestCourses)
  })

  it('still rejects a failure from the current refresh', async () => {
    const current = deferred<CartCourse[]>()
    vi.stubGlobal('useScheduler', () => ({ getCart: () => current.promise }))

    const cart = useSchedulerCart('2610', ref(true), ref<CartCourse[]>([]))
    const refresh = cart.refresh()
    current.reject(new Error('current request failed'))

    await expect(refresh).rejects.toThrow('current request failed')
  })
})
