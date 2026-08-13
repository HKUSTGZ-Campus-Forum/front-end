import { ref, watch, type Ref } from 'vue'
import type { CartCourse } from '../utils/scheduler'
import {
  addGuestCourse,
  removeGuestCourse,
  setGuestBundleEnabled,
  setGuestCourseEnabled,
  setGuestLayerEnabled,
} from '../utils/schedulerCart'

export function useSchedulerCart(
  semesterId: string,
  loggedIn: Ref<boolean>,
  initial: Ref<CartCourse[]>,
) {
  const api = useScheduler()
  const courses = ref<CartCourse[]>([...initial.value])
  const mutationTails = new Map<string, Promise<void>>()
  let refreshGeneration = 0

  watch(initial, value => {
    refreshGeneration += 1
    courses.value = [...value]
  })

  async function refresh(): Promise<boolean> {
    if (!loggedIn.value) return false
    const generation = ++refreshGeneration
    try {
      const nextCourses = await api.getCart(semesterId)
      if (generation === refreshGeneration && loggedIn.value) {
        courses.value = nextCourses
        return true
      }
      return false
    } catch (error) {
      if (generation === refreshGeneration && loggedIn.value) throw error
      return false
    }
  }

  async function reconcileAuthenticatedMutation() {
    let lastError: unknown

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!loggedIn.value) throw new Error('Cart reconciliation requires authentication')
      try {
        if (await refresh()) return
        lastError = new Error('Cart reconciliation was superseded')
      } catch (error) {
        lastError = error
      }
    }

    throw lastError
  }

  async function mutateAuthenticated(write: () => Promise<unknown>) {
    let writeError: unknown
    try {
      await write()
    } catch (error) {
      // A failed response does not prove the server rejected the write. Always
      // reconcile before surfacing the ambiguity to the user.
      writeError = error
    }

    let reconciliationError: unknown
    try {
      await reconcileAuthenticatedMutation()
    } catch (error) {
      reconciliationError = error
    }

    if (writeError) throw writeError
    if (reconciliationError) throw reconciliationError
  }

  function enqueueMutation(key: string, mutation: () => Promise<void>): Promise<void> {
    const previous = mutationTails.get(key) ?? Promise.resolve()
    const run = previous.catch(() => undefined).then(mutation)
    const queued = run.finally(() => {
      if (mutationTails.get(key) === queued) mutationTails.delete(key)
    })
    mutationTails.set(key, queued)
    return queued
  }

  async function add(code: string) {
    if (loggedIn.value) {
      return enqueueMutation(`membership:${code}`, () => (
        mutateAuthenticated(() => api.addToCart(semesterId, code))
      ))
    }

    courses.value = addGuestCourse(courses.value, await api.getCourseDetail(code, semesterId))
  }

  async function remove(code: string) {
    if (loggedIn.value) {
      return enqueueMutation(`membership:${code}`, () => (
        mutateAuthenticated(() => api.removeFromCart(semesterId, code))
      ))
    }

    courses.value = removeGuestCourse(courses.value, code)
  }

  async function toggleCourse(code: string, enabled: boolean) {
    if (loggedIn.value) {
      return enqueueMutation(`course:${code}`, () => (
        mutateAuthenticated(() => api.toggleCourse(semesterId, code, enabled))
      ))
    }

    courses.value = setGuestCourseEnabled(courses.value, code, enabled)
  }

  async function toggleBundle(code: string, bundleId: number, layer: number, enabled: boolean) {
    if (loggedIn.value) {
      return enqueueMutation(`selection:${code}:${layer}`, () => (
        mutateAuthenticated(() => api.toggleBundle(semesterId, code, bundleId, layer, enabled))
      ))
    }

    courses.value = setGuestBundleEnabled(courses.value, code, bundleId, layer, enabled)
  }

  async function toggleLayer(code: string, layer: number, enabled: boolean) {
    if (loggedIn.value) {
      return enqueueMutation(`selection:${code}:${layer}`, () => (
        mutateAuthenticated(() => api.toggleLayer(semesterId, code, layer, enabled))
      ))
    }

    courses.value = setGuestLayerEnabled(courses.value, code, layer, enabled)
  }

  return {
    courses,
    refresh,
    add,
    remove,
    toggleCourse,
    toggleBundle,
    toggleLayer,
  }
}
