import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n?/g, '\n')
}

function between(value: string, startMarker: string, endMarker?: string): string {
  const start = value.indexOf(startMarker)
  if (start < 0) throw new Error(`Missing contract start marker: ${startMarker}`)
  const end = endMarker ? value.indexOf(endMarker, start + startMarker.length) : value.length
  if (end < 0) throw new Error(`Missing contract end marker: ${endMarker}`)
  return value.slice(start, end)
}

const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')
const sidePanel = source('../../components/scheduler/SchedulerSidePanel.vue')
const courseCard = source('../../components/scheduler/SchedulerCourseCard.vue')
const bottomPanel = source('../../components/scheduler/SchedulerBottomPanel.vue')
const optimizerComposable = source('../../composables/useSchedulerOptimizer.ts')
const optimizerStorage = source('../../utils/schedulerOptimizerStorage.ts')

describe('ranked scheduler UI integration contract', () => {
  it('preserves the fixed solver while routing ranked plans through an explicit mode', () => {
    expect(dashboard).toMatch(/computed\(\(\)\s*=>\s*solvePlans\(courseList\.value,\s*bannedPeriods\.value\)\)/)
    expect(dashboard).toContain('<SchedulerModeSwitch')
    expect(dashboard).toContain('v-model="plannerMode"')
    expect(dashboard).toContain("const isRankedMode = computed(() => plannerMode.value === 'ranked')")

    const currentPlan = between(dashboard, 'const currentPlan = computed', 'const currentPlanFingerprint')
    expect(currentPlan).toContain('if (isRankedMode.value) return currentRankedSelections.value')
    expect(currentPlan).toContain('planList.value[viewIndex.value - 1]')
  })

  it('keeps run, cancel, settings, and score breakdown as explicit dashboard actions', () => {
    expect(dashboard).toContain('@click="optimizerBusy ? optimizer.cancel() : optimizer.run()"')
    expect(dashboard).toContain('@click="showOptimizerSettings = true"')
    expect(dashboard).toContain('@click="showScoreBreakdown = true"')
    expect(dashboard).toContain('<SchedulerOptimizerSettings')
    expect(dashboard).toContain(':profile="optimizerProfile"')
    expect(dashboard).toContain('@update:profile="optimizerProfile = $event"')
    expect(dashboard).toContain('<SchedulerScoreBreakdown')
    expect(dashboard).toContain(':plan="currentRankedPlan"')
    expect(dashboard).toContain('role="progressbar"')

    const message = between(dashboard, 'const planMessage = computed', 'const planIcon = computed')
    expect(message.indexOf("optimizerRunState.value === 'running'")).toBeLessThan(
      message.indexOf('if (optimizerStale.value)'),
    )
  })

  it('toggles ranked candidates locally instead of mutating the cart', () => {
    const handler = between(dashboard, 'function handleToggleCourseByMode', 'function handleToggleBundle')
    expect(handler).toMatch(
      /if\s*\(isRankedMode\.value\)\s*\{\s*optimizer\.toggleCandidate\(code\)\s*return\s*\}\s*handleToggleCourse\(code,\s*currentEnabled\)/,
    )
    const rankedBranch = between(handler, 'if (isRankedMode.value)', 'handleToggleCourse(code')
    expect(rankedBranch).not.toContain('cart.')
    expect(rankedBranch).not.toContain('handleCartAction')
  })

  it('derives entertainment workload from the course-range maximum, never pool size alone', () => {
    const workload = between(optimizerComposable, 'const workload = computed', 'function persist()')
    expect(workload).toContain('if (maxCourses.value > 10)')
    expect(workload).toContain("kind: 'entertainment'")
    expect(workload).not.toMatch(/(?:candidateCodes|availableCourses)\.value\.length\s*>\s*10/)
  })

  it('serializes ranked results even when their candidate courses are disabled in fixed mode', () => {
    const fingerprint = between(dashboard, 'const currentPlanFingerprint', 'const savedPlanDirty')
    const save = between(dashboard, 'async function saveCurrentPlan', 'async function startNewPlan')
    expect(fingerprint).toContain('includeDisabledCourses: isRankedMode.value')
    expect(save).toContain('includeDisabledCourses: isRankedMode.value')
  })

  it('keeps course selection controlled by ranked candidate state in the side panel', () => {
    expect(sidePanel).toContain('candidateMode?: boolean')
    expect(sidePanel).toContain('candidateCodes?: string[]')
    expect(sidePanel).toContain('const candidateCodeSet = computed')
    expect(sidePanel).toContain(':selected="candidateMode ? candidateCodeSet.has(course.course_code) : undefined"')
    expect(courseCard).toContain('selected?: boolean')
    expect(courseCard).toContain('props.selected ?? props.course.enabled')
    expect(courseCard).toContain(':aria-pressed="isSelected"')
    expect(courseCard).toContain('class="course-card__toggle"')
    expect(courseCard).not.toContain('role="button"')
  })

  it('keeps the bottom result number directly editable and accessible', () => {
    expect(bottomPanel).toContain('data-testid="scheduler-plan-index-input"')
    expect(bottomPanel).toContain('@blur="commitIndexEdit"')
    expect(bottomPanel).toContain('@keydown.enter.prevent="commitIndexEdit"')
    expect(bottomPanel).toContain('@keydown.esc.prevent="cancelIndexEdit"')
    expect(bottomPanel).toContain(':disabled="totalPlans <= 0"')
    expect(bottomPanel).toContain('role="slider"')
    expect(bottomPanel).toContain(':aria-valuenow="displayedIndex"')
  })
})

describe('ranked scheduler component accessibility and styling contract', () => {
  const components = [
    {
      name: 'mode switch',
      value: source('../../components/scheduler/SchedulerModeSwitch.vue'),
      roles: ['role="tablist"', 'role="tab"', ':aria-selected='],
    },
    {
      name: 'optimizer settings',
      value: source('../../components/scheduler/SchedulerOptimizerSettings.vue'),
      roles: ['role="dialog"', 'aria-modal="true"', 'aria-labelledby="optimizer-settings-title"'],
    },
    {
      name: 'score breakdown',
      value: source('../../components/scheduler/SchedulerScoreBreakdown.vue'),
      roles: ['role="dialog"', 'aria-modal="true"', 'aria-labelledby="score-breakdown-title"'],
    },
  ]

  for (const component of components) {
    it(`${component.name} uses translated copy, theme tokens, and ARIA`, () => {
      expect(component.value).toMatch(/const\s*\{\s*t\s*\}\s*=\s*useI18n\(\)/)
      expect(component.value).toMatch(/t\((?:'scheduler\.|`scheduler\.|mode\.)/)
      expect(component.value).toContain('var(--')
      expect(component.value).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
      for (const role of component.roles) expect(component.value).toContain(role)
    })
  }
})

describe('ranked scheduler cache and async input contract', () => {
  it('fingerprints course data, bans, range, Top X, and the complete score profile', () => {
    const fingerprint = between(optimizerComposable, 'const fingerprint = computed', 'const stale = computed')
    for (const field of [
      'semesterId: options.semesterId',
      'candidates: canonicalSchedulerOptimizerCandidates(preparedCourses.value)',
      'bannedPeriods: options.bannedPeriods.value',
      'minCourses: minCourses.value',
      'maxCourses: maxCourses.value',
      'topX: topX.value',
      'profile: profile.value',
    ]) {
      expect(fingerprint).toContain(field)
    }
  })

  it('only accepts complete/no-solution cache records and never writes cancellation', () => {
    const readCache = between(
      optimizerStorage,
      'export async function readSchedulerOptimizerCachedResult',
      'export async function writeSchedulerOptimizerCachedResult',
    )
    const writeCache = between(
      optimizerStorage,
      'export async function writeSchedulerOptimizerCachedResult',
    )
    const run = between(optimizerComposable, 'async function run(', 'function cancel()')

    expect(readCache).toMatch(/result\.status\s*===\s*'complete'/)
    expect(readCache).toMatch(/result\.status\s*===\s*'no-solution'/)
    expect(writeCache).toMatch(
      /result\.status\s*!==\s*'complete'\s*&&\s*result\.status\s*!==\s*'no-solution'/,
    )
    expect(run.indexOf("if (solved.status === 'cancelled')")).toBeLessThan(
      run.indexOf('writeSchedulerOptimizerCachedResult(runFingerprint, solved)'),
    )
  })

  it('captures solver inputs and rechecks their fingerprint after every asynchronous boundary', () => {
    const run = between(optimizerComposable, 'async function run(', 'function cancel()')
    const firstAwait = run.indexOf('await readSchedulerOptimizerCachedResult(runFingerprint)')
    expect(firstAwait).toBeGreaterThan(0)

    for (const capture of [
      'runFingerprint = fingerprint.value',
      'courses = cloneCourses(availableCourses.value)',
      'capturedMinCourses = minCourses.value',
      'capturedMaxCourses = Math.min(maxCourses.value, courses.length)',
      'capturedTopX = topX.value',
      'capturedProfile = cloneProfile(profile.value)',
    ]) {
      expect(run.indexOf(capture)).toBeGreaterThan(0)
      expect(run.indexOf(capture)).toBeLessThan(firstAwait)
    }

    const afterFirstAwait = run.slice(firstAwait)
    expect(afterFirstAwait).toContain('minCourses: capturedMinCourses')
    expect(afterFirstAwait).toContain('maxCourses: capturedMaxCourses')
    expect(afterFirstAwait).toContain('topX: capturedTopX')
    expect(afterFirstAwait).toContain('profile: capturedProfile')
    expect(afterFirstAwait).toContain('writeSchedulerOptimizerCachedResult(runFingerprint, solved)')

    const cacheRecheck = run.indexOf(
      'schedulerOptimizerFingerprintsEqual(fingerprint.value, runFingerprint)',
      firstAwait,
    )
    const solveAwait = run.indexOf('await solveRankedScheduler')
    const solveRecheck = run.indexOf(
      'schedulerOptimizerFingerprintsEqual(fingerprint.value, runFingerprint)',
      solveAwait,
    )
    const applyResult = run.indexOf('applyCompletedResult(solved, runFingerprint, false)')
    expect(cacheRecheck).toBeGreaterThan(firstAwait)
    expect(cacheRecheck).toBeLessThan(solveAwait)
    expect(solveRecheck).toBeGreaterThan(solveAwait)
    expect(solveRecheck).toBeLessThan(applyResult)
    expect(run.slice(cacheRecheck, solveAwait)).toContain('void run(force)')
    expect(run.slice(solveRecheck, applyResult)).toContain('void run(force)')
  })

  it('keeps an old stale result hidden while a replacement run is active', () => {
    const stale = between(optimizerComposable, 'const stale = computed', 'const rankedPlans = computed')
    expect(stale).toContain("runState.value === 'running'")
    expect(stale).toContain("runState.value === 'checking-cache'")

    const apply = between(optimizerComposable, 'function applyCompletedResult', 'async function run(')
    expect(apply.indexOf('resultFingerprintKey.value = runFingerprint.key')).toBeLessThan(
      apply.indexOf('result.value = nextResult'),
    )
  })
})
