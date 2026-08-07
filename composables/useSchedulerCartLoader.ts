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

  watch([authInitialized, isLoggedIn], async ([ready, loggedIn], _previous, onCleanup) => {
    if (!ready) return

    let active = true
    onCleanup(() => {
      active = false
    })

    loading.value = true
    try {
      if (!loggedIn) {
        courseList.value = []
        return
      }

      const nextCourseList = await getCart(semesterId)
      if (active && isLoggedIn.value) {
        courseList.value = nextCourseList
      }
    } finally {
      if (active) {
        loading.value = false
      }
    }
  }, { immediate: true })

  return { courseList, loading }
}
