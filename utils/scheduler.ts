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
