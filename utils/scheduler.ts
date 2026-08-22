// --- Types ---

export interface SchedulerLecture {
  day: number
  start_time: number
  end_time: number
  room: string
  instructor: string
}

export interface SchedulerMapPoint {
  x_coordinate: number
  y_coordinate: number
}

export interface SchedulerSection {
  semester_id: string
  section_id: string
  name: string
  bundle: number
  layer: number
  quota: number
  section_type: string
  is_main: boolean
  lectures: SchedulerLecture[]
}

export interface CourseDetail {
  course_code: string
  course_title: string
  course_title_abbr: string | null
  credit: number
  subject: string | null
  catalog_number: string | null
  course_desc: string | null
  pre_requirement: string | null
  co_requirement: string | null
  exclusion: string | null
  pg_course: boolean
  klms_course: boolean
  sections: SchedulerSection[]
}

export interface BundleData {
  id: number
  layer: number
  enabled: boolean
  sections: SchedulerSection[]
}

/** Keep the official section name intact so alternatives such as LA2A/LA2B
 * remain distinguishable in the scheduler side panel. */
export function getSchedulerBundleLabel(bundle: BundleData): string {
  return bundle.sections
    .map(section => section.name.trim() || `${section.section_type}${section.bundle}`)
    .join('/')
}

export interface CartCourse {
  course_code: string
  course_title: string
  credit: number
  subject: string | null
  pg_course: boolean
  klms_course: boolean
  enabled: boolean
  layers: Record<number, BundleData[]>
}

export interface SearchResult {
  course_code: string
  course_title: string
  credit: number
  subject: string | null
}

export interface SearchResponse {
  total: number
  page: number
  page_size: number
  items: SearchResult[]
}

export interface SchedulerSubject {
  subject: string
  course_count: number
}

export interface SemesterInfo {
  id: string
  name: string
  name_zh: string
  section_count: number
}

export type SchedulerPlanVisibility = 'private' | 'unlisted' | 'public'
export type SchedulerPlanAvailability = 'current' | 'updated' | 'unavailable'

export interface SchedulerPlanAuthor {
  id: number
  username: string
  avatar_url: string | null
}

export interface SchedulerSavedPlan {
  public_id: string
  semester_id: string
  name: string
  description: string
  visibility: SchedulerPlanVisibility
  version: number
  availability: SchedulerPlanAvailability
  course_codes: string[]
  course_count: number
  total_credits: number
  author: SchedulerPlanAuthor
  is_owner: boolean
  can_copy: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  courses: CartCourse[]
  selections: PlanSelection[]
  banned_periods?: boolean[][]
}

export interface SchedulerPlanCourseInput {
  course_code: string
  selections: Array<{ bundle_id: number; layer: number }>
}

export interface SchedulerPlanWriteInput {
  name: string
  description: string
  semester_id: string
  visibility: SchedulerPlanVisibility
  courses: SchedulerPlanCourseInput[]
  banned_periods: boolean[][]
  version?: number
}

export interface SchedulerSharedPlanResponse {
  plans: SchedulerSavedPlan[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface SchedulerPopularityCounts {
  looking_count: number
  scheduling_count: number
}

export interface SchedulerSectionPopularity extends SchedulerPopularityCounts {
  section_id: string
}

export interface SchedulerCoursePopularity extends SchedulerPopularityCounts {
  course_code: string
  sections: SchedulerSectionPopularity[]
}

export interface SchedulerPopularityResponse {
  semester_id: string
  generated_at: string
  courses: SchedulerCoursePopularity[]
}

export interface SchedulerPopularityHistoryPoint extends SchedulerPopularityCounts {
  sampled_at: string
  observed_at: string
}

export type SchedulerPopularityHistorySamplingState =
  | 'not_started'
  | 'fresh'
  | 'stale'
  | 'ended_complete'
  | 'ended_incomplete'

export interface SchedulerPopularityHistoryCoverageBucket {
  bucket_at: string
  expected_samples: number
  observed_samples: number
  partial: boolean
}

export interface SchedulerPopularityHistoryResponse {
  semester_id: string
  course_code: string
  section_id: string | null
  tracking_started_at: string | null
  tracking_ends_at: string
  source_interval_seconds: number
  effective_interval_seconds: number
  generated_at: string
  latest_scheduled_sample_at: string | null
  latest_observed_sample_at: string | null
  requested_coverage_end_at: string
  sampling_state: SchedulerPopularityHistorySamplingState
  terminal_present: boolean
  coverage_buckets: SchedulerPopularityHistoryCoverageBucket[]
  points: SchedulerPopularityHistoryPoint[]
}

export type SchedulerPopularityHistoryRange = '24h' | '7d' | '30d' | 'all'
export type SchedulerPopularityHistoryDataState = 'not-started' | 'empty' | 'ready'
export type SchedulerPopularityHistoryAccessKind = 'authentication' | 'authorization' | 'scope'

export const POPULARITY_HISTORY_SEMESTER_ID = '2610'
export const POPULARITY_HISTORY_CAMPAIGN_START = '2026-07-31T16:00:00.000Z'
export const POPULARITY_HISTORY_CAMPAIGN_END = '2026-09-30T15:59:00.000Z'
export const POPULARITY_HISTORY_REFRESH_INTERVAL_MS = 5 * 60 * 1000
export const POPULARITY_HISTORY_REFRESH_DELAY_MS = 10 * 1000
export const POPULARITY_HISTORY_TERMINAL_SETTLE_MS = 130 * 1000

export class SchedulerPopularityHistoryAccessError extends Error {
  readonly name = 'SchedulerPopularityHistoryAccessError'

  constructor(
    readonly kind: SchedulerPopularityHistoryAccessKind,
    readonly status: 401 | 403 | 404,
  ) {
    super(`Scheduler popularity history access failed (${status})`)
  }
}

export interface SchedulerPopularityHistoryChartPoint {
  x: number
  y: number | null
  partial?: boolean
  observedAt?: number
}

export interface SchedulerPopularityHistorySeries {
  looking: SchedulerPopularityHistoryChartPoint[]
  scheduling: SchedulerPopularityHistoryChartPoint[]
}

export interface SchedulerPopularityHistoryCoverageSummary {
  expectedSamples: number
  observedSamples: number
  missingBuckets: number
  partialBuckets: number
  trailingMissingBuckets: number
  trailingPartial: boolean
  hasIncompleteCoverage: boolean
}

export interface SchedulerPopularityHistoryTableRow extends SchedulerPopularityHistoryCoverageBucket {
  point?: SchedulerPopularityHistoryPoint
  state: 'complete' | 'partial' | 'missing'
}

export function buildPopularityHistoryTableRows(
  response: SchedulerPopularityHistoryResponse,
): SchedulerPopularityHistoryTableRow[] {
  const intervalMs = Math.max(1, response.effective_interval_seconds) * 1000
  const pointsByBucket = new Map<number, SchedulerPopularityHistoryPoint>()
  for (const point of response.points) {
    const timestamp = Date.parse(point.sampled_at)
    if (Number.isFinite(timestamp)) pointsByBucket.set(Math.floor(timestamp / intervalMs), point)
  }

  return [...response.coverage_buckets]
    .filter(bucket => bucket.expected_samples > 0 && Number.isFinite(Date.parse(bucket.bucket_at)))
    .sort((a, b) => Date.parse(b.bucket_at) - Date.parse(a.bucket_at))
    .map((bucket) => {
      const point = pointsByBucket.get(Math.floor(Date.parse(bucket.bucket_at) / intervalMs))
      const state = bucket.observed_samples <= 0 || !point
        ? 'missing'
        : bucket.partial || bucket.observed_samples < bucket.expected_samples
          ? 'partial'
          : 'complete'
      return { ...bucket, point, state }
    })
}

export function formatPopularityHistoryTooltipValue(
  value: unknown,
  missingLabel: string,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return missingLabel
  return String(Math.max(0, Math.round(value)))
}

export interface IndexedSchedulerCoursePopularity extends SchedulerPopularityCounts {
  course_code: string
  sections: Record<string, SchedulerPopularityCounts>
}

export type SchedulerPopularityByCourse = Record<string, IndexedSchedulerCoursePopularity>

export function schedulerCourseKey(courseCode: string): string {
  return courseCode.replace(/\s+/g, '').toUpperCase()
}

export function indexSchedulerPopularity(
  response: SchedulerPopularityResponse,
): SchedulerPopularityByCourse {
  const indexed: SchedulerPopularityByCourse = {}

  for (const course of response.courses) {
    const sections: Record<string, SchedulerPopularityCounts> = {}
    for (const section of course.sections) {
      sections[section.section_id] = {
        looking_count: section.looking_count,
        scheduling_count: section.scheduling_count,
      }
    }
    indexed[schedulerCourseKey(course.course_code)] = {
      course_code: course.course_code,
      looking_count: course.looking_count,
      scheduling_count: course.scheduling_count,
      sections,
    }
  }

  return indexed
}

export function getSchedulerCoursePopularity(
  popularity: SchedulerPopularityByCourse,
  courseCode: string,
): IndexedSchedulerCoursePopularity | undefined {
  return popularity[schedulerCourseKey(courseCode)]
}

export function getPopularityHistoryWindow(
  range: SchedulerPopularityHistoryRange,
  now: Date = new Date(),
): { from: string; to: string } {
  const campaignStartMs = Date.parse(POPULARITY_HISTORY_CAMPAIGN_START)
  const campaignEndMs = Date.parse(POPULARITY_HISTORY_CAMPAIGN_END)
  const boundedNowMs = Math.min(
    campaignEndMs,
    Math.max(campaignStartMs, now.getTime()),
  )
  const to = new Date(boundedNowMs).toISOString()
  if (range === 'all') {
    return { from: POPULARITY_HISTORY_CAMPAIGN_START, to }
  }

  const durationMs = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }[range]
  const fromMs = Math.max(campaignStartMs, boundedNowMs - durationMs)
  return { from: new Date(fromMs).toISOString(), to }
}

export function getNextPopularityHistoryRefreshDelay(
  nowMs: number = Date.now(),
  intervalMs: number = POPULARITY_HISTORY_REFRESH_INTERVAL_MS,
  delayMs: number = POPULARITY_HISTORY_REFRESH_DELAY_MS,
): number | null {
  const campaignEndMs = Date.parse(POPULARITY_HISTORY_CAMPAIGN_END)
  const terminalRefreshAtMs = campaignEndMs + Math.max(
    delayMs,
    POPULARITY_HISTORY_TERMINAL_SETTLE_MS,
  )
  if (
    !Number.isFinite(nowMs)
    || !Number.isFinite(intervalMs)
    || !Number.isFinite(delayMs)
    || intervalMs <= 0
    || delayMs < 0
    || nowMs >= terminalRefreshAtMs
  ) {
    return null
  }

  const currentBoundaryMs = Math.floor(nowMs / intervalMs) * intervalMs
  if (nowMs >= campaignEndMs) return terminalRefreshAtMs - nowMs
  let refreshAtMs = currentBoundaryMs + delayMs
  if (refreshAtMs <= nowMs) refreshAtMs += intervalMs
  // The required 23:59 terminal sample is intentionally not aligned to the
  // regular five-minute cadence. Ensure an already-open chart fetches it once,
  // after the terminal sampler's bounded commit window, then stops refreshing.
  refreshAtMs = Math.min(refreshAtMs, terminalRefreshAtMs)
  return refreshAtMs - nowMs
}

export function getPopularityHistoryDataState(
  response: SchedulerPopularityHistoryResponse,
): SchedulerPopularityHistoryDataState {
  if (response.points.length > 0) return 'ready'
  return response.tracking_started_at === null ? 'not-started' : 'empty'
}

/**
 * Treat a contradictory terminal-complete response as incomplete. This keeps
 * the UI conservative if a response is produced during a rolling deployment.
 */
export function getPopularityHistoryDisplaySamplingState(
  response: SchedulerPopularityHistoryResponse,
): SchedulerPopularityHistorySamplingState {
  if (response.sampling_state === 'ended_complete' && !response.terminal_present) {
    return 'ended_incomplete'
  }
  return response.sampling_state
}

export function summarizePopularityHistoryCoverage(
  response: SchedulerPopularityHistoryResponse,
): SchedulerPopularityHistoryCoverageSummary {
  const buckets = [...(response.coverage_buckets || [])]
    .map(bucket => ({ ...bucket, timestamp: Date.parse(bucket.bucket_at) }))
    .filter(bucket => Number.isFinite(bucket.timestamp) && bucket.expected_samples > 0)
    .sort((a, b) => a.timestamp - b.timestamp)
  let expectedSamples = 0
  let observedSamples = 0
  let missingBuckets = 0
  let partialBuckets = 0

  for (const bucket of buckets) {
    const expected = Math.max(0, Math.trunc(bucket.expected_samples))
    const observed = Math.max(0, Math.min(expected, Math.trunc(bucket.observed_samples)))
    expectedSamples += expected
    observedSamples += observed
    if (observed === 0) missingBuckets += 1
    else if (bucket.partial || observed < expected) partialBuckets += 1
  }

  let trailingMissingBuckets = 0
  for (let index = buckets.length - 1; index >= 0; index -= 1) {
    if (buckets[index].observed_samples > 0) break
    trailingMissingBuckets += 1
  }
  const lastBucket = buckets.at(-1)
  const trailingPartial = Boolean(
    lastBucket
    && lastBucket.observed_samples > 0
    && (lastBucket.partial || lastBucket.observed_samples < lastBucket.expected_samples),
  )

  return {
    expectedSamples,
    observedSamples,
    missingBuckets,
    partialBuckets,
    trailingMissingBuckets,
    trailingPartial,
    hasIncompleteCoverage: missingBuckets > 0 || partialBuckets > 0,
  }
}

/**
 * Build chart points from the server's authoritative coverage buckets. A
 * completely unobserved bucket is a gap. A partially observed bucket keeps its
 * real last-value point and ends the current segment immediately afterward so
 * the chart cannot imply complete forward coverage.
 */
export function buildPopularityHistorySeries(
  response: SchedulerPopularityHistoryResponse,
): SchedulerPopularityHistorySeries {
  const looking: SchedulerPopularityHistoryChartPoint[] = []
  const scheduling: SchedulerPopularityHistoryChartPoint[] = []
  const intervalMs = Math.max(1, response.effective_interval_seconds) * 1000
  const points = [...response.points]
    .map(point => ({ ...point, timestamp: Date.parse(point.sampled_at) }))
    .filter(point => Number.isFinite(point.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)

  const pointsByBucket = new Map<number, (typeof points)[number]>()
  for (const point of points) {
    pointsByBucket.set(Math.floor(point.timestamp / intervalMs), point)
  }
  const coverage = [...(response.coverage_buckets || [])]
    .map(bucket => ({ ...bucket, timestamp: Date.parse(bucket.bucket_at) }))
    .filter(bucket => Number.isFinite(bucket.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)

  const append = (
    timestamp: number,
    lookingValue: number | null,
    schedulingValue: number | null,
    partial = false,
    observedAt?: number,
  ) => {
    const previous = looking.at(-1)
    if (previous?.x === timestamp) {
      previous.y = lookingValue
      previous.partial = partial || undefined
      previous.observedAt = observedAt
      const previousScheduling = scheduling.at(-1)
      if (previousScheduling) {
        previousScheduling.y = schedulingValue
        previousScheduling.partial = partial || undefined
        previousScheduling.observedAt = observedAt
      }
      return
    }
    const metadata = {
      ...(partial ? { partial: true } : {}),
      ...(observedAt !== undefined ? { observedAt } : {}),
    }
    looking.push({ x: timestamp, y: lookingValue, ...metadata })
    scheduling.push({ x: timestamp, y: schedulingValue, ...metadata })
  }
  const requestedEndMs = Date.parse(response.requested_coverage_end_at)
  const generatedAtMs = Date.parse(response.generated_at)
  const coverageEndMs = Math.min(
    Number.isFinite(requestedEndMs) ? requestedEndMs : Number.POSITIVE_INFINITY,
    Number.isFinite(generatedAtMs) ? generatedAtMs : Number.POSITIVE_INFINITY,
  )

  for (const bucket of coverage) {
    if (bucket.expected_samples <= 0) continue
    const bucketNumber = Math.floor(bucket.timestamp / intervalMs)
    const point = pointsByBucket.get(bucketNumber)
    const missing = bucket.observed_samples <= 0 || !point
    if (missing) {
      append(bucket.timestamp, null, null)
      const bucketEnd = Math.min(bucket.timestamp + intervalMs - 1, coverageEndMs)
      if (bucketEnd > bucket.timestamp) append(bucketEnd, null, null)
      continue
    }

    const partial = bucket.partial || bucket.observed_samples < bucket.expected_samples
    if (partial) {
      append(point.timestamp - 1, null, null)
    }
    const observedAt = Date.parse(point.observed_at)
    append(
      point.timestamp,
      point.looking_count,
      point.scheduling_count,
      partial,
      Number.isFinite(observedAt) ? observedAt : undefined,
    )
    if (partial) {
      const afterTimestamp = Math.min(bucket.timestamp + intervalMs - 1, coverageEndMs)
      if (afterTimestamp > point.timestamp) append(afterTimestamp, null, null)
    }
  }

  return { looking, scheduling }
}

// --- Constants ---

export const SEMESTER_IDS = ['2430', '2440', '2510', '2530'] as const

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const TIME_SLOTS = [
  { start: 900, end: 1030, label: '09:00' },
  { start: 1030, end: 1200, label: '10:30' },
  { start: 1200, end: 1330, label: '12:00' },
  { start: 1330, end: 1500, label: '13:30' },
  { start: 1500, end: 1630, label: '15:00' },
  { start: 1630, end: 1800, label: '16:30' },
  { start: 1800, end: 1930, label: '18:00' },
  { start: 1930, end: 2100, label: '19:30' },
]

// --- Plan Solver ---

export interface PlanSelection {
  courseIndex: number
  bundleId: number
  layer: number
}

export const SCHEDULER_PLAN_LIMIT = 1000
export const SCHEDULER_SEARCH_NODE_LIMIT = 100_000

export interface SolverOptions {
  maxPlans?: number
  maxSearchNodes?: number
}

export type SolverTruncationReason = 'plan-limit' | 'search-limit'

export type SolverResult =
  | {
      status: 'ok'
      plans: PlanSelection[][]
      truncated: boolean
      truncationReason: SolverTruncationReason | null
      limit: number
      searchNodeLimit: number
    }
  | { status: 'empty-cart'; plans: [] }
  | { status: 'all-disabled'; plans: [] }
  | { status: 'unavailable-layer'; plans: []; courseCode: string; layer: number }
  | { status: 'search-limit'; plans: []; searchNodeLimit: number }
  | { status: 'no-solution'; plans: [] }

function overlapsBanned(lectures: SchedulerLecture[], bannedPeriods: boolean[][]): boolean {
  return lectures.some((lecture) => {
    for (let period = 0; period < TIME_SLOTS.length; period++) {
      const slot = TIME_SLOTS[period]
      if (
        lecture.start_time < slot.end &&
        lecture.end_time > slot.start &&
        bannedPeriods[lecture.day - 1]?.[period]
      ) {
        return true
      }
    }
    return false
  })
}

export function solvePlans(
  courseList: CartCourse[],
  bannedPeriods: boolean[][],
  options: SolverOptions = {},
): SolverResult {
  const limit = options.maxPlans ?? SCHEDULER_PLAN_LIMIT
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('maxPlans must be a positive integer')
  }
  const searchNodeLimit = options.maxSearchNodes ?? SCHEDULER_SEARCH_NODE_LIMIT
  if (!Number.isSafeInteger(searchNodeLimit) || searchNodeLimit < 1) {
    throw new RangeError('maxSearchNodes must be a positive integer')
  }

  if (courseList.length === 0) return { status: 'empty-cart', plans: [] }

  const enabledCourses = courseList
    .map((course, courseIndex) => ({ course, courseIndex }))
    .filter(({ course }) => course.enabled)
  if (enabledCourses.length === 0) return { status: 'all-disabled', plans: [] }

  const choices: {
    courseIndex: number
    courseCode: string
    layer: number
    bundles: { selection: PlanSelection; lectures: SchedulerLecture[] }[]
  }[] = []

  for (const { course, courseIndex } of enabledCourses) {
    const layers = Object.entries(course.layers)
      .map(([layerText, bundles]) => ({ layer: Number(layerText), bundles }))
      .sort((a, b) => a.layer - b.layer)

    for (const { layer, bundles: layerBundles } of layers) {
      const bundles = layerBundles
        .filter(bundle => bundle.enabled)
        .map(bundle => ({
          selection: { courseIndex, layer, bundleId: bundle.id },
          lectures: bundle.sections.flatMap(section => section.lectures),
        }))
        .filter(bundle => !overlapsBanned(bundle.lectures, bannedPeriods))

      if (bundles.length === 0) {
        return { status: 'unavailable-layer', plans: [], courseCode: course.course_code, layer }
      }
      choices.push({ courseIndex, courseCode: course.course_code, layer, bundles })
    }
  }

  const plans: PlanSelection[][] = []
  const bucket = new Map<number, { start: number; end: number }[]>()
  const selected: PlanSelection[] = []
  let searchNodes = 0
  let truncationReason: SolverTruncationReason | null = null

  function canPlace(lectures: SchedulerLecture[]) {
    return lectures.every(lecture =>
      !(bucket.get(lecture.day) || []).some(slot =>
        lecture.start_time < slot.end && lecture.end_time > slot.start,
      ),
    )
  }

  function search(index: number): boolean {
    if (index === choices.length) {
      if (plans.length >= limit) {
        truncationReason = 'plan-limit'
        return true
      }
      plans.push(selected.map(selection => ({ ...selection })))
      return false
    }

    for (const bundle of choices[index].bundles) {
      if (searchNodes >= searchNodeLimit) {
        truncationReason = 'search-limit'
        return true
      }
      searchNodes += 1
      if (!canPlace(bundle.lectures)) continue
      for (const lecture of bundle.lectures) {
        if (!bucket.has(lecture.day)) bucket.set(lecture.day, [])
        bucket.get(lecture.day)!.push({ start: lecture.start_time, end: lecture.end_time })
      }
      selected.push(bundle.selection)
      const shouldStop = search(index + 1)
      selected.pop()
      for (const lecture of bundle.lectures) bucket.get(lecture.day)!.pop()
      if (shouldStop) return true
    }
    return false
  }

  search(0)
  if (plans.length) {
    return {
      status: 'ok',
      plans,
      truncated: truncationReason !== null,
      truncationReason,
      limit,
      searchNodeLimit,
    }
  }
  return truncationReason === 'search-limit'
    ? { status: 'search-limit', plans: [], searchNodeLimit }
    : { status: 'no-solution', plans: [] }
}

export function getMaxDayNum(courseList: CartCourse[], plan: PlanSelection[]): number {
  let maxDay = 5
  for (const selection of plan) {
    const bundle = courseList[selection.courseIndex]?.layers[selection.layer]
      ?.find(item => item.id === selection.bundleId)
    for (const section of bundle?.sections || []) {
      for (const lecture of section.lectures) maxDay = Math.max(maxDay, lecture.day)
    }
  }
  return maxDay
}

// --- Time Helpers ---

export function timeToHours(time: number): number {
  const h = Math.floor(time / 100)
  const m = time % 100
  return h + m / 60
}

export function getTopOffset(startTime: number): number {
  const scheduleStart = timeToHours(TIME_SLOTS[0].start)
  const slotDuration = timeToHours(TIME_SLOTS[0].end) - scheduleStart
  return (timeToHours(startTime) - scheduleStart) / slotDuration
}

export function getHeight(startTime: number, endTime: number): number {
  const slotDuration = timeToHours(TIME_SLOTS[0].end) - timeToHours(TIME_SLOTS[0].start)
  return (timeToHours(endTime) - timeToHours(startTime)) / slotDuration
}

export function getSchedulerMapLinePath(
  start: SchedulerMapPoint,
  end: SchedulerMapPoint,
  elbowX: number,
): string {
  return `M ${start.x_coordinate},${start.y_coordinate} H ${elbowX} V ${end.y_coordinate} H ${end.x_coordinate}`
}

export interface CourseTimetableColors {
  background: string
  text: string
  accent: string
}

/**
 * Soft pastel palette for timetable blocks, mirroring the original planner:
 * a light tinted background with dark text in both light and dark themes.
 */
export function getCourseTimetableColors(index: number, isDark: boolean = false): CourseTimetableColors {
  const hue = (index * 137.5) % 360
  const sat = isDark ? 25 : 40
  const light = isDark ? 70 : 85
  return {
    background: `hsl(${hue}, ${sat}%, ${light}%)`,
    text: `hsl(${hue}, ${sat}%, 30%)`,
    accent: `hsl(${hue}, 20%, 38%)`,
  }
}

export function getCourseColor(index: number, isDark: boolean = false): string {
  return getCourseTimetableColors(index, isDark).background
}

// --- Timetable block: inline section label layout ---

// These mirror the actual CSS in a timetable block card:
//  - the card's width is inset from its day column: `width: dayColWidth - 4`
//  - the card has `padding: 6px 10px`, so 10px of horizontal padding per side
//  - the top row is a flex row with `gap: 2px` between code and section label
export const TIMETABLE_CARD_INSET = 4
export const TIMETABLE_CARD_PADDING = 10
export const TIMETABLE_TOP_ROW_GAP = 2

/**
 * The inline label appended after a timetable block's course code, e.g.
 * `\u00a0· LEC-03 (12345)`. This must match the template's
 * `&nbsp;· {{ sectionName }} ({{ sectionId }})` characters and spacing exactly
 * so width measurements are meaningful.
 */
export function formatInlineSectionLabel(sectionName: string, sectionId: string): string {
  return `\u00a0· ${sectionName} (${sectionId})`
}

/**
 * Decide whether a timetable block may place its section label inline next to
 * the course code on the same line. The block's horizontal content budget is
 * derived from the day-column width minus the card inset and horizontal
 * padding, and is compared against the combined rendered width of the code,
 * the row gap and the section label.
 *
 * `measure` returns the rendered pixel width of a text string under the exact
 * font the block uses; it is injected so this predicate stays a pure function
 * and is trivially unit-testable.
 */
export function canInlineSection(
  dayColumnWidth: number,
  code: string,
  sectionLabel: string,
  measure: (text: string) => number,
): boolean {
  const contentWidth =
    dayColumnWidth - TIMETABLE_CARD_INSET - TIMETABLE_CARD_PADDING * 2
  const combinedWidth =
    measure(code) + TIMETABLE_TOP_ROW_GAP + measure(sectionLabel)
  return combinedWidth <= contentWidth
}
