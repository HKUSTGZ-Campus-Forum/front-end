import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Ref,
} from 'vue'
import type { CartCourse, PlanSelection } from '~/utils/scheduler'
import {
  buildSchedulerOptimizerCourses,
  solveRankedScheduler,
  type SchedulerOptimizerCourse,
  type SchedulerOptimizerPlan,
  type SchedulerOptimizerProgress,
  type SchedulerOptimizerScoreProfile,
  type SchedulerOptimizerSolveResult,
} from '~/utils/schedulerOptimizer'
import {
  createDefaultSchedulerOptimizerConfig,
  createSchedulerOptimizerFingerprint,
  loadSchedulerOptimizerConfig,
  readSchedulerOptimizerCachedResult,
  saveSchedulerOptimizerConfig,
  writeSchedulerOptimizerCachedResult,
  type SchedulerOptimizerFingerprint,
  type SchedulerPlannerMode,
} from '~/utils/schedulerOptimizerStorage'

export type SchedulerOptimizerRunState =
  | 'idle'
  | 'checking-cache'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'no-solution'
  | 'error'

export type SchedulerOptimizerErrorCode =
  | 'no-candidates'
  | 'invalid-range'
  | 'invalid-top-x'
  | 'invalid-profile'
  | 'invalid-data'
  | 'failed'
  | ''

export interface SchedulerOptimizerWorkload {
  estimate: string
  tone: 'normal' | 'high' | 'critical'
  kind: 'normal' | 'high' | 'recommended-limit' | 'entertainment'
}

const EMPTY_PROGRESS: SchedulerOptimizerProgress = {
  processedWork: '0',
  totalWork: '0',
  visitedNodes: 0,
  feasibleCount: '0',
  retainedCount: 0,
  bestScore: null,
}

function cloneProfile(profile: SchedulerOptimizerScoreProfile): SchedulerOptimizerScoreProfile {
  return JSON.parse(JSON.stringify(profile)) as SchedulerOptimizerScoreProfile
}

function validCandidateDefaults(courses: readonly CartCourse[]): string[] {
  const enabled = courses.filter(course => course.enabled).map(course => course.course_code)
  return enabled.length ? enabled : courses.map(course => course.course_code)
}

function combinationsByOptionCount(
  courses: readonly SchedulerOptimizerCourse[],
  minCourses: number,
  maxCourses: number,
): bigint {
  if (minCourses < 0 || maxCourses < minCourses) return 0n
  let counts = Array<bigint>(maxCourses + 1).fill(0n)
  counts[0] = 1n
  for (const course of courses) {
    const next = [...counts]
    for (let selected = 0; selected < maxCourses; selected += 1) {
      next[selected + 1] += counts[selected] * BigInt(course.options.length)
    }
    counts = next
  }
  return counts.slice(minCourses, maxCourses + 1).reduce((sum, value) => sum + value, 0n)
}

export function schedulerOptimizerPlanSelections(
  plan: SchedulerOptimizerPlan | null | undefined,
  courses: readonly CartCourse[],
): PlanSelection[] {
  if (!plan) return []
  const indexByCode = new Map(courses.map((course, index) => [course.course_code, index]))
  const result: PlanSelection[] = []
  for (const chosen of plan.chosen) {
    const courseIndex = indexByCode.get(chosen.courseCode)
    if (courseIndex === undefined) return []
    for (const selection of chosen.selections) {
      result.push({ courseIndex, layer: selection.layer, bundleId: selection.bundleId })
    }
  }
  return result
}

export function useSchedulerOptimizer(options: {
  semesterId: string
  courseList: Ref<CartCourse[]>
  bannedPeriods: Ref<boolean[][]>
}) {
  const mode = ref<SchedulerPlannerMode>('fixed')
  const candidateCodes = ref<string[]>([])
  const minCourses = ref(3)
  const maxCourses = ref(9)
  const topX = ref(3)
  const profile = ref<SchedulerOptimizerScoreProfile>(
    createDefaultSchedulerOptimizerConfig().profile,
  )
  const rankedViewIndex = ref(1)
  const preferredPlanKey = ref('')
  const runState = ref<SchedulerOptimizerRunState>('idle')
  const errorCode = ref<SchedulerOptimizerErrorCode>('')
  const errorDetail = ref('')
  const progress = ref<SchedulerOptimizerProgress>({ ...EMPTY_PROGRESS })
  const result = ref<SchedulerOptimizerSolveResult | null>(null)
  const resultFingerprintKey = ref('')
  const resultFingerprintCanonical = ref('')
  const cacheHit = ref(false)
  const initialized = ref(false)
  const mounted = ref(false)
  let generation = 0
  let controller: AbortController | null = null
  let knownCourseCodes = new Set<string>()

  const preparedCourses = computed<SchedulerOptimizerCourse[]>(() => (
    buildSchedulerOptimizerCourses(
      options.courseList.value,
      options.bannedPeriods.value,
      candidateCodes.value,
    )
  ))
  const availableCourses = computed(() => preparedCourses.value.filter(course => course.options.length > 0))
  const unavailableCourseCodes = computed(() => preparedCourses.value
    .filter(course => course.options.length === 0)
    .map(course => course.code))

  const fingerprint = computed<SchedulerOptimizerFingerprint | null>(() => {
    try {
      return createSchedulerOptimizerFingerprint({
        schemaVersion: 1,
        semesterId: options.semesterId,
        candidates: preparedCourses.value,
        bannedPeriods: options.bannedPeriods.value,
        minCourses: minCourses.value,
        maxCourses: maxCourses.value,
        topX: topX.value,
        profile: profile.value,
      })
    } catch {
      return null
    }
  })

  const stale = computed(() => Boolean(
    result.value
    && resultFingerprintKey.value
    && (
      fingerprint.value?.key !== resultFingerprintKey.value
      || fingerprint.value?.canonicalInput !== resultFingerprintCanonical.value
    ),
  ))
  const rankedPlans = computed(() => result.value?.plans || [])
  const currentRankedPlan = computed(() => rankedPlans.value[rankedViewIndex.value - 1] || null)
  const currentRankedSelections = computed(() => (
    schedulerOptimizerPlanSelections(currentRankedPlan.value, options.courseList.value)
  ))

  const workload = computed<SchedulerOptimizerWorkload>(() => {
    let estimate = 0n
    try {
      estimate = combinationsByOptionCount(
        availableCourses.value,
        Math.max(0, minCourses.value),
        Math.max(0, maxCourses.value),
      )
    } catch {
      estimate = 0n
    }
    if (maxCourses.value > 10) {
      return { estimate: estimate.toString(), tone: 'critical', kind: 'entertainment' }
    }
    if (maxCourses.value === 10) {
      return { estimate: estimate.toString(), tone: 'high', kind: 'recommended-limit' }
    }
    if (estimate > 1_000_000n) {
      return { estimate: estimate.toString(), tone: 'high', kind: 'high' }
    }
    return { estimate: estimate.toString(), tone: 'normal', kind: 'normal' }
  })

  function persist() {
    if (!initialized.value) return
    saveSchedulerOptimizerConfig(options.semesterId, {
      schemaVersion: 1,
      mode: mode.value,
      candidateCodes: candidateCodes.value,
      minCourses: minCourses.value,
      maxCourses: maxCourses.value,
      topX: topX.value,
      profile: cloneProfile(profile.value),
      ...(preferredPlanKey.value ? { rankedPlanKey: preferredPlanKey.value } : {}),
    })
  }

  function reconcileCandidates(courses: readonly CartCourse[], includeNew = true) {
    const presentCodes = new Set(courses.map(course => course.course_code))
    const selected = new Set(candidateCodes.value.filter(code => presentCodes.has(code)))
    if (includeNew) {
      for (const course of courses) {
        if (!knownCourseCodes.has(course.course_code) && course.enabled) {
          selected.add(course.course_code)
        }
      }
    }
    candidateCodes.value = courses
      .map(course => course.course_code)
      .filter(code => selected.has(code))
    knownCourseCodes = presentCodes
  }

  function initialize(courses: readonly CartCourse[]) {
    if (initialized.value || courses.length === 0) return
    const defaults = createDefaultSchedulerOptimizerConfig(validCandidateDefaults(courses))
    const saved = loadSchedulerOptimizerConfig(options.semesterId, defaults)
    mode.value = saved.mode
    candidateCodes.value = saved.candidateCodes
    minCourses.value = saved.minCourses
    maxCourses.value = saved.maxCourses
    topX.value = saved.topX
    profile.value = cloneProfile(saved.profile)
    preferredPlanKey.value = saved.rankedPlanKey || ''
    knownCourseCodes = new Set(courses.map(course => course.course_code))
    reconcileCandidates(courses, false)
    initialized.value = true
  }

  onMounted(() => {
    mounted.value = true
    initialize(options.courseList.value)
  })

  watch(
    () => options.courseList.value.map(course => course.course_code).join('\u0000'),
    () => {
      if (!initialized.value) {
        if (mounted.value) initialize(options.courseList.value)
        return
      }
      reconcileCandidates(options.courseList.value)
    },
  )

  watch(
    [mode, candidateCodes, minCourses, maxCourses, topX, profile, preferredPlanKey],
    persist,
    { deep: true },
  )

  watch(rankedPlans, (plans) => {
    if (!plans.length) {
      rankedViewIndex.value = 1
      return
    }
    const preferredIndex = preferredPlanKey.value
      ? plans.findIndex(plan => plan.key === preferredPlanKey.value)
      : -1
    if (preferredIndex >= 0) rankedViewIndex.value = preferredIndex + 1
    else rankedViewIndex.value = Math.min(Math.max(1, rankedViewIndex.value), plans.length)
  })

  watch(rankedViewIndex, (index) => {
    const plan = rankedPlans.value[index - 1]
    if (plan) preferredPlanKey.value = plan.key
  })

  watch(mode, (nextMode) => {
    if (nextMode === 'fixed' && controller) cancel()
  })

  function toggleCandidate(code: string) {
    if (!options.courseList.value.some(course => course.course_code === code)) return
    const selected = new Set(candidateCodes.value)
    if (selected.has(code)) selected.delete(code)
    else selected.add(code)
    candidateCodes.value = options.courseList.value
      .map(course => course.course_code)
      .filter(courseCode => selected.has(courseCode))
  }

  function setRankedViewIndex(index: number) {
    if (!rankedPlans.value.length) {
      rankedViewIndex.value = 1
      return
    }
    rankedViewIndex.value = Math.min(rankedPlans.value.length, Math.max(1, Math.trunc(index)))
  }

  function validateRun(): SchedulerOptimizerErrorCode {
    if (candidateCodes.value.length === 0 || availableCourses.value.length === 0) return 'no-candidates'
    if (!Number.isSafeInteger(topX.value) || topX.value < 1) return 'invalid-top-x'
    if (
      !Number.isSafeInteger(minCourses.value)
      || !Number.isSafeInteger(maxCourses.value)
      || minCourses.value < 1
      || maxCourses.value < minCourses.value
      || maxCourses.value > availableCourses.value.length
    ) return 'invalid-range'
    return ''
  }

  function applyCompletedResult(
    nextResult: SchedulerOptimizerSolveResult,
    runFingerprint: SchedulerOptimizerFingerprint,
    fromCache: boolean,
  ) {
    result.value = nextResult
    resultFingerprintKey.value = runFingerprint.key
    resultFingerprintCanonical.value = runFingerprint.canonicalInput
    cacheHit.value = fromCache
    runState.value = nextResult.status === 'no-solution' ? 'no-solution' : 'complete'
    progress.value = {
      processedWork: nextResult.processedWork,
      totalWork: nextResult.totalWork,
      visitedNodes: nextResult.visitedNodes,
      feasibleCount: nextResult.feasibleCount,
      retainedCount: nextResult.retainedCount,
      bestScore: nextResult.plans[0]?.score || null,
    }
  }

  async function run(force = false) {
    if (controller) return
    errorCode.value = ''
    errorDetail.value = ''
    cacheHit.value = false

    let runFingerprint: SchedulerOptimizerFingerprint | null = null
    let courses: SchedulerOptimizerCourse[] = []
    let capturedMinCourses = 0
    let capturedMaxCourses = 0
    let capturedTopX = 0
    let capturedProfile = cloneProfile(profile.value)
    try {
      const validation = validateRun()
      if (validation) {
        errorCode.value = validation
        runState.value = 'error'
        return
      }
      runFingerprint = fingerprint.value
      courses = availableCourses.value
      capturedMinCourses = minCourses.value
      capturedMaxCourses = maxCourses.value
      capturedTopX = topX.value
      capturedProfile = cloneProfile(profile.value)
      if (!runFingerprint) throw new Error('Optimizer input fingerprint is unavailable')
    } catch (error) {
      errorCode.value = 'invalid-data'
      errorDetail.value = error instanceof Error ? error.message : String(error)
      runState.value = 'error'
      return
    }

    const runGeneration = ++generation
    runState.value = force ? 'running' : 'checking-cache'
    progress.value = { ...EMPTY_PROGRESS }
    controller = new AbortController()
    const signal = controller.signal

    try {
      if (!force) {
        const cached = await readSchedulerOptimizerCachedResult(runFingerprint)
        if (generation !== runGeneration || signal.aborted) return
        if (cached) {
          applyCompletedResult(cached, runFingerprint, true)
          return
        }
      }

      runState.value = 'running'
      const solved = await solveRankedScheduler({
        courses,
        minCourses: capturedMinCourses,
        maxCourses: capturedMaxCourses,
        topX: capturedTopX,
        profile: capturedProfile,
        signal,
        onProgress: (nextProgress) => {
          if (generation === runGeneration) progress.value = nextProgress
        },
      })
      if (generation !== runGeneration) return
      if (solved.status === 'cancelled') {
        runState.value = 'cancelled'
        return
      }
      applyCompletedResult(solved, runFingerprint, false)
      void writeSchedulerOptimizerCachedResult(runFingerprint, solved)
    } catch (error) {
      if (signal.aborted) {
        runState.value = 'cancelled'
        return
      }
      errorDetail.value = error instanceof Error ? error.message : String(error)
      errorCode.value = errorDetail.value.toLowerCase().includes('score')
        ? 'invalid-profile'
        : 'failed'
      runState.value = 'error'
    } finally {
      if (generation === runGeneration) controller = null
    }
  }

  function cancel() {
    if (!controller) return
    controller.abort()
    controller = null
    generation += 1
    runState.value = 'cancelled'
  }

  onBeforeUnmount(cancel)

  return {
    mode,
    candidateCodes,
    minCourses,
    maxCourses,
    topX,
    profile,
    rankedViewIndex,
    runState,
    errorCode,
    errorDetail,
    progress,
    result,
    cacheHit,
    initialized,
    preparedCourses,
    availableCourses,
    unavailableCourseCodes,
    stale,
    rankedPlans,
    currentRankedPlan,
    currentRankedSelections,
    workload,
    toggleCandidate,
    setRankedViewIndex,
    run,
    cancel,
  }
}
