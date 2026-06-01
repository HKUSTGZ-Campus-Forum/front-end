import { ref, watch, type Ref } from 'vue'
import type { CartCourse } from '~/utils/scheduler'
import {
  addGuestCourse,
  removeGuestCourse,
  setGuestBundleEnabled,
  setGuestCourseEnabled,
  setGuestLayerEnabled,
} from '~/utils/schedulerCart'

export function useSchedulerCart(
  semesterId: string,
  loggedIn: Ref<boolean>,
  initial: Ref<CartCourse[]>,
) {
  const api = useScheduler()
  const courses = ref<CartCourse[]>([...initial.value])

  watch(initial, value => {
    courses.value = [...value]
  })

  async function refresh() {
    if (loggedIn.value) courses.value = await api.getCart(semesterId)
  }

  async function add(code: string) {
    if (loggedIn.value) {
      await api.addToCart(semesterId, code)
    } else {
      courses.value = addGuestCourse(courses.value, await api.getCourseDetail(code, semesterId))
    }
    await refresh()
  }

  async function remove(code: string) {
    if (loggedIn.value) {
      await api.removeFromCart(semesterId, code)
    } else {
      courses.value = removeGuestCourse(courses.value, code)
    }
    await refresh()
  }

  async function toggleCourse(code: string, enabled: boolean) {
    if (loggedIn.value) {
      await api.toggleCourse(semesterId, code, enabled)
    } else {
      courses.value = setGuestCourseEnabled(courses.value, code, enabled)
    }
    await refresh()
  }

  async function toggleBundle(code: string, bundleId: number, layer: number, enabled: boolean) {
    if (loggedIn.value) {
      await api.toggleBundle(semesterId, code, bundleId, layer, enabled)
    } else {
      courses.value = setGuestBundleEnabled(courses.value, code, bundleId, layer, enabled)
    }
    await refresh()
  }

  async function toggleLayer(code: string, layer: number, enabled: boolean) {
    if (loggedIn.value) {
      await api.toggleLayer(semesterId, code, layer, enabled)
    } else {
      courses.value = setGuestLayerEnabled(courses.value, code, layer, enabled)
    }
    await refresh()
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
