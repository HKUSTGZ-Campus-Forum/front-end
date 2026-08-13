import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useSchedulerCartLoader } from '../../composables/useSchedulerCartLoader'
import type { CartCourse } from '../../utils/scheduler'

afterEach(() => {
  vi.unstubAllGlobals()
  delete (process as typeof process & { client?: boolean }).client
})

describe('scheduler authentication readiness', () => {
  it('marks authentication ready when browser storage rejects access', async () => {
    Object.defineProperty(process, 'client', { configurable: true, value: true })
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    vi.resetModules()

    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()

    expect(auth.authInitialized.value).toBe(false)
    expect(() => auth.init()).not.toThrow()
    expect(auth.authInitialized.value).toBe(true)
  })

  it('does not restore a stale cart response after logout', async () => {
    let resolveCart!: (cart: CartCourse[]) => void
    const pendingCart = new Promise<CartCourse[]>((resolve) => {
      resolveCart = resolve
    })
    const authInitialized = ref(true)
    const isLoggedIn = ref(true)
    const getCart = vi.fn(() => pendingCart)
    const { courseList, loading, loadError } = useSchedulerCartLoader({
      semesterId: '2540',
      authInitialized,
      isLoggedIn,
      getCart,
    })

    expect(getCart).toHaveBeenCalledOnce()
    expect(loading.value).toBe(true)

    isLoggedIn.value = false
    await nextTick()
    expect(courseList.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(loadError.value).toBe(false)

    resolveCart([{ course_code: 'TEST1001' } as CartCourse])
    await pendingCart
    await nextTick()

    expect(courseList.value).toEqual([])
    expect(loadError.value).toBe(false)
  })

  it('surfaces cart load failures and clears the error after a successful retry', async () => {
    const restoredCart = [{ course_code: 'TEST1001' } as CartCourse]
    const authInitialized = ref(true)
    const isLoggedIn = ref(true)
    const getCart = vi.fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce(restoredCart)
    const { courseList, loading, loadError, reload } = useSchedulerCartLoader({
      semesterId: '2540',
      authInitialized,
      isLoggedIn,
      getCart,
    })

    await vi.waitFor(() => expect(loading.value).toBe(false))
    expect(loadError.value).toBe(true)
    expect(courseList.value).toEqual([])

    reload()
    await vi.waitFor(() => expect(getCart).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(loading.value).toBe(false))

    expect(loadError.value).toBe(false)
    expect(courseList.value).toEqual(restoredCart)
  })

  it('ignores an older cart failure after a retry succeeds', async () => {
    let rejectFirst!: (error: Error) => void
    const firstRequest = new Promise<CartCourse[]>((_resolve, reject) => {
      rejectFirst = reject
    })
    const restoredCart = [{ course_code: 'TEST1002' } as CartCourse]
    const authInitialized = ref(true)
    const isLoggedIn = ref(true)
    const getCart = vi.fn()
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce(restoredCart)
    const { courseList, loading, loadError, reload } = useSchedulerCartLoader({
      semesterId: '2540',
      authInitialized,
      isLoggedIn,
      getCart,
    })

    reload()
    await vi.waitFor(() => expect(getCart).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(loading.value).toBe(false))
    expect(courseList.value).toEqual(restoredCart)

    rejectFirst(new Error('stale failure'))
    await firstRequest.catch(() => undefined)
    await nextTick()

    expect(loadError.value).toBe(false)
    expect(courseList.value).toEqual(restoredCart)
  })
})
