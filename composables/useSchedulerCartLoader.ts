import { ref, watch, type Ref } from 'vue'
import type { CartCourse } from '~/utils/scheduler'

interface SchedulerCartLoaderOptions {
  semesterId: string
  authInitialized: Readonly<Ref<boolean>>
  isLoggedIn: Readonly<Ref<boolean>>
  getCart: (semesterId: string) => Promise<CartCourse[]>
}

export function useSchedulerCartLoader({
  semesterId,
  authInitialized,
  isLoggedIn,
  getCart,
}: SchedulerCartLoaderOptions) {
  const courseList = ref<CartCourse[]>([])
  const loading = ref(true)
  const loadError = ref(false)
  const reloadToken = ref(0)

  watch([authInitialized, isLoggedIn, reloadToken], async ([ready, loggedIn], _previous, onCleanup) => {
    if (!ready) return

    let active = true
    onCleanup(() => {
      active = false
    })

    loading.value = true
    loadError.value = false
    try {
      if (!loggedIn) {
        courseList.value = []
        return
      }

      const nextCourseList = await getCart(semesterId)
      if (active && isLoggedIn.value) {
        courseList.value = nextCourseList
      }
    } catch {
      if (active) loadError.value = true
    } finally {
      if (active) {
        loading.value = false
      }
    }
  }, { immediate: true })

  function reload() {
    reloadToken.value += 1
  }

  return { courseList, loading, loadError, reload }
}
