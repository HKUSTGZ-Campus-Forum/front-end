import { ref, watch, type Ref } from 'vue'
import type { CartCourse } from '../utils/scheduler'
import {
  addGuestCourse,
  removeGuestCourse,
  setGuestBundleEnabled,
  setGuestCourseEnabled,
  setGuestLayerEnabled,
} from '../utils/schedulerCart'
import { SchedulerCartMutationError } from '../utils/schedulerAsync'

export function useSchedulerCart(
  semesterId: string,
  loggedIn: Ref<boolean>,
  initial: Ref<CartCourse[]>,
) {
  const api = useScheduler()
  const courses = ref<CartCourse[]>([...initial.value])
  const requiresReload = ref(false)
  const reloading = ref(false)
  let mutationTail: Promise<void> = Promise.resolve()
  let refreshGeneration = 0

  watch(initial, value => {
    refreshGeneration += 1
    courses.value = [...value]
    requiresReload.value = false
  })

  async function refresh(): Promise<boolean> {
    if (!loggedIn.value) return false
    const generation = ++refreshGeneration
    try {
      const nextCourses = await api.getCart(semesterId)
      if (generation === refreshGeneration && loggedIn.value) {
        courses.value = nextCourses
        requiresReload.value = false
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
    if (requiresReload.value || reloading.value) {
      throw new SchedulerCartMutationError('blocked')
    }

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

    if (reconciliationError) {
      requiresReload.value = true
      throw new SchedulerCartMutationError('state-unverified', reconciliationError)
    }
    if (writeError) {
      throw new SchedulerCartMutationError('write-ambiguous-reconciled', writeError)
    }
  }

  function enqueueMutation(mutation: () => Promise<void>): Promise<void> {
    if (requiresReload.value || reloading.value) {
      return Promise.reject(new SchedulerCartMutationError('blocked'))
    }

    const queued = mutationTail.catch(() => undefined).then(mutation)
    mutationTail = queued
    return queued
  }

  async function reloadAuthoritative() {
    if (!loggedIn.value) throw new SchedulerCartMutationError('state-unverified')
    reloading.value = true
    try {
      await mutationTail.catch(() => undefined)
      if (!await refresh()) {
        throw new Error('Cart reload was superseded')
      }
    } catch (error) {
      requiresReload.value = true
      throw new SchedulerCartMutationError('state-unverified', error)
    } finally {
      reloading.value = false
    }
  }

  async function add(code: string) {
    if (loggedIn.value) {
      return enqueueMutation(() => (
        mutateAuthenticated(() => api.addToCart(semesterId, code))
      ))
    }

    courses.value = addGuestCourse(courses.value, await api.getCourseDetail(code, semesterId))
  }

  async function remove(code: string) {
    if (loggedIn.value) {
      return enqueueMutation(() => (
        mutateAuthenticated(() => api.removeFromCart(semesterId, code))
      ))
    }

    courses.value = removeGuestCourse(courses.value, code)
  }

  async function toggleCourse(code: string, enabled: boolean) {
    if (loggedIn.value) {
      if (requiresReload.value || reloading.value) {
        throw new SchedulerCartMutationError('blocked')
      }
      // Optimistic apply: flip the local state immediately so the UI responds
      // before the round-trip. The queued authoritative write + reconciliation
      // below confirms the change; on failure `requiresReload` freezes further
      // mutations and the user can reload the authoritative cart.
      courses.value = setGuestCourseEnabled(courses.value, code, enabled)
      return enqueueMutation(() => (
        mutateAuthenticated(() => api.toggleCourse(semesterId, code, enabled))
      ))
    }

    courses.value = setGuestCourseEnabled(courses.value, code, enabled)
  }

  async function toggleBundle(code: string, bundleId: number, layer: number, enabled: boolean) {
    if (loggedIn.value) {
      if (requiresReload.value || reloading.value) {
        throw new SchedulerCartMutationError('blocked')
      }
      courses.value = setGuestBundleEnabled(courses.value, code, bundleId, layer, enabled)
      return enqueueMutation(() => (
        mutateAuthenticated(() => api.toggleBundle(semesterId, code, bundleId, layer, enabled))
      ))
    }

    courses.value = setGuestBundleEnabled(courses.value, code, bundleId, layer, enabled)
  }

  async function toggleLayer(code: string, layer: number, enabled: boolean) {
    if (loggedIn.value) {
      if (requiresReload.value || reloading.value) {
        throw new SchedulerCartMutationError('blocked')
      }
      courses.value = setGuestLayerEnabled(courses.value, code, layer, enabled)
      return enqueueMutation(() => (
        mutateAuthenticated(() => api.toggleLayer(semesterId, code, layer, enabled))
      ))
    }

    courses.value = setGuestLayerEnabled(courses.value, code, layer, enabled)
  }

  return {
    courses,
    requiresReload,
    reloading,
    refresh,
    reloadAuthoritative,
    add,
    remove,
    toggleCourse,
    toggleBundle,
    toggleLayer,
  }
}
