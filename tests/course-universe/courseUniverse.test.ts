import { describe, expect, it } from 'vitest'
import {
  COURSE_UNIVERSE_ALIAS_PREFIXES,
  COURSE_UNIVERSE_MODES,
  buildCourseUniverseModePath,
  getCourseUniverseRedirect,
  isCourseUniverseActivePath,
  normalizeCourseUniverseNodes,
  type CourseUniverseAcademicRecord,
  type CourseUniverseCartCourse,
  type CourseUniverseMapComponent,
  type CourseUniverseMapCourse,
} from '../../utils/courseUniverse'

const components: CourseUniverseMapComponent[] = [
  { id: 'AIAA2205', node_type: null, x_coordinate: 100, y_coordinate: 120, category: 0 },
  { id: 'DSAA3010', node_type: null, x_coordinate: 240, y_coordinate: 180, category: 0 },
  { id: 'junction-1', node_type: true, x_coordinate: 180, y_coordinate: 150, category: 1 },
]

const courses: CourseUniverseMapCourse[] = [
  { course_code: 'AIAA2205', course_title_abbr: 'Intro to AI' },
  { course_code: 'DSAA3010', course_title_abbr: 'Data Mining' },
]

const records: CourseUniverseAcademicRecord[] = [
  { course_code: 'AIAA 2205', status: 'completed' },
]

const cart: CourseUniverseCartCourse[] = [
  { course_code: 'DSAA 3010' },
]

describe('course universe helpers', () => {
  it('exports the expected course modes', () => {
    expect(COURSE_UNIVERSE_MODES.map(mode => mode.key)).toEqual([
      'universe',
      'explore',
      'planner',
      'academicMap',
    ])
  })

  it('builds localized mode paths without hardcoding locale prefixes', () => {
    expect(buildCourseUniverseModePath('universe')).toBe('/courses')
    expect(buildCourseUniverseModePath('explore')).toBe('/courses/explore')
    expect(buildCourseUniverseModePath('planner')).toBe('/courses/planner')
    expect(buildCourseUniverseModePath('academicMap')).toBe('/courses/academic-map')
  })

  it('marks legacy schedule and academic map routes active under courses', () => {
    expect(COURSE_UNIVERSE_ALIAS_PREFIXES).toEqual(['/courses', '/schedule', '/academic-map'])
    expect(isCourseUniverseActivePath('/courses')).toBe(true)
    expect(isCourseUniverseActivePath('/courses/123/offerings/2530')).toBe(true)
    expect(isCourseUniverseActivePath('/schedule/dashboard/2530')).toBe(true)
    expect(isCourseUniverseActivePath('/academic-map')).toBe(true)
    expect(isCourseUniverseActivePath('/forum')).toBe(false)
  })

  it('maps legacy routes to new Course Universe routes', () => {
    expect(getCourseUniverseRedirect('/schedule')).toBe('/courses/planner')
    expect(getCourseUniverseRedirect('/schedule/dashboard')).toBe('/courses/planner')
    expect(getCourseUniverseRedirect('/schedule/dashboard/2530')).toBe('/courses/planner/2530')
    expect(getCourseUniverseRedirect('/academic-map')).toBe('/courses/academic-map')
    expect(getCourseUniverseRedirect('/courses')).toBeNull()
  })

  it('normalizes map nodes with academic and planner status', () => {
    const nodes = normalizeCourseUniverseNodes({
      components,
      courses,
      academicRecords: records,
      plannerCourses: cart,
      selectedCourseCode: 'DSAA3010',
    })

    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toMatchObject({
      code: 'AIAA2205',
      displayCode: 'AIAA 2205',
      title: 'Intro to AI',
      academicStatus: 'completed',
      inPlanner: false,
      selected: false,
    })
    expect(nodes[1]).toMatchObject({
      code: 'DSAA3010',
      displayCode: 'DSAA 3010',
      title: 'Data Mining',
      academicStatus: null,
      inPlanner: true,
      selected: true,
    })
  })
})
