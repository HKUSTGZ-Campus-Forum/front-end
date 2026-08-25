import {
  TIME_SLOTS,
  schedulerLecturesOverlap,
  type CartCourse,
  type PlanSelection,
  type SchedulerLecture,
} from './scheduler'

export type SchedulerOptimizerRuleApplication = 'per-day' | 'any-day' | 'all-days'
export type SchedulerOptimizerTimeState = 'occupied' | 'free'

export interface SchedulerOptimizerCourseCountRule {
  id: string
  enabled: boolean
  courseCount: number
  delta: string
}

export interface SchedulerOptimizerCourseRule {
  id: string
  enabled: boolean
  courseCode: string
  delta: string
}

export interface SchedulerOptimizerSectionRule {
  id: string
  enabled: boolean
  courseCode: string
  sectionId: string
  delta: string
}

export interface SchedulerOptimizerEarlyRule {
  id: string
  enabled: boolean
  days: number[]
  startMinute: number
  delta: string
}

export interface SchedulerOptimizerTimeRule {
  id: string
  enabled: boolean
  days: number[]
  startMinute: number
  endMinute: number
  state: SchedulerOptimizerTimeState
  application: SchedulerOptimizerRuleApplication
  delta: string
}

export interface SchedulerOptimizerScoreProfile {
  schemaVersion: 1
  baseScore: string
  creditDelta: string
  countRules: SchedulerOptimizerCourseCountRule[]
  courseRules: SchedulerOptimizerCourseRule[]
  sectionRules: SchedulerOptimizerSectionRule[]
  earlyRules: SchedulerOptimizerEarlyRule[]
  timeRules: SchedulerOptimizerTimeRule[]
}

export interface SchedulerOptimizerBundleSelection {
  layer: number
  bundleId: number
}

export interface SchedulerOptimizerSectionRef {
  sectionId: string
  name: string
  sectionType: string
  isMain: boolean
  layer: number
  bundleId: number
}

export interface SchedulerOptimizerCourseOption {
  id: string
  selections: SchedulerOptimizerBundleSelection[]
  lectures: SchedulerLecture[]
  sections: SchedulerOptimizerSectionRef[]
}

export interface SchedulerOptimizerCourse {
  sourceIndex: number
  code: string
  title: string
  credits: string
  options: SchedulerOptimizerCourseOption[]
}

export interface SchedulerOptimizerSelectedCourse {
  course: SchedulerOptimizerCourse
  option: SchedulerOptimizerCourseOption
}

export type SchedulerOptimizerBreakdownItem =
  | { ruleId: 'base'; kind: 'base'; amount: string }
  | {
      ruleId: 'per-credit'
      kind: 'per-credit'
      amount: string
      totalCredits: string
      creditDelta: string
    }
  | {
      ruleId: string
      kind: 'course-count'
      amount: string
      courseCount: number
    }
  | {
      ruleId: string
      kind: 'course-selection'
      amount: string
      courseCode: string
      courseTitle: string
    }
  | {
      ruleId: string
      kind: 'section-selection'
      amount: string
      courseCode: string
      sectionId: string
      sectionName: string
    }
  | {
      ruleId: string
      kind: 'early-start'
      amount: string
      startMinute: number
      quantity: number
      matchedDays: number[]
    }
  | {
      ruleId: string
      kind: 'time-window'
      amount: string
      startMinute: number
      endMinute: number
      state: SchedulerOptimizerTimeState
      application: SchedulerOptimizerRuleApplication
      quantity: number
      matchedDays: number[]
    }

export interface SchedulerOptimizerChosenCourse {
  courseCode: string
  optionId: string
  selections: SchedulerOptimizerBundleSelection[]
}

export interface SchedulerOptimizerPlan {
  key: string
  chosen: SchedulerOptimizerChosenCourse[]
  selections: PlanSelection[]
  score: string
  totalCredits: string
  courseCount: number
  breakdown: SchedulerOptimizerBreakdownItem[]
  /** Dense rank by distinct score: 1, 2, 3, ... */
  scoreRank: number
}

export interface SchedulerOptimizerProgress {
  processedWork: string
  totalWork: string
  visitedNodes: number
  feasibleCount: string
  retainedCount: number
  bestScore: string | null
}

export interface SchedulerOptimizerSolveOptions {
  courses: SchedulerOptimizerCourse[]
  minCourses: number
  maxCourses: number
  topX: number
  profile: SchedulerOptimizerScoreProfile
  signal?: AbortSignal
  onProgress?: (progress: SchedulerOptimizerProgress) => void
}

export interface SchedulerOptimizerSolveResult {
  status: 'complete' | 'cancelled' | 'no-solution'
  plans: SchedulerOptimizerPlan[]
  requestedTopX: number
  cutoffScore: string | null
  /** Number of distinct score buckets retained, never greater than requestedTopX. */
  distinctScoreCount: number
  retainedCount: number
  feasibleCount: string
  processedWork: string
  totalWork: string
  visitedNodes: number
}

type ExactDecimal = {
  coefficient: bigint
  scale: number
}

const POWERS_OF_TEN: bigint[] = [1n]

function powerOfTen(scale: number): bigint {
  while (POWERS_OF_TEN.length <= scale) {
    POWERS_OF_TEN.push(POWERS_OF_TEN[POWERS_OF_TEN.length - 1] * 10n)
  }
  return POWERS_OF_TEN[scale]
}

function normalizeDecimal(value: ExactDecimal): ExactDecimal {
  let { coefficient, scale } = value
  if (coefficient === 0n) return { coefficient: 0n, scale: 0 }
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n
    scale -= 1
  }
  return { coefficient, scale }
}

function parseDecimal(input: string, maxScale = 8): ExactDecimal {
  const text = input.trim()
  if (!/^[+-]?(?:\d+|\d+\.\d+|\.\d+)$/.test(text)) {
    throw new Error('Score values must be ordinary decimal numbers')
  }

  const sign = text.startsWith('-') ? -1n : 1n
  const unsigned = text.replace(/^[+-]/, '')
  const [whole = '0', fraction = ''] = unsigned.split('.')
  if (fraction.length > maxScale) {
    throw new Error(`Score values support at most ${maxScale} decimal places`)
  }
  if (whole.length + fraction.length > 28) {
    throw new Error('Score value is too large')
  }

  return normalizeDecimal({
    coefficient: sign * BigInt((whole || '0') + fraction),
    scale: fraction.length,
  })
}

function addDecimal(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const scale = Math.max(left.scale, right.scale)
  return normalizeDecimal({
    coefficient:
      left.coefficient * powerOfTen(scale - left.scale)
      + right.coefficient * powerOfTen(scale - right.scale),
    scale,
  })
}

function multiplyDecimal(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  return normalizeDecimal({
    coefficient: left.coefficient * right.coefficient,
    scale: left.scale + right.scale,
  })
}

function multiplyDecimalByInteger(value: ExactDecimal, quantity: number): ExactDecimal {
  return normalizeDecimal({
    coefficient: value.coefficient * BigInt(quantity),
    scale: value.scale,
  })
}

function decimalToString(value: ExactDecimal): string {
  const normalized = normalizeDecimal(value)
  if (normalized.scale === 0) return normalized.coefficient.toString()

  const negative = normalized.coefficient < 0n
  const digits = (negative ? -normalized.coefficient : normalized.coefficient)
    .toString()
    .padStart(normalized.scale + 1, '0')
  const splitAt = digits.length - normalized.scale
  return `${negative ? '-' : ''}${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`
}

function canonicalDecimal(input: string): string {
  return decimalToString(parseDecimal(input))
}

function alignCoefficient(value: ExactDecimal, scale: number): bigint {
  return value.coefficient * powerOfTen(scale - value.scale)
}

export function schedulerHhmmToMinutes(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 2400) {
    throw new Error(`Invalid scheduler time: ${value}`)
  }
  const hours = Math.floor(value / 100)
  const minutes = value % 100
  if (minutes >= 60 || (hours === 24 && minutes !== 0)) {
    throw new Error(`Invalid scheduler time: ${value}`)
  }
  return hours * 60 + minutes
}

function validateLecture(lecture: SchedulerLecture): void {
  if (!Number.isInteger(lecture.day) || lecture.day < 1 || lecture.day > 7) {
    throw new Error(`Invalid scheduler weekday: ${lecture.day}`)
  }
  const startMinute = schedulerHhmmToMinutes(lecture.start_time)
  const endMinute = schedulerHhmmToMinutes(lecture.end_time)
  if (startMinute >= endMinute) {
    throw new Error('Scheduler lecture must end after it starts')
  }
}

function lecturesOverlapBannedPeriods(
  lectures: readonly SchedulerLecture[],
  bannedPeriods: readonly (readonly boolean[])[],
): boolean {
  return lectures.some((lecture) => TIME_SLOTS.some((slot, period) => (
    lecture.start_time < slot.end
    && lecture.end_time > slot.start
    && Boolean(bannedPeriods[lecture.day - 1]?.[period])
  )))
}

function lecturesConflict(
  left: readonly SchedulerLecture[],
  right: readonly SchedulerLecture[],
): boolean {
  return left.some(leftLecture => right.some(
    rightLecture => schedulerLecturesOverlap(leftLecture, rightLecture),
  ))
}

function stableOptionId(selections: readonly SchedulerOptimizerBundleSelection[]): string {
  return JSON.stringify(selections.map(selection => [selection.layer, selection.bundleId]))
}

function combinations<T>(items: readonly T[], count: number): T[][] {
  if (count === 0) return [[]]
  if (items.length < count) return []
  return items.flatMap((item, index) => (
    combinations(items.slice(index + 1), count - 1).map(rest => [item, ...rest])
  ))
}

function products<T>(groups: readonly (readonly T[])[]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) => acc.flatMap(prefix => group.map(item => [...prefix, item])),
    [[]],
  )
}

function lecturesAreCompatible(lectures: readonly SchedulerLecture[]): boolean {
  return lectures.every((lecture, index) => (
    !lectures.slice(index + 1).some(other => schedulerLecturesOverlap(lecture, other))
  ))
}

export function buildSchedulerOptimizerCourses(
  courseList: readonly CartCourse[],
  bannedPeriods: readonly (readonly boolean[])[],
  candidateCodes: readonly string[],
): SchedulerOptimizerCourse[] {
  const courseByCode = new Map<string, { course: CartCourse; sourceIndex: number }>()
  for (let sourceIndex = 0; sourceIndex < courseList.length; sourceIndex += 1) {
    const course = courseList[sourceIndex]
    if (courseByCode.has(course.course_code)) {
      throw new Error(`Duplicate scheduler course: ${course.course_code}`)
    }
    courseByCode.set(course.course_code, { course, sourceIndex })
  }

  const requestedCodes = new Set<string>()
  const prepared: SchedulerOptimizerCourse[] = []
  for (const code of candidateCodes) {
    if (requestedCodes.has(code)) throw new Error(`Duplicate optimizer candidate: ${code}`)
    requestedCodes.add(code)
    const source = courseByCode.get(code)
    if (!source) throw new Error(`Unknown optimizer candidate: ${code}`)

    const layers = Object.entries(source.course.layers)
      .map(([layerText, bundles]) => ({ layer: Number(layerText), bundles }))
      .sort((left, right) => left.layer - right.layer)
    if (layers.some(entry => !Number.isSafeInteger(entry.layer))) {
      throw new Error(`Invalid scheduler layer in ${code}`)
    }

    type PreparedBundle = {
      bundleId: number
      layer: number
      lectures: SchedulerLecture[]
      sections: SchedulerOptimizerSectionRef[]
    }
    const prepareLayer = ({ layer, bundles }: (typeof layers)[number]): PreparedBundle[] => {
      const seenBundleIds = new Set<number>()
      return bundles
        .filter(bundle => bundle.enabled)
        .sort((left, right) => left.id - right.id)
        .map((bundle) => {
          if (!Number.isSafeInteger(bundle.id)) {
            throw new Error(`Invalid bundle id in ${code}`)
          }
          if (seenBundleIds.has(bundle.id)) {
            throw new Error(`Duplicate bundle ${bundle.id} in ${code} layer ${layer}`)
          }
          seenBundleIds.add(bundle.id)
          const lectures = bundle.sections.flatMap(section => section.lectures)
          for (const lecture of lectures) validateLecture(lecture)
          return {
            bundleId: bundle.id,
            layer,
            lectures,
            sections: bundle.sections.map(section => ({
              sectionId: section.section_id,
              name: section.name,
              sectionType: section.section_type,
              isMain: section.is_main,
              layer,
              bundleId: bundle.id,
            } satisfies SchedulerOptimizerSectionRef)),
          }
        })
        .filter(entry => !lecturesOverlapBannedPeriods(entry.lectures, bannedPeriods))
    }

    type PartialOption = Omit<SchedulerOptimizerCourseOption, 'id'>
    let partials: PartialOption[]

    if (source.course.selection_policy?.kind === 'module') {
      const moduleCandidates = new Map<string, PreparedBundle[]>()
      for (const entry of layers) {
        const bundles = prepareLayer(entry)
        for (const bundle of bundles) {
          const moduleCodes = new Set(bundle.sections.map(
            section => section.sectionType.trim().toUpperCase(),
          ))
          if (moduleCodes.size !== 1) continue
          const moduleCode = [...moduleCodes][0]
          const candidates = moduleCandidates.get(moduleCode) ?? []
          candidates.push(bundle)
          moduleCandidates.set(moduleCode, candidates)
        }
      }

      // solvePlans treats every module selection group as a choice and then
      // takes the compatible Cartesian product across all groups. Build that
      // complete course-internal product here because the ranked solver chooses
      // one whole option for each selected course.
      partials = [{ selections: [], lectures: [], sections: [] }]
      for (const group of source.course.selection_policy.groups) {
        const moduleCodes = (group.module_codes ?? []).filter(code => moduleCandidates.has(code))
        const groupOptions: PartialOption[] = []
        for (let count = group.min_select; count <= group.max_select; count += 1) {
          for (const selectedModules of combinations(moduleCodes, count)) {
            const candidateGroups = selectedModules.map(code => moduleCandidates.get(code) ?? [])
            for (const selectedCandidates of products(candidateGroups)) {
              const lectures = selectedCandidates.flatMap(candidate => candidate.lectures)
              // Unlike a standard layer bundle, a module candidate participates
              // in solvePlans' group-level compatibility check as well. This
              // therefore also catches conflicts inside one module bundle.
              if (!lecturesAreCompatible(lectures)) continue
              groupOptions.push({
                selections: selectedCandidates.map(candidate => ({
                  layer: candidate.layer,
                  bundleId: candidate.bundleId,
                })),
                lectures,
                sections: selectedCandidates.flatMap(candidate => candidate.sections),
              })
            }
          }
        }

        if (groupOptions.length === 0) {
          partials = []
          break
        }

        const next: PartialOption[] = []
        for (const partial of partials) {
          for (const option of groupOptions) {
            if (lecturesConflict(partial.lectures, option.lectures)) continue
            next.push({
              selections: [...partial.selections, ...option.selections],
              lectures: [...partial.lectures, ...option.lectures],
              sections: [...partial.sections, ...option.sections],
            })
          }
        }
        partials = next
      }
    } else {
      // A standard selected course must contribute one bundle from at least
      // one layer. Treat no-layer offerings as unavailable instead of creating
      // a zero-selection course that could not be displayed or saved.
      partials = layers.length
        ? [{ selections: [], lectures: [], sections: [] }]
        : []

      for (const entry of layers) {
        const { layer } = entry
        const available = prepareLayer(entry)
        if (available.length === 0) {
          partials = []
          break
        }

        const next: PartialOption[] = []
        for (const partial of partials) {
          for (const entry of available) {
            // A standard layer bundle is an atomic API choice. Preserve the
            // existing scheduler's semantics by checking it only against
            // bundles chosen earlier, not lectures inside the same bundle.
            if (lecturesConflict(partial.lectures, entry.lectures)) continue
            next.push({
              selections: [...partial.selections, { layer, bundleId: entry.bundleId }],
              lectures: [...partial.lectures, ...entry.lectures],
              sections: [...partial.sections, ...entry.sections],
            })
          }
        }
        partials = next
      }
    }

    prepared.push({
      sourceIndex: source.sourceIndex,
      code,
      title: source.course.course_title,
      credits: canonicalDecimal(String(source.course.term_load_credit ?? source.course.credit)),
      options: partials.map(option => ({
        ...option,
        id: stableOptionId(option.selections),
      })),
    })
  }

  return prepared
}

export function createDefaultSchedulerOptimizerScoreProfile(): SchedulerOptimizerScoreProfile {
  return {
    schemaVersion: 1,
    baseScore: '100',
    creditDelta: '1',
    countRules: [
      { id: 'count-5', enabled: true, courseCount: 5, delta: '10' },
      { id: 'count-6', enabled: true, courseCount: 6, delta: '10' },
    ],
    courseRules: [],
    sectionRules: [],
    earlyRules: [{
      id: 'early-weekdays',
      enabled: true,
      days: [1, 2, 3, 4, 5],
      startMinute: 540,
      delta: '-5',
    }],
    timeRules: [
      {
        id: 'occupied-lunch',
        enabled: true,
        days: [1, 2, 3, 4, 5],
        startMinute: 720,
        endMinute: 730,
        state: 'occupied',
        application: 'per-day',
        delta: '-5',
      },
      {
        id: 'free-lunch',
        enabled: true,
        days: [1, 2, 3, 4, 5],
        startMinute: 730,
        endMinute: 740,
        state: 'free',
        application: 'per-day',
        delta: '5',
      },
    ],
  }
}

export function validateSchedulerOptimizerScoreProfile(
  profile: SchedulerOptimizerScoreProfile,
): void {
  if (profile.schemaVersion !== 1) throw new Error('Unsupported optimizer score profile')
  parseDecimal(profile.baseScore)
  parseDecimal(profile.creditDelta)

  const ids = new Set<string>()
  const claimId = (id: string) => {
    if (!id || ids.has(id)) throw new Error('Optimizer score rule ids must be unique')
    ids.add(id)
  }

  for (const rule of profile.countRules) {
    claimId(rule.id)
    if (!Number.isSafeInteger(rule.courseCount) || rule.courseCount < 0) {
      throw new Error('Course-count rules require a non-negative integer')
    }
    parseDecimal(rule.delta)
  }
  for (const rule of profile.courseRules) {
    claimId(rule.id)
    if (!rule.courseCode) throw new Error('Course rules require a course code')
    parseDecimal(rule.delta)
  }
  for (const rule of profile.sectionRules) {
    claimId(rule.id)
    if (!rule.courseCode || !rule.sectionId) {
      throw new Error('Section rules require both a course code and section id')
    }
    parseDecimal(rule.delta)
  }
  for (const rule of profile.earlyRules) {
    claimId(rule.id)
    if (
      rule.days.length === 0
      || rule.days.some(day => !Number.isInteger(day) || day < 1 || day > 7)
      || new Set(rule.days).size !== rule.days.length
    ) {
      throw new Error('Early-start rules require at least one unique valid weekday')
    }
    if (!Number.isInteger(rule.startMinute) || rule.startMinute < 0 || rule.startMinute >= 1440) {
      throw new Error('Early-start rule has an invalid time')
    }
    parseDecimal(rule.delta)
  }
  for (const rule of profile.timeRules) {
    claimId(rule.id)
    if (
      rule.days.length === 0
      || rule.days.some(day => !Number.isInteger(day) || day < 1 || day > 7)
    ) {
      throw new Error('Time-window rules require at least one valid weekday')
    }
    if (
      !Number.isInteger(rule.startMinute)
      || !Number.isInteger(rule.endMinute)
      || rule.startMinute < 0
      || rule.endMinute > 1440
      || rule.startMinute >= rule.endMinute
    ) {
      throw new Error('Time-window rule must end after it starts')
    }
    if (rule.state !== 'occupied' && rule.state !== 'free') {
      throw new Error('Time-window rule has an invalid state')
    }
    if (!['per-day', 'any-day', 'all-days'].includes(rule.application)) {
      throw new Error('Time-window rule has an invalid application')
    }
    parseDecimal(rule.delta)
  }
}

function lectureOverlapsWindow(
  lecture: SchedulerLecture,
  day: number,
  startMinute: number,
  endMinute: number,
): boolean {
  if (lecture.day !== day) return false
  const lectureStart = schedulerHhmmToMinutes(lecture.start_time)
  const lectureEnd = schedulerHhmmToMinutes(lecture.end_time)
  return lectureStart < endMinute && lectureEnd > startMinute
}

function timeRuleMatch(
  rule: SchedulerOptimizerTimeRule,
  lectures: readonly SchedulerLecture[],
): { matchedDays: number[]; quantity: number } {
  const matchedDays = rule.days.filter((day) => {
    const occupied = lectures.some(lecture => (
      lectureOverlapsWindow(lecture, day, rule.startMinute, rule.endMinute)
    ))
    return rule.state === 'occupied' ? occupied : !occupied
  })

  let quantity = 0
  if (rule.application === 'per-day') quantity = matchedDays.length
  if (rule.application === 'any-day') quantity = matchedDays.length > 0 ? 1 : 0
  if (rule.application === 'all-days') {
    quantity = matchedDays.length === rule.days.length ? 1 : 0
  }
  return { matchedDays, quantity }
}

export function scoreSchedulerOptimizerSelection(
  selected: readonly SchedulerOptimizerSelectedCourse[],
  profile: SchedulerOptimizerScoreProfile,
): {
  score: string
  totalCredits: string
  breakdown: SchedulerOptimizerBreakdownItem[]
} {
  validateSchedulerOptimizerScoreProfile(profile)

  const selectedCodes = new Set<string>()
  for (const entry of selected) {
    if (selectedCodes.has(entry.course.code)) {
      throw new Error(`Optimizer selection contains duplicate course ${entry.course.code}`)
    }
    if (!entry.course.options.includes(entry.option)) {
      throw new Error('Optimizer selection contains an option from another course')
    }
    selectedCodes.add(entry.course.code)
  }

  let score = parseDecimal(profile.baseScore)
  let totalCredits = parseDecimal('0')
  const breakdown: SchedulerOptimizerBreakdownItem[] = [
    { ruleId: 'base', kind: 'base', amount: decimalToString(score) },
  ]

  for (const entry of selected) {
    totalCredits = addDecimal(totalCredits, parseDecimal(entry.course.credits))
  }
  const creditDelta = parseDecimal(profile.creditDelta)
  const creditContribution = multiplyDecimal(totalCredits, creditDelta)
  score = addDecimal(score, creditContribution)
  breakdown.push({
    ruleId: 'per-credit',
    kind: 'per-credit',
    amount: decimalToString(creditContribution),
    totalCredits: decimalToString(totalCredits),
    creditDelta: decimalToString(creditDelta),
  })

  for (const rule of profile.countRules) {
    if (!rule.enabled || rule.courseCount !== selected.length) continue
    const contribution = parseDecimal(rule.delta)
    score = addDecimal(score, contribution)
    breakdown.push({
      ruleId: rule.id,
      kind: 'course-count',
      amount: decimalToString(contribution),
      courseCount: rule.courseCount,
    })
  }
  for (const rule of profile.courseRules) {
    if (!rule.enabled) continue
    const match = selected.find(entry => entry.course.code === rule.courseCode)
    if (!match) continue
    const contribution = parseDecimal(rule.delta)
    score = addDecimal(score, contribution)
    breakdown.push({
      ruleId: rule.id,
      kind: 'course-selection',
      amount: decimalToString(contribution),
      courseCode: match.course.code,
      courseTitle: match.course.title,
    })
  }
  for (const rule of profile.sectionRules) {
    if (!rule.enabled) continue
    const match = selected.find(entry => (
      entry.course.code === rule.courseCode
      && entry.option.sections.some(section => section.sectionId === rule.sectionId)
    ))
    if (!match) continue
    const section = match.option.sections.find(entry => entry.sectionId === rule.sectionId)!
    const contribution = parseDecimal(rule.delta)
    score = addDecimal(score, contribution)
    breakdown.push({
      ruleId: rule.id,
      kind: 'section-selection',
      amount: decimalToString(contribution),
      courseCode: match.course.code,
      sectionId: section.sectionId,
      sectionName: section.name,
    })
  }

  const lectures = selected.flatMap(entry => entry.option.lectures)
  for (const rule of profile.earlyRules) {
    if (!rule.enabled) continue
    const matchedDays = rule.days.filter(day => lectures.some(lecture => (
      lecture.day === day
      && schedulerHhmmToMinutes(lecture.start_time) <= rule.startMinute
    )))
    if (matchedDays.length === 0) continue
    const contribution = multiplyDecimalByInteger(parseDecimal(rule.delta), matchedDays.length)
    score = addDecimal(score, contribution)
    breakdown.push({
      ruleId: rule.id,
      kind: 'early-start',
      amount: decimalToString(contribution),
      startMinute: rule.startMinute,
      quantity: matchedDays.length,
      matchedDays,
    })
  }
  for (const rule of profile.timeRules) {
    if (!rule.enabled) continue
    const matched = timeRuleMatch(rule, lectures)
    if (matched.quantity === 0) continue
    const contribution = multiplyDecimalByInteger(parseDecimal(rule.delta), matched.quantity)
    score = addDecimal(score, contribution)
    breakdown.push({
      ruleId: rule.id,
      kind: 'time-window',
      amount: decimalToString(contribution),
      startMinute: rule.startMinute,
      endMinute: rule.endMinute,
      state: rule.state,
      application: rule.application,
      quantity: matched.quantity,
      matchedDays: matched.matchedDays,
    })
  }

  return {
    score: decimalToString(score),
    totalCredits: decimalToString(totalCredits),
    breakdown,
  }
}

type TimeAtom = {
  bit: bigint
  day: number
  startMinute: number
  endMinute: number
}

type EarlyAtom = {
  bit: bigint
  day: number
  startMinute: number
}

type CompiledEarlyRule = {
  atomMask: bigint
  delta: bigint
}

type CompiledTimeRule = {
  atomCount: number
  atomMask: bigint
  application: SchedulerOptimizerRuleApplication
  delta: bigint
  state: SchedulerOptimizerTimeState
}

type CompiledFeatures = {
  earlyMask: bigint
  staticScore: bigint
  timeMask: bigint
}

type CompiledScoreState = {
  earlyMask: bigint
  staticScore: bigint
  timeMask: bigint
}

type CompiledScorer = {
  createState: () => CompiledScoreState
  extendState: (
    state: CompiledScoreState,
    selected: SchedulerOptimizerSelectedCourse,
  ) => CompiledScoreState
  formatScore: (score: bigint) => string
  scoreState: (state: CompiledScoreState, courseCount: number) => bigint
}

function addToMap<Key>(map: Map<Key, bigint>, key: Key, value: bigint): void {
  map.set(key, (map.get(key) ?? 0n) + value)
}

function popcount(value: bigint): number {
  let remaining = value
  let count = 0
  while (remaining !== 0n) {
    remaining &= remaining - 1n
    count += 1
  }
  return count
}

function compileScoreProfile(
  courses: readonly SchedulerOptimizerCourse[],
  profile: SchedulerOptimizerScoreProfile,
): CompiledScorer {
  validateSchedulerOptimizerScoreProfile(profile)

  const baseValue = parseDecimal(profile.baseScore)
  const creditDelta = parseDecimal(profile.creditDelta)
  const courseCreditValues = new Map<SchedulerOptimizerCourse, ExactDecimal>()
  for (const course of courses) {
    courseCreditValues.set(
      course,
      multiplyDecimal(parseDecimal(course.credits), creditDelta),
    )
  }

  const countRules = profile.countRules.map(rule => ({ rule, value: parseDecimal(rule.delta) }))
  const courseRules = profile.courseRules.map(rule => ({ rule, value: parseDecimal(rule.delta) }))
  const sectionRules = profile.sectionRules.map(rule => ({ rule, value: parseDecimal(rule.delta) }))
  const earlyRules = profile.earlyRules.map(rule => ({ rule, value: parseDecimal(rule.delta) }))
  const timeRules = profile.timeRules.map(rule => ({ rule, value: parseDecimal(rule.delta) }))
  const enabledValues = [
    baseValue,
    ...courseCreditValues.values(),
    ...countRules.filter(entry => entry.rule.enabled).map(entry => entry.value),
    ...courseRules.filter(entry => entry.rule.enabled).map(entry => entry.value),
    ...sectionRules.filter(entry => entry.rule.enabled).map(entry => entry.value),
    ...earlyRules.filter(entry => entry.rule.enabled).map(entry => entry.value),
    ...timeRules.filter(entry => entry.rule.enabled).map(entry => entry.value),
  ]
  const scale = enabledValues.reduce(
    (largest, value) => Math.max(largest, value.scale),
    0,
  )

  const baseScore = alignCoefficient(baseValue, scale)
  const countScore = new Map<number, bigint>()
  for (const { rule, value } of countRules) {
    if (rule.enabled) addToMap(countScore, rule.courseCount, alignCoefficient(value, scale))
  }
  const courseScore = new Map<string, bigint>()
  for (const { rule, value } of courseRules) {
    if (rule.enabled) addToMap(courseScore, rule.courseCode, alignCoefficient(value, scale))
  }
  const sectionScore = new Map<string, Map<string, bigint>>()
  for (const { rule, value } of sectionRules) {
    if (!rule.enabled) continue
    let bySection = sectionScore.get(rule.courseCode)
    if (!bySection) {
      bySection = new Map<string, bigint>()
      sectionScore.set(rule.courseCode, bySection)
    }
    addToMap(bySection, rule.sectionId, alignCoefficient(value, scale))
  }

  const earlyAtoms: EarlyAtom[] = []
  const compiledEarlyRules: CompiledEarlyRule[] = []
  for (const { rule, value } of earlyRules) {
    if (!rule.enabled) continue
    let atomMask = 0n
    for (const day of rule.days) {
      const bit = 1n << BigInt(earlyAtoms.length)
      atomMask |= bit
      earlyAtoms.push({ bit, day, startMinute: rule.startMinute })
    }
    compiledEarlyRules.push({
      atomMask,
      delta: alignCoefficient(value, scale),
    })
  }
  const timeAtoms: TimeAtom[] = []
  const compiledTimeRules: CompiledTimeRule[] = []
  for (const { rule, value } of timeRules) {
    if (!rule.enabled) continue
    let atomMask = 0n
    for (const day of rule.days) {
      const bit = 1n << BigInt(timeAtoms.length)
      atomMask |= bit
      timeAtoms.push({
        bit,
        day,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
      })
    }
    compiledTimeRules.push({
      atomCount: rule.days.length,
      atomMask,
      application: rule.application,
      delta: alignCoefficient(value, scale),
      state: rule.state,
    })
  }

  const featuresByCourse = new Map<
    SchedulerOptimizerCourse,
    Map<SchedulerOptimizerCourseOption, CompiledFeatures>
  >()
  for (const course of courses) {
    const byOption = new Map<SchedulerOptimizerCourseOption, CompiledFeatures>()
    const creditScore = alignCoefficient(courseCreditValues.get(course)!, scale)
    const selectedCourseScore = courseScore.get(course.code) ?? 0n
    for (const option of course.options) {
      let earlyMask = 0n
      for (const atom of earlyAtoms) {
        if (option.lectures.some(lecture => (
          lecture.day === atom.day
          && schedulerHhmmToMinutes(lecture.start_time) <= atom.startMinute
        ))) {
          earlyMask |= atom.bit
        }
      }

      let timeMask = 0n
      for (const atom of timeAtoms) {
        if (option.lectures.some(lecture => (
          lectureOverlapsWindow(lecture, atom.day, atom.startMinute, atom.endMinute)
        ))) {
          timeMask |= atom.bit
        }
      }

      let selectedSectionScore = 0n
      const bySection = sectionScore.get(course.code)
      if (bySection) {
        const sectionIds = new Set(option.sections.map(section => section.sectionId))
        for (const sectionId of sectionIds) {
          selectedSectionScore += bySection.get(sectionId) ?? 0n
        }
      }
      byOption.set(option, {
        earlyMask,
        staticScore: creditScore + selectedCourseScore + selectedSectionScore,
        timeMask,
      })
    }
    featuresByCourse.set(course, byOption)
  }

  const createState = (): CompiledScoreState => ({
    earlyMask: 0n,
    staticScore: 0n,
    timeMask: 0n,
  })
  const extendState = (
    state: CompiledScoreState,
    selected: SchedulerOptimizerSelectedCourse,
  ): CompiledScoreState => {
    const features = featuresByCourse.get(selected.course)?.get(selected.option)
    if (!features) throw new Error('Optimizer selection contains an uncompiled option')
    return {
      earlyMask: state.earlyMask | features.earlyMask,
      staticScore: state.staticScore + features.staticScore,
      timeMask: state.timeMask | features.timeMask,
    }
  }
  const scoreState = (state: CompiledScoreState, courseCount: number): bigint => {
    let score = baseScore + state.staticScore + (countScore.get(courseCount) ?? 0n)
    for (const rule of compiledEarlyRules) {
      const matchedCount = popcount(state.earlyMask & rule.atomMask)
      if (matchedCount !== 0) score += rule.delta * BigInt(matchedCount)
    }
    for (const rule of compiledTimeRules) {
      const occupiedMask = state.timeMask & rule.atomMask
      const matchedMask = rule.state === 'occupied'
        ? occupiedMask
        : rule.atomMask & ~occupiedMask
      const matchedCount = popcount(matchedMask)
      let quantity = 0
      if (rule.application === 'per-day') quantity = matchedCount
      if (rule.application === 'any-day') quantity = matchedCount > 0 ? 1 : 0
      if (rule.application === 'all-days') {
        quantity = matchedCount === rule.atomCount ? 1 : 0
      }
      if (quantity !== 0) score += rule.delta * BigInt(quantity)
    }
    return score
  }

  return {
    createState,
    extendState,
    formatScore: score => decimalToString({ coefficient: score, scale }),
    scoreState,
  }
}

type ConflictInfo = {
  bit: bigint
  conflictMask: bigint
}

function compileOptionConflicts(
  courses: readonly SchedulerOptimizerCourse[],
): Map<SchedulerOptimizerCourse, Map<SchedulerOptimizerCourseOption, ConflictInfo>> {
  const occurrences = courses.flatMap(course => (
    course.options.map(option => ({ course, option }))
  ))
  const infos = occurrences.map((_, index): ConflictInfo => ({
    bit: 1n << BigInt(index),
    conflictMask: 0n,
  }))

  for (let left = 0; left < occurrences.length; left += 1) {
    for (let right = left + 1; right < occurrences.length; right += 1) {
      if (occurrences[left].course === occurrences[right].course) continue
      if (!lecturesConflict(occurrences[left].option.lectures, occurrences[right].option.lectures)) {
        continue
      }
      infos[left].conflictMask |= infos[right].bit
      infos[right].conflictMask |= infos[left].bit
    }
  }

  const result = new Map<
    SchedulerOptimizerCourse,
    Map<SchedulerOptimizerCourseOption, ConflictInfo>
  >()
  for (let index = 0; index < occurrences.length; index += 1) {
    const occurrence = occurrences[index]
    let byOption = result.get(occurrence.course)
    if (!byOption) {
      byOption = new Map<SchedulerOptimizerCourseOption, ConflictInfo>()
      result.set(occurrence.course, byOption)
    }
    byOption.set(occurrence.option, infos[index])
  }
  return result
}

type SearchState = {
  index: number
  scoreState: CompiledScoreState
  selected: SchedulerOptimizerSelectedCourse[]
  optionMask: bigint
}

type ScoreBucket = {
  score: bigint
  selections: SchedulerOptimizerSelectedCourse[][]
}

class TopDistinctScoresCollector {
  readonly buckets = new Map<bigint, ScoreBucket>()
  readonly topX: number
  totalFeasible = 0n
  retainedCount = 0
  private best: bigint | null = null
  private cutoff: bigint | null = null

  constructor(topX: number) {
    this.topX = topX
  }

  add(score: bigint, selected: SchedulerOptimizerSelectedCourse[]): void {
    this.totalFeasible += 1n
    if (this.cutoff !== null && score < this.cutoff) return

    let bucket = this.buckets.get(score)
    const isNewBucket = !bucket
    if (!bucket) {
      bucket = { score, selections: [] }
      this.buckets.set(score, bucket)
    }
    bucket.selections.push(selected)
    this.retainedCount += 1
    if (this.best === null || score > this.best) this.best = score
    // Adding another tie cannot change the cutoff. Re-sorting only when a
    // distinct score appears preserves exact Top-X semantics and avoids an
    // O(bucket log bucket) cost for every retained tied plan.
    if (isNewBucket) {
      if (this.buckets.size > this.topX) this.trim()
      else this.refreshCutoff()
    }
  }

  private sortedBuckets(): ScoreBucket[] {
    return [...this.buckets.values()].sort((left, right) => (
      left.score === right.score ? 0 : left.score > right.score ? -1 : 1
    ))
  }

  private refreshCutoff(): void {
    this.cutoff = this.buckets.size === this.topX
      ? this.sortedBuckets().at(-1)!.score
      : null
  }

  private trim(): void {
    const buckets = this.sortedBuckets()
    for (const bucket of buckets.slice(this.topX)) {
      this.buckets.delete(bucket.score)
      this.retainedCount -= bucket.selections.length
    }
    this.cutoff = buckets[this.topX - 1]?.score ?? null
  }

  bestScore(): bigint | null {
    return this.best
  }

  finish(): ScoreBucket[] {
    return this.sortedBuckets()
  }
}

function createRankedWaysCounter(
  courses: readonly SchedulerOptimizerCourse[],
  minCourses: number,
  maxCourses: number,
) {
  const memo = new Map<string, bigint>()
  const count = (index: number, selected: number): bigint => {
    if (selected > maxCourses) return 0n
    if (index === courses.length) {
      return selected >= minCourses && selected <= maxCourses ? 1n : 0n
    }
    const key = `${index}:${selected}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    const result = count(index + 1, selected)
      + BigInt(courses[index].options.length) * count(index + 1, selected + 1)
    memo.set(key, result)
    return result
  }
  return count
}

function buildPlan(
  selected: readonly SchedulerOptimizerSelectedCourse[],
  profile: SchedulerOptimizerScoreProfile,
  scoreRank: number,
): SchedulerOptimizerPlan {
  const stableSelected = [...selected].sort((left, right) => (
    left.course.code.localeCompare(right.course.code, 'en')
  ))
  const chosen = stableSelected.map(entry => ({
    courseCode: entry.course.code,
    optionId: entry.option.id,
    selections: entry.option.selections.map(selection => ({ ...selection })),
  }))
  const key = `scheduler-ranked:v1:${JSON.stringify(chosen.map(entry => ({
    courseCode: entry.courseCode,
    selections: entry.selections.map(selection => [selection.layer, selection.bundleId]),
  })))}`
  const scored = scoreSchedulerOptimizerSelection(stableSelected, profile)
  const selections = stableSelected.flatMap(entry => (
    entry.option.selections.map(selection => ({
      courseIndex: entry.course.sourceIndex,
      layer: selection.layer,
      bundleId: selection.bundleId,
    }))
  ))

  return {
    key,
    chosen,
    selections,
    score: scored.score,
    totalCredits: scored.totalCredits,
    courseCount: stableSelected.length,
    breakdown: scored.breakdown,
    scoreRank,
  }
}

function finishPlans(
  collector: TopDistinctScoresCollector,
  profile: SchedulerOptimizerScoreProfile,
  scorer: CompiledScorer,
): {
  plans: SchedulerOptimizerPlan[]
  cutoffScore: string | null
  distinctScoreCount: number
} {
  const buckets = collector.finish()
  const plans: SchedulerOptimizerPlan[] = []
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index]
    const expectedScore = scorer.formatScore(bucket.score)
    const bucketPlans = bucket.selections.map((selected) => {
      const plan = buildPlan(selected, profile, index + 1)
      if (plan.score !== expectedScore) {
        throw new Error('Compiled optimizer score disagrees with full score breakdown')
      }
      return plan
    })
    bucketPlans.sort((left, right) => left.key.localeCompare(right.key, 'en'))
    plans.push(...bucketPlans)
  }
  return {
    plans,
    cutoffScore: buckets.length === collector.topX
      ? scorer.formatScore(buckets.at(-1)!.score)
      : null,
    distinctScoreCount: buckets.length,
  }
}

function emitProgress(
  options: SchedulerOptimizerSolveOptions,
  progress: Omit<SchedulerOptimizerProgress, 'bestScore'>,
  bestScore: string | null,
): void {
  options.onProgress?.({ ...progress, bestScore })
}

function yieldToHost(): Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return new Promise(resolve => setTimeout(resolve, 0))
  }
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      channel.port2.close()
      resolve()
    }
    channel.port2.postMessage(undefined)
  })
}

function validateSolveCourses(courses: readonly SchedulerOptimizerCourse[]): void {
  const codes = new Set<string>()
  for (const course of courses) {
    if (!course.code || codes.has(course.code)) {
      throw new Error(`Optimizer courses require unique non-empty codes: ${course.code}`)
    }
    codes.add(course.code)
    parseDecimal(course.credits)
    const optionIds = new Set<string>()
    for (const option of course.options) {
      if (optionIds.has(option.id)) {
        throw new Error(`Duplicate optimizer option in ${course.code}: ${option.id}`)
      }
      optionIds.add(option.id)
      for (const lecture of option.lectures) validateLecture(lecture)
    }
  }
}

export async function solveRankedScheduler(
  options: SchedulerOptimizerSolveOptions,
): Promise<SchedulerOptimizerSolveResult> {
  validateSolveCourses(options.courses)
  validateSchedulerOptimizerScoreProfile(options.profile)
  if (!Number.isSafeInteger(options.topX) || options.topX < 1) {
    throw new Error('Optimizer Top X must be a positive integer')
  }
  if (
    !Number.isSafeInteger(options.minCourses)
    || !Number.isSafeInteger(options.maxCourses)
    || options.minCourses < 0
    || options.maxCourses < options.minCourses
    || options.maxCourses > options.courses.length
  ) {
    throw new Error('Optimizer course-count range is invalid')
  }

  const countWays = createRankedWaysCounter(
    options.courses,
    options.minCourses,
    options.maxCourses,
  )
  const totalWork = countWays(0, 0)
  if (options.signal?.aborted) {
    return {
      status: 'cancelled',
      plans: [],
      requestedTopX: options.topX,
      cutoffScore: null,
      distinctScoreCount: 0,
      retainedCount: 0,
      feasibleCount: '0',
      processedWork: '0',
      totalWork: totalWork.toString(),
      visitedNodes: 0,
    }
  }

  const scorer = compileScoreProfile(options.courses, options.profile)
  const conflicts = compileOptionConflicts(options.courses)
  const stack: SearchState[] = [{
    index: 0,
    scoreState: scorer.createState(),
    selected: [],
    optionMask: 0n,
  }]
  const collector = new TopDistinctScoresCollector(options.topX)
  let processedWork = 0n
  let visitedNodes = 0
  let lastProgressAt = 0

  const currentBest = () => {
    const best = collector.bestScore()
    return best === null ? null : scorer.formatScore(best)
  }
  const resultFromCollector = (status: SchedulerOptimizerSolveResult['status']) => {
    const finished = finishPlans(collector, options.profile, scorer)
    return {
      status,
      plans: finished.plans,
      requestedTopX: options.topX,
      cutoffScore: finished.cutoffScore,
      distinctScoreCount: finished.distinctScoreCount,
      retainedCount: finished.plans.length,
      feasibleCount: collector.totalFeasible.toString(),
      processedWork: processedWork.toString(),
      totalWork: totalWork.toString(),
      visitedNodes,
    } satisfies SchedulerOptimizerSolveResult
  }
  const cancelledResult = () => ({
    status: 'cancelled' as const,
    // Partial plans are deliberately not materialized. They are not a valid
    // exhaustive result, the UI discards them, and building every tied plan
    // here could make a cancellation take longer than the search itself.
    plans: [],
    requestedTopX: options.topX,
    cutoffScore: null,
    distinctScoreCount: 0,
    retainedCount: 0,
    feasibleCount: collector.totalFeasible.toString(),
    processedWork: processedWork.toString(),
    totalWork: totalWork.toString(),
    visitedNodes,
  } satisfies SchedulerOptimizerSolveResult)

  while (stack.length > 0) {
    if (options.signal?.aborted) return cancelledResult()

    const chunkStartedAt = Date.now()
    let chunkNodes = 0
    while (stack.length > 0 && chunkNodes < 2500 && Date.now() - chunkStartedAt < 12) {
      const state = stack.pop()!
      visitedNodes += 1
      chunkNodes += 1

      if (state.index === options.courses.length) {
        if (
          state.selected.length >= options.minCourses
          && state.selected.length <= options.maxCourses
        ) {
          processedWork += 1n
          collector.add(
            scorer.scoreState(state.scoreState, state.selected.length),
            state.selected,
          )
        }
        continue
      }

      if (
        state.selected.length > options.maxCourses
        || state.selected.length + (options.courses.length - state.index) < options.minCourses
      ) {
        continue
      }

      const course = options.courses[state.index]
      stack.push({
        index: state.index + 1,
        scoreState: state.scoreState,
        selected: state.selected,
        optionMask: state.optionMask,
      })
      if (state.selected.length >= options.maxCourses) continue

      for (const option of course.options) {
        const conflict = conflicts.get(course)?.get(option)
        if (!conflict) throw new Error('Optimizer option is missing conflict metadata')
        if ((state.optionMask & conflict.conflictMask) !== 0n) {
          processedWork += countWays(state.index + 1, state.selected.length + 1)
          continue
        }
        const selected = { course, option }
        stack.push({
          index: state.index + 1,
          scoreState: scorer.extendState(state.scoreState, selected),
          selected: [...state.selected, selected],
          optionMask: state.optionMask | conflict.bit,
        })
      }
    }

    const now = Date.now()
    if (now - lastProgressAt > 80 || stack.length === 0) {
      emitProgress(options, {
        processedWork: processedWork.toString(),
        totalWork: totalWork.toString(),
        visitedNodes,
        feasibleCount: collector.totalFeasible.toString(),
        retainedCount: collector.retainedCount,
      }, currentBest())
      lastProgressAt = now
    }
    if (stack.length > 0) await yieldToHost()
  }

  processedWork = totalWork
  return resultFromCollector(collector.totalFeasible > 0n ? 'complete' : 'no-solution')
}
