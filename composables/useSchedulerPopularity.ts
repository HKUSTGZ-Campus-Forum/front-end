import {
  computed,
  onScopeDispose,
  ref,
  watch,
  type Ref,
} from 'vue'
import type {
  SchedulerPopularityByCourse,
  SchedulerPopularityResponse,
} from '../utils/scheduler'
import { indexSchedulerPopularity } from '../utils/scheduler'

export type SchedulerPopularityStatus = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error'

export interface SchedulerVisibilitySource {
  readonly hidden: boolean
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

interface SchedulerPopularityOptions {
  semesterId: string
  isLoggedIn: Readonly<Ref<boolean>>
  courseCodes: Readonly<Ref<readonly string[]>>
  getPopularity: (
    semesterId: string,
    courseCodes: readonly string[],
  ) => Promise<SchedulerPopularityResponse | null>
  pollIntervalMs?: number
  visibilitySource?: SchedulerVisibilitySource | null
}

export function useSchedulerPopularity({
  semesterId,
  isLoggedIn,
  courseCodes,
  getPopularity,
  pollIntervalMs = 15_000,
  visibilitySource: providedVisibilitySource,
}: SchedulerPopularityOptions) {
  const defaultVisibilitySource = typeof document === 'undefined'
    ? null
    : document as SchedulerVisibilitySource
  const visibilitySource = providedVisibilitySource === undefined
    ? defaultVisibilitySource
    : providedVisibilitySource

  const popularityByCourse = ref<SchedulerPopularityByCourse>({})
  const status = ref<SchedulerPopularityStatus>('idle')
  const error = ref<Error | null>(null)
  const generatedAt = ref<string | null>(null)
  const authorized = ref(false)
  const normalizedCourseCodes = computed(() => (
    [...new Set(courseCodes.value.map(code => code.trim()).filter(Boolean))].sort()
  ))
  const courseCodeKey = computed(() => normalizedCourseCodes.value.join('\u0000'))
  const canShowPopularity = computed(() => authorized.value)
  const forbidden = computed(() => status.value === 'forbidden')

  let disposed = false
  let requestGeneration = 0
  let refreshQueued = false
  let activeRun: Promise<void> | null = null
  let pollingTimer: ReturnType<typeof setInterval> | null = null

  function isEligible() {
    return Boolean(
      visibilitySource
      && isLoggedIn.value
      && normalizedCourseCodes.value.length > 0,
    )
  }

  function stopPolling() {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  function startPolling() {
    stopPolling()
    if (
      disposed
      || !isEligible()
      || visibilitySource?.hidden
      || status.value === 'forbidden'
    ) return

    pollingTimer = setInterval(() => {
      void refresh()
    }, pollIntervalMs)
  }

  function clearPopularity(nextStatus: SchedulerPopularityStatus = 'idle') {
    popularityByCourse.value = {}
    generatedAt.value = null
    authorized.value = false
    error.value = null
    status.value = nextStatus
  }

  async function performRefresh() {
    if (!isEligible() || visibilitySource?.hidden) return

    const generation = requestGeneration
    const requestedKey = courseCodeKey.value
    const requestedCodes = [...normalizedCourseCodes.value]
    if (!authorized.value) status.value = 'loading'
    error.value = null

    try {
      const response = await getPopularity(semesterId, requestedCodes)
      if (
        disposed
        || generation !== requestGeneration
        || !isLoggedIn.value
        || requestedKey !== courseCodeKey.value
      ) return

      if (response === null) {
        clearPopularity('forbidden')
        stopPolling()
        return
      }

      popularityByCourse.value = indexSchedulerPopularity(response)
      generatedAt.value = response.generated_at
      authorized.value = true
      status.value = 'ready'
      startPolling()
    } catch (refreshError) {
      if (
        disposed
        || generation !== requestGeneration
        || !isLoggedIn.value
        || requestedKey !== courseCodeKey.value
      ) return

      error.value = refreshError instanceof Error
        ? refreshError
        : new Error('Failed to refresh scheduler popularity')
      status.value = 'error'
      startPolling()
    }
  }

  async function drainRefreshQueue() {
    try {
      while (refreshQueued && !disposed) {
        refreshQueued = false
        await performRefresh()
      }
    } finally {
      activeRun = null
    }
  }

  function refresh(): Promise<void> {
    if (disposed || !isEligible() || visibilitySource?.hidden) return Promise.resolve()
    refreshQueued = true
    if (!activeRun) activeRun = drainRefreshQueue()
    return activeRun
  }

  const stopWatching = watch(
    [isLoggedIn, courseCodeKey],
    ([loggedIn, codes]) => {
      requestGeneration += 1
      refreshQueued = false
      stopPolling()

      if (!loggedIn || !codes || !visibilitySource) {
        clearPopularity()
        return
      }

      if (!authorized.value) status.value = 'loading'
      void refresh()
    },
    { immediate: true },
  )

  function handleVisibilityChange() {
    if (visibilitySource?.hidden) {
      stopPolling()
      return
    }
    void refresh()
  }

  visibilitySource?.addEventListener('visibilitychange', handleVisibilityChange)

  onScopeDispose(() => {
    disposed = true
    requestGeneration += 1
    refreshQueued = false
    stopWatching()
    stopPolling()
    visibilitySource?.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    popularityByCourse,
    status,
    error,
    generatedAt,
    canShowPopularity,
    forbidden,
    refresh,
  }
}
