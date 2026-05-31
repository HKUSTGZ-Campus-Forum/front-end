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

export const FREQUENT_SUBJECTS = ['MOES', 'UCUG', 'UFUG', 'AIAA', 'DSAA', 'SMMG']

// --- Plan Solver ---

export function solvePlans(
  courseList: CartCourse[],
  bannedPeriods: boolean[][]
): { courseIndex: number; bundleId: number; layer: number }[][] {
  const enabledCourses = courseList
    .map((course, idx) => ({ course, idx }))
    .filter(({ course }) => course.enabled)

  if (enabledCourses.length === 0) return []

  const courseBundles: { courseIndex: number; bundleId: number; layer: number; lectures: SchedulerLecture[] }[][] = []

  for (const { course, idx } of enabledCourses) {
    const bundles: typeof courseBundles[0] = []
    for (const [layerStr, layerBundles] of Object.entries(course.layers)) {
      const layer = Number(layerStr)
      for (const bundle of layerBundles) {
        if (!bundle.enabled) continue
        const lectures = bundle.sections.flatMap(s => s.lectures)
        const overlapsBanned = lectures.some(l => {
          for (let period = 0; period < 8; period++) {
            const slotStart = 900 + period * 90
            const slotEnd = slotStart + 90
            if (l.start_time < slotEnd && l.end_time > slotStart && bannedPeriods[l.day]?.[period]) {
              return true
            }
          }
          return false
        })
        if (!overlapsBanned) {
          bundles.push({ courseIndex: idx, bundleId: bundle.id, layer, lectures })
        }
      }
    }
    courseBundles.push(bundles)
  }

  const plans: { courseIndex: number; bundleId: number; layer: number }[][] = []
  const bucket: Map<number, { start: number; end: number }[]> = new Map()

  function hasOverlap(day: number, start: number, end: number): boolean {
    const slots = bucket.get(day) || []
    return slots.some(s => start < s.end && end > s.start)
  }

  function addToBucket(day: number, start: number, end: number) {
    if (!bucket.has(day)) bucket.set(day, [])
    bucket.get(day)!.push({ start, end })
  }

  const currentSelection: typeof courseBundles[0] = []

  function searchPlans(courseIdx: number) {
    if (courseIdx >= courseBundles.length) {
      const plan = currentSelection.map(s => ({
        courseIndex: s.courseIndex,
        bundleId: s.bundleId,
        layer: s.layer,
      }))
      plans.push(plan)
      return
    }

    for (const bundle of courseBundles[courseIdx]) {
      let canPlace = true
      const placed: { day: number; start: number; end: number }[] = []

      for (const lecture of bundle.lectures) {
        if (hasOverlap(lecture.day, lecture.start_time, lecture.end_time)) {
          canPlace = false
          break
        }
        placed.push({ day: lecture.day, start: lecture.start_time, end: lecture.end_time })
      }

      if (canPlace) {
        for (const p of placed) addToBucket(p.day, p.start, p.end)
        currentSelection.push(bundle)
        searchPlans(courseIdx + 1)
        currentSelection.pop()
        for (const p of placed) {
          const slots = bucket.get(p.day)!
          const idx = slots.findIndex(s => s.start === p.start && s.end === p.end)
          if (idx !== -1) slots.splice(idx, 1)
        }
      }
    }
  }

  searchPlans(0)
  return plans
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
