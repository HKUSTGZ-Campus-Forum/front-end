// --- Types ---

export interface SchedulerLecture {
  day: number
  start_time: number
  end_time: number
  room: string
  instructor: string
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
  points: SchedulerPopularityHistoryPoint[]
}

export type SchedulerPopularityHistoryRange = '24h' | '7d' | '30d' | 'all'
export type SchedulerPopularityHistoryDataState = 'not-started' | 'empty' | 'ready'
export type SchedulerPopularityHistoryAccessKind = 'authentication' | 'authorization' | 'scope'

export const POPULARITY_HISTORY_SEMESTER_ID = '2610'
export const POPULARITY_HISTORY_CAMPAIGN_START = '2026-08-12T00:00:00.000Z'
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
}

export interface SchedulerPopularityHistorySeries {
  looking: SchedulerPopularityHistoryChartPoint[]
  scheduling: SchedulerPopularityHistoryChartPoint[]
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
 * Insert explicit null samples so time-series charts do not draw lines across
 * periods where no snapshot was recorded.
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

  let previousTimestamp: number | null = null
  let previousBucket: number | null = null
  for (const point of points) {
    const bucket = Math.floor(point.timestamp / intervalMs)
    if (previousTimestamp !== null && previousBucket !== null && bucket - previousBucket > 1) {
      const gapTimestamp = previousTimestamp + intervalMs
      looking.push({ x: gapTimestamp, y: null })
      scheduling.push({ x: gapTimestamp, y: null })
    }
    looking.push({ x: point.timestamp, y: point.looking_count })
    scheduling.push({ x: point.timestamp, y: point.scheduling_count })
    previousTimestamp = point.timestamp
    previousBucket = bucket
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

export type SolverResult =
  | { status: 'ok'; plans: PlanSelection[][] }
  | { status: 'empty-cart'; plans: [] }
  | { status: 'all-disabled'; plans: [] }
  | { status: 'unavailable-layer'; plans: []; courseCode: string; layer: number }
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

export function solvePlans(courseList: CartCourse[], bannedPeriods: boolean[][]): SolverResult {
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

  function canPlace(lectures: SchedulerLecture[]) {
    return lectures.every(lecture =>
      !(bucket.get(lecture.day) || []).some(slot =>
        lecture.start_time < slot.end && lecture.end_time > slot.start,
      ),
    )
  }

  function search(index: number) {
    if (index === choices.length) {
      plans.push(selected.map(selection => ({ ...selection })))
      return
    }

    for (const bundle of choices[index].bundles) {
      if (!canPlace(bundle.lectures)) continue
      for (const lecture of bundle.lectures) {
        if (!bucket.has(lecture.day)) bucket.set(lecture.day, [])
        bucket.get(lecture.day)!.push({ start: lecture.start_time, end: lecture.end_time })
      }
      selected.push(bundle.selection)
      search(index + 1)
      selected.pop()
      for (const lecture of bundle.lectures) bucket.get(lecture.day)!.pop()
    }
  }

  search(0)
  return plans.length ? { status: 'ok', plans } : { status: 'no-solution', plans: [] }
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
  return timeToHours(startTime) - 9
}

export function getHeight(startTime: number, endTime: number): number {
  return timeToHours(endTime) - timeToHours(startTime)
}

export function getCourseColor(index: number, isDark: boolean = false): string {
  const hue = (index * 137.5) % 360
  const sat = isDark ? 55 : 65
  const light = isDark ? 45 : 55
  return `hsl(${hue}, ${sat}%, ${light}%)`
}
