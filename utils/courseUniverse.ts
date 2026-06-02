import type { AcademicCourseStatus } from '~/types/academic-map'

export type CourseUniverseModeKey = 'universe' | 'explore' | 'planner' | 'academicMap'

export interface CourseUniverseMode {
  key: CourseUniverseModeKey
  labelKey: string
  path: string
}

export interface CourseUniverseMapComponent {
  id: string
  node_type: boolean | null
  x_coordinate: number
  y_coordinate: number
  category: number
}

export interface CourseUniverseMapLine {
  id: number
  start_id: string
  end_id: string
  line_type: boolean | null
  x_coordinate: number
  category: number
}

export interface CourseUniverseMapCourse {
  course_code: string
  course_title_abbr: string
}

export interface CourseUniverseAcademicRecord {
  course_code: string
  status: AcademicCourseStatus
}

export interface CourseUniverseCartCourse {
  course_code: string
}

export interface CourseUniverseNode {
  code: string
  displayCode: string
  title: string
  x: number
  y: number
  category: number
  academicStatus: AcademicCourseStatus | null
  inPlanner: boolean
  selected: boolean
}

export const COURSE_UNIVERSE_MODES: CourseUniverseMode[] = [
  { key: 'universe', labelKey: 'courseUniverse.modes.universe', path: '/courses' },
  { key: 'explore', labelKey: 'courseUniverse.modes.explore', path: '/courses/explore' },
  { key: 'planner', labelKey: 'courseUniverse.modes.planner', path: '/courses/planner' },
  { key: 'academicMap', labelKey: 'courseUniverse.modes.academicMap', path: '/courses/academic-map' },
]

export const COURSE_UNIVERSE_ALIAS_PREFIXES = ['/courses', '/schedule', '/academic-map'] as const

export function compactCourseCode(code: string) {
  return String(code || '').replace(/\s+/g, '').toUpperCase()
}

export function formatCourseCode(code: string) {
  const compact = compactCourseCode(code)
  const match = compact.match(/^([A-Z]+)(\d+[A-Z]*)$/)
  return match ? `${match[1]} ${match[2]}` : compact
}

export function buildCourseUniverseModePath(mode: CourseUniverseModeKey) {
  return COURSE_UNIVERSE_MODES.find(item => item.key === mode)?.path || '/courses'
}

export function isCourseUniverseActivePath(path: string) {
  return COURSE_UNIVERSE_ALIAS_PREFIXES.some(prefix => (
    path === prefix || path.startsWith(`${prefix}/`)
  ))
}

export function getCourseUniverseRedirect(path: string) {
  if (path === '/schedule' || path === '/schedule/dashboard') return '/courses/planner'
  if (path.startsWith('/schedule/dashboard/')) {
    return path.replace('/schedule/dashboard', '/courses/planner')
  }
  if (path === '/academic-map') return '/courses/academic-map'
  return null
}

export function normalizeCourseUniverseNodes(input: {
  components: CourseUniverseMapComponent[]
  courses: CourseUniverseMapCourse[]
  academicRecords: CourseUniverseAcademicRecord[]
  plannerCourses: CourseUniverseCartCourse[]
  selectedCourseCode?: string | null
}): CourseUniverseNode[] {
  const coursesByCode = new Map(
    input.courses.map(course => [compactCourseCode(course.course_code), course]),
  )
  const recordsByCode = new Map(
    input.academicRecords.map(record => [compactCourseCode(record.course_code), record]),
  )
  const plannerCodes = new Set(input.plannerCourses.map(course => compactCourseCode(course.course_code)))
  const selectedCode = compactCourseCode(input.selectedCourseCode || '')

  return input.components
    .filter(component => component.category === 0)
    .map(component => {
      const code = compactCourseCode(component.id)
      const course = coursesByCode.get(code)
      const record = recordsByCode.get(code)

      return {
        code,
        displayCode: formatCourseCode(code),
        title: course?.course_title_abbr || formatCourseCode(code),
        x: component.x_coordinate,
        y: component.y_coordinate,
        category: component.category,
        academicStatus: record?.status || null,
        inPlanner: plannerCodes.has(code),
        selected: Boolean(selectedCode && selectedCode === code),
      }
    })
}
