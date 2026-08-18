import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSchedulerCart } from '../../composables/useSchedulerCart'
import type { CartCourse } from '../../utils/scheduler'
import { getSchedulerCartMutationFailureKind } from '../../utils/schedulerAsync'

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
    await expect(newerRefresh).resolves.toBe(true)
    first.reject(new Error('stale request failed'))

    await expect(olderRefresh).resolves.toBe(false)
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

  it('applies the toggle optimistically before the write resolves', async () => {
    const serverCourses = [{ course_code: 'AIAA1001', enabled: false } as CartCourse]
    const write = deferred<void>()
    const toggleCourse = vi.fn(async () => {
      await write.promise
      serverCourses[0] = { ...serverCourses[0], enabled: true }
    })
    const getCart = vi.fn(async () => serverCourses.map(course => ({ ...course })))
    vi.stubGlobal('useScheduler', () => ({ getCart, toggleCourse }))

    const initial = [{ course_code: 'AIAA1001', enabled: false } as CartCourse]
    const cart = useSchedulerCart('2610', ref(true), ref(initial))

    const outcome = cart.toggleCourse('AIAA1001', true)

    // Optimistic: the local card flips before the server round-trip finishes.
    expect(cart.courses.value[0]?.enabled).toBe(true)
    expect(getCart).not.toHaveBeenCalled()

    write.resolve()
    await expect(outcome).resolves.toBeUndefined()
    expect(cart.courses.value[0]?.enabled).toBe(true)
  })

  it('reconciles authoritative state after a committed write loses its response', async () => {
    const serverCourses = [{ course_code: 'AIAA1001', enabled: false } as CartCourse]
    const toggleCourse = vi.fn(async () => {
      serverCourses[0] = { ...serverCourses[0], enabled: true }
      throw new Error('response dropped after commit')
    })
    const getCart = vi.fn(async () => serverCourses.map(course => ({ ...course })))
    vi.stubGlobal('useScheduler', () => ({ getCart, toggleCourse }))

    const initial = [{ course_code: 'AIAA1001', enabled: false } as CartCourse]
    const cart = useSchedulerCart('2610', ref(true), ref(initial))

    const outcome = cart.toggleCourse('AIAA1001', true)
    await expect(outcome).rejects.toSatisfy(error => (
      getSchedulerCartMutationFailureKind(error) === 'write-ambiguous-reconciled'
    ))
    expect(getCart).toHaveBeenCalledOnce()
    expect(cart.courses.value[0]?.enabled).toBe(true)
    expect(cart.requiresReload.value).toBe(false)
  })

  it('retries authoritative reconciliation after a successful write and transient GET failure', async () => {
    const authoritative = [{ course_code: 'AIAA1001', enabled: true } as CartCourse]
    const getCart = vi.fn()
      .mockRejectedValueOnce(new Error('temporary GET failure'))
      .mockResolvedValueOnce(authoritative)
    const toggleCourse = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('useScheduler', () => ({ getCart, toggleCourse }))

    const initial = [{ course_code: 'AIAA1001', enabled: false } as CartCourse]
    const cart = useSchedulerCart('2610', ref(true), ref(initial))

    await expect(cart.toggleCourse('AIAA1001', true)).resolves.toBeUndefined()
    expect(getCart).toHaveBeenCalledTimes(2)
    expect(cart.courses.value).toEqual(authoritative)
  })

  it('keeps the optimistic value and reports failure when reconciliation remains unavailable', async () => {
    const getCart = vi.fn().mockRejectedValue(new Error('GET unavailable'))
    const toggleCourse = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('useScheduler', () => ({ getCart, toggleCourse }))

    const initial = [{ course_code: 'AIAA1001', enabled: false } as CartCourse]
    const cart = useSchedulerCart('2610', ref(true), ref(initial))

    const outcome = cart.toggleCourse('AIAA1001', true)
    await expect(outcome).rejects.toSatisfy(error => (
      getSchedulerCartMutationFailureKind(error) === 'state-unverified'
    ))
    expect(getCart).toHaveBeenCalledTimes(2)
    // The optimistic flip stays visible; requiresReload freezes further
    // mutations until the user reloads the authoritative cart.
    expect(cart.courses.value[0]?.enabled).toBe(true)
    expect(cart.requiresReload.value).toBe(true)

    await expect(cart.toggleCourse('AIAA1001', false)).rejects.toSatisfy(error => (
      getSchedulerCartMutationFailureKind(error) === 'blocked'
    ))
    expect(toggleCourse).toHaveBeenCalledOnce()
    expect(cart.courses.value[0]?.enabled).toBe(true)

    getCart.mockResolvedValueOnce([{ ...initial[0], enabled: true }])
    await expect(cart.reloadAuthoritative()).resolves.toBeUndefined()
    expect(cart.requiresReload.value).toBe(false)
    expect(cart.courses.value[0]?.enabled).toBe(true)
  })

  it('serializes rapid All then None layer intents so the final intent wins', async () => {
    const firstWrite = deferred<void>()
    let layerEnabled = false
    const toggleLayer = vi.fn(async (_semester: string, _code: string, _layer: number, enabled: boolean) => {
      if (enabled) await firstWrite.promise
      layerEnabled = enabled
    })
    const getCart = vi.fn(async () => ([{
      course_code: 'AIAA1001',
      layers: {
        0: [{ id: 1, enabled: layerEnabled }],
      },
    } as unknown as CartCourse]))
    vi.stubGlobal('useScheduler', () => ({ getCart, toggleLayer }))

    const cart = useSchedulerCart('2610', ref(true), ref<CartCourse[]>([]))
    const selectAll = cart.toggleLayer('AIAA1001', 0, true)
    const selectNone = cart.toggleLayer('AIAA1001', 0, false)

    await vi.waitFor(() => expect(toggleLayer).toHaveBeenCalledTimes(1))
    expect(toggleLayer.mock.calls[0]?.[3]).toBe(true)

    firstWrite.resolve()
    await Promise.all([selectAll, selectNone])

    expect(toggleLayer.mock.calls.map(call => call[3])).toEqual([true, false])
    expect(getCart).toHaveBeenCalledTimes(2)
    expect(cart.courses.value[0]?.layers[0]?.[0]?.enabled).toBe(false)
  })

  it('orders bundle and layer mutations through the same per-layer queue', async () => {
    const bundleWrite = deferred<void>()
    const writes: string[] = []
    const toggleBundle = vi.fn(async () => {
      writes.push('bundle:start')
      await bundleWrite.promise
      writes.push('bundle:end')
    })
    const toggleLayer = vi.fn(async () => {
      writes.push('layer')
    })
    const getCart = vi.fn(async () => [])
    vi.stubGlobal('useScheduler', () => ({ getCart, toggleBundle, toggleLayer }))

    const cart = useSchedulerCart('2610', ref(true), ref<CartCourse[]>([]))
    const bundle = cart.toggleBundle('AIAA1001', 1, 0, true)
    const layer = cart.toggleLayer('AIAA1001', 0, false)

    await vi.waitFor(() => expect(writes).toEqual(['bundle:start']))
    bundleWrite.resolve()
    await Promise.all([bundle, layer])

    expect(writes).toEqual(['bundle:start', 'bundle:end', 'layer'])
  })

  it('serializes cross-key mutations so their authoritative GETs cannot supersede each other', async () => {
    const courseWrite = deferred<void>()
    const events: string[] = []
    const toggleCourse = vi.fn(async () => {
      events.push('course:write:start')
      await courseWrite.promise
      events.push('course:write:end')
    })
    const toggleBundle = vi.fn(async () => {
      events.push('bundle:write')
    })
    const getCart = vi.fn(async () => {
      events.push('get')
      return []
    })
    vi.stubGlobal('useScheduler', () => ({ getCart, toggleBundle, toggleCourse }))

    const cart = useSchedulerCart('2610', ref(true), ref<CartCourse[]>([]))
    const course = cart.toggleCourse('AIAA1001', true)
    const bundle = cart.toggleBundle('COMP1001', 1, 0, true)

    await vi.waitFor(() => expect(events).toEqual(['course:write:start']))
    courseWrite.resolve()
    await Promise.all([course, bundle])

    expect(events).toEqual([
      'course:write:start',
      'course:write:end',
      'get',
      'bundle:write',
      'get',
    ])
    expect(cart.requiresReload.value).toBe(false)
  })
})
