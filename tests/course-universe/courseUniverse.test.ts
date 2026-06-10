import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  COURSE_UNIVERSE_ALIAS_PREFIXES,
  COURSE_UNIVERSE_COURSE_HEIGHT,
  COURSE_UNIVERSE_COURSE_WIDTH,
  COURSE_UNIVERSE_MODES,
  buildCourseUniverseGraph,
  buildCourseUniverseHighlightSet,
  buildCourseUniverseCourseDetailPath,
  layoutCourseUniverseGraphComponents,
  buildCourseUniverseModePath,
  buildCourseUniversePrefixOptions,
  buildCourseUniverseSupplementalComponentSet,
  buildCourseUniverseVisibleComponentSet,
  buildCourseUniverseVisibleCodeSet,
  createReadableCourseUniverseViewport,
  fitCourseUniverseViewport,
  getCourseUniverseRedirect,
  getCourseUniverseLineStyle,
  getCourseUniverseActiveSchedulerSemester,
  formatCourseUniverseAcademicYearLabel,
  getCourseUniverseSchedulerSemesterLabel,
  getCourseUniverseNodeStatusKey,
  getCourseUniverseViewBox,
  getCourseUniverseNodePrefix,
  hasCourseUniversePointerMoved,
  isCourseUniverseActivePath,
  layoutCourseUniverseLocalSubgraph,
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

const prefixNodes = [
  { code: 'UCUG1051', displayCode: 'UCUG 1051', title: 'Core A', x: 0, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
  { code: 'UCUG1052', displayCode: 'UCUG 1052', title: 'Core B', x: 100, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
  { code: 'UFUG1101', displayCode: 'UFUG 1101', title: 'Foundation A', x: 200, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
  { code: 'DLED2010', displayCode: 'DLED 2010', title: 'Design Lab', x: 300, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
  { code: 'AIAA2205', displayCode: 'AIAA 2205', title: 'Intro to AI', x: 400, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
]

const prefixLines = [
  { id: 1, start_id: 'UCUG1051', end_id: 'UCUG1052', line_type: null, x_coordinate: 0, category: 1 },
  { id: 2, start_id: 'UFUG1101', end_id: 'UCUG1052', line_type: null, x_coordinate: 0, category: 1 },
  { id: 3, start_id: 'UCUG1052', end_id: 'DLED2010', line_type: null, x_coordinate: 0, category: 1 },
  { id: 4, start_id: 'AIAA2205', end_id: 'UFUG1101', line_type: null, x_coordinate: 0, category: 1 },
]

const graphComponents: CourseUniverseMapComponent[] = [
  { id: 'UCUG1051', node_type: null, x_coordinate: 100, y_coordinate: 120, category: 0 },
  { id: '(UCUG1051|UFUG1101)', node_type: true, x_coordinate: 380, y_coordinate: 150, category: 1 },
  { id: 'UFUG1101', node_type: null, x_coordinate: 520, y_coordinate: 240, category: 0 },
  { id: 'co_UCUG1051_UFUG1101', node_type: false, x_coordinate: 440, y_coordinate: 330, category: 2 },
  { id: 'ex_UCUG1051_UFUG1101', node_type: false, x_coordinate: 440, y_coordinate: 420, category: 3 },
]

const graphLines = [
  { id: 10, start_id: 'UCUG1051', end_id: '(UCUG1051|UFUG1101)', line_type: false, x_coordinate: 340, category: 1 },
  { id: 11, start_id: '(UCUG1051|UFUG1101)', end_id: 'UFUG1101', line_type: null, x_coordinate: 460, category: 1 },
  { id: 12, start_id: 'UCUG1051', end_id: 'co_UCUG1051_UFUG1101', line_type: true, x_coordinate: 360, category: 2 },
  { id: 13, start_id: 'ex_UCUG1051_UFUG1101', end_id: 'UFUG1101', line_type: true, x_coordinate: 490, category: 3 },
]

const directPathComponents: CourseUniverseMapComponent[] = [
  ...graphComponents,
  { id: '(UFUG1101&DLED2010)', node_type: false, x_coordinate: 760, y_coordinate: 286, category: 1 },
  { id: 'DLED2010', node_type: null, x_coordinate: 920, y_coordinate: 240, category: 0 },
]

const directPathLines = [
  ...graphLines,
  { id: 14, start_id: 'UFUG1101', end_id: '(UFUG1101&DLED2010)', line_type: false, x_coordinate: 720, category: 1 },
  { id: 15, start_id: '(UFUG1101&DLED2010)', end_id: 'DLED2010', line_type: null, x_coordinate: 840, category: 1 },
]

const incompleteAndBranchComponents: CourseUniverseMapComponent[] = [
  { id: 'UFUG1102', node_type: null, x_coordinate: 100, y_coordinate: 120, category: 0 },
  { id: 'UFUG1105', node_type: null, x_coordinate: 100, y_coordinate: 240, category: 0 },
  { id: '(UFUG1102|UFUG1105)', node_type: true, x_coordinate: 380, y_coordinate: 180, category: 1 },
  { id: 'UFUG1501', node_type: null, x_coordinate: 100, y_coordinate: 420, category: 0 },
  { id: 'UFUG1503', node_type: null, x_coordinate: 100, y_coordinate: 540, category: 0 },
  { id: '(UFUG1501|UFUG1503)', node_type: true, x_coordinate: 380, y_coordinate: 480, category: 1 },
  { id: '((UFUG1501|UFUG1503)&(UFUG1102|UFUG1105))', node_type: false, x_coordinate: 620, y_coordinate: 330, category: 1 },
  { id: 'UFUG1504', node_type: null, x_coordinate: 860, y_coordinate: 330, category: 0 },
]

const incompleteAndBranchLines = [
  { id: 101, start_id: 'UFUG1102', end_id: '(UFUG1102|UFUG1105)', line_type: true, x_coordinate: 330, category: 1 },
  { id: 102, start_id: 'UFUG1105', end_id: '(UFUG1102|UFUG1105)', line_type: true, x_coordinate: 330, category: 1 },
  { id: 103, start_id: '(UFUG1102|UFUG1105)', end_id: '((UFUG1501|UFUG1503)&(UFUG1102|UFUG1105))', line_type: false, x_coordinate: 520, category: 1 },
  { id: 104, start_id: 'UFUG1501', end_id: '(UFUG1501|UFUG1503)', line_type: true, x_coordinate: 330, category: 1 },
  { id: 105, start_id: 'UFUG1503', end_id: '(UFUG1501|UFUG1503)', line_type: true, x_coordinate: 330, category: 1 },
  { id: 106, start_id: '(UFUG1501|UFUG1503)', end_id: '((UFUG1501|UFUG1503)&(UFUG1102|UFUG1105))', line_type: false, x_coordinate: 520, category: 1 },
  { id: 107, start_id: '((UFUG1501|UFUG1503)&(UFUG1102|UFUG1105))', end_id: 'UFUG1504', line_type: null, x_coordinate: 760, category: 1 },
]

const detachedRelationComponents: CourseUniverseMapComponent[] = [
  { id: 'AMAT2040', node_type: null, x_coordinate: 100, y_coordinate: 100, category: 0 },
  { id: 'AMAT2450', node_type: null, x_coordinate: 520, y_coordinate: 100, category: 0 },
  { id: 'UCUG1052', node_type: null, x_coordinate: 100, y_coordinate: 360, category: 0 },
  { id: 'UCUG1053', node_type: null, x_coordinate: 520, y_coordinate: 360, category: 0 },
  { id: 'co_AMAT2040_AMAT2450', node_type: null, x_coordinate: 300, y_coordinate: 96, category: 2 },
  { id: 'co_AMAT2450_AMAT2040', node_type: null, x_coordinate: 360, y_coordinate: 96, category: 2 },
  { id: 'ex_UCUG1052_UCUG1053', node_type: false, x_coordinate: 300, y_coordinate: 356, category: 3 },
  { id: 'ex_UCUG1053_UCUG1052', node_type: false, x_coordinate: 360, y_coordinate: 356, category: 3 },
]

const detachedRelationLines = [
  { id: 16, start_id: 'co_AMAT2040_AMAT2450', end_id: 'co_AMAT2450_AMAT2040', line_type: null, x_coordinate: 330, category: 2 },
  { id: 17, start_id: 'ex_UCUG1052_UCUG1053', end_id: 'ex_UCUG1053_UCUG1052', line_type: true, x_coordinate: 330, category: 3 },
]

const crossPrefixRelationComponents: CourseUniverseMapComponent[] = [
  { id: 'UCUG1051', node_type: null, x_coordinate: 100, y_coordinate: 100, category: 0 },
  { id: 'DLED3010', node_type: null, x_coordinate: 520, y_coordinate: 100, category: 0 },
  { id: 'DLED3020', node_type: null, x_coordinate: 940, y_coordinate: 100, category: 0 },
  { id: 'co_DLED3010_DLED3020', node_type: null, x_coordinate: 720, y_coordinate: 96, category: 2 },
  { id: 'co_DLED3020_DLED3010', node_type: null, x_coordinate: 780, y_coordinate: 96, category: 2 },
]

const crossPrefixRelationLines = [
  { id: 18, start_id: 'UCUG1051', end_id: 'DLED3010', line_type: null, x_coordinate: 360, category: 1 },
  { id: 19, start_id: 'co_DLED3010_DLED3020', end_id: 'co_DLED3020_DLED3010', line_type: null, x_coordinate: 750, category: 2 },
]

const overlappingComponents: CourseUniverseMapComponent[] = [
  { id: 'UCUG1050', node_type: null, x_coordinate: 100, y_coordinate: 100, category: 0 },
  { id: 'UCUG1051', node_type: null, x_coordinate: 104, y_coordinate: 178, category: 0 },
  { id: 'UCUG1052', node_type: null, x_coordinate: 500, y_coordinate: 120, category: 0 },
  { id: 'UCUG1052A', node_type: null, x_coordinate: 504, y_coordinate: 182, category: 0 },
  { id: 'UCUG1052S', node_type: null, x_coordinate: 498, y_coordinate: 245, category: 0 },
  { id: '(UCUG1050&UCUG1051)', node_type: false, x_coordinate: 340, y_coordinate: 170, category: 1 },
]

const overlappingLines = [
  { id: 20, start_id: 'UCUG1050', end_id: '(UCUG1050&UCUG1051)', line_type: false, x_coordinate: 300, category: 1 },
  { id: 21, start_id: 'UCUG1051', end_id: '(UCUG1050&UCUG1051)', line_type: false, x_coordinate: 300, category: 1 },
  { id: 22, start_id: '(UCUG1050&UCUG1051)', end_id: 'UCUG1052', line_type: null, x_coordinate: 420, category: 1 },
  { id: 23, start_id: '(UCUG1050&UCUG1051)', end_id: 'UCUG1052A', line_type: null, x_coordinate: 420, category: 1 },
  { id: 24, start_id: '(UCUG1050&UCUG1051)', end_id: 'UCUG1052S', line_type: null, x_coordinate: 420, category: 1 },
]

const isolatedComponents: CourseUniverseMapComponent[] = [
  { id: 'UCUG1050', node_type: null, x_coordinate: 100, y_coordinate: 100, category: 0 },
  { id: 'UCUG1051', node_type: null, x_coordinate: 500, y_coordinate: 100, category: 0 },
  { id: 'UCUG1070', node_type: null, x_coordinate: 120, y_coordinate: 420, category: 0 },
  { id: 'UCUG1071', node_type: null, x_coordinate: 520, y_coordinate: 420, category: 0 },
  { id: 'UCUG1072', node_type: null, x_coordinate: 250, y_coordinate: 500, category: 0 },
  { id: 'UCUG1073', node_type: null, x_coordinate: 125, y_coordinate: 610, category: 0 },
  { id: 'UCUG1074', node_type: null, x_coordinate: 520, y_coordinate: 610, category: 0 },
  { id: 'UCUG1500', node_type: null, x_coordinate: 130, y_coordinate: 740, category: 0 },
  { id: 'UCUG1501', node_type: null, x_coordinate: 520, y_coordinate: 740, category: 0 },
  { id: 'UCUG1502', node_type: null, x_coordinate: 130, y_coordinate: 820, category: 0 },
  { id: 'UCUG1503', node_type: null, x_coordinate: 520, y_coordinate: 820, category: 0 },
  { id: 'UCUG1504', node_type: null, x_coordinate: 130, y_coordinate: 900, category: 0 },
  { id: 'UCUG1505', node_type: null, x_coordinate: 520, y_coordinate: 900, category: 0 },
  { id: '(UCUG1050|UCUG1051)', node_type: true, x_coordinate: 340, y_coordinate: 130, category: 1 },
]

const isolatedLines = [
  { id: 30, start_id: 'UCUG1050', end_id: '(UCUG1050|UCUG1051)', line_type: false, x_coordinate: 280, category: 1 },
  { id: 31, start_id: '(UCUG1050|UCUG1051)', end_id: 'UCUG1051', line_type: null, x_coordinate: 420, category: 1 },
]

describe('course universe helpers', () => {
  it('renders course cards as native SVG groups so they share graph transforms with lines', () => {
    const canvasSource = readFileSync(
      new URL('../../components/courses/universe/CourseUniverseCanvas.vue', import.meta.url),
      'utf8',
    )

    expect(canvasSource).not.toContain('<foreignObject')
    expect(canvasSource).toContain('<g\n            v-for="node in visibleNodes"')
    expect(canvasSource).toContain('<rect class="cu-node__card"')
  })

  it('renders graph card controls as a detail link beside the code and a planner cart icon action', () => {
    const canvasSource = readFileSync(
      new URL('../../components/courses/universe/CourseUniverseCanvas.vue', import.meta.url),
      'utf8',
    )

    expect(canvasSource).toContain("event: 'toggle-planner'")
    expect(canvasSource).toContain('cu-node__header')
    expect(canvasSource).toContain('cu-node__status-pill')
    expect(canvasSource).toContain('cu-node__cart-action')
    expect(canvasSource).toContain('shopping-cart-check')
  })

  it('limits the graph legend to relationship and logic markers', () => {
    const legendSource = readFileSync(
      new URL('../../components/courses/universe/CourseUniverseLegend.vue', import.meta.url),
      'utf8',
    )

    expect(legendSource).toContain("key: 'prerequisite'")
    expect(legendSource).toContain("key: 'corequisite'")
    expect(legendSource).toContain("key: 'exclusion'")
    expect(legendSource).toContain("key: 'hollowLogic'")
    expect(legendSource).toContain("key: 'solidLogic'")
    expect(legendSource).not.toContain("key: 'completed'")
    expect(legendSource).not.toContain("key: 'inProgress'")
    expect(legendSource).not.toContain("key: 'notTaken'")
    expect(legendSource).not.toContain("key: 'interested'")
  })

  it('uses the greatest semester id with offering data as the active scheduler semester', () => {
    expect(getCourseUniverseActiveSchedulerSemester([
      { id: '2530', name: '2025-26 Spring', name_zh: '25-26春', section_count: 20 },
      { id: '2510', name: '2025-26 Fall', name_zh: '25-26秋', section_count: 40 },
      { id: '2540', name: '2025-26 Summer', name_zh: '25-26夏', section_count: 10 },
      { id: '2520', name: '2025-26 Winter', name_zh: '25-26冬', section_count: 5 },
    ])).toBe('2540')
    expect(getCourseUniverseActiveSchedulerSemester([])).toBe('')
  })

  it('formats scheduler semester ids when backend metadata is missing', () => {
    const semester = { id: '2540', name: '2540', name_zh: '2540', section_count: 10 }

    expect(getCourseUniverseSchedulerSemesterLabel(semester, 'zh')).toBe('25-26夏')
    expect(getCourseUniverseSchedulerSemesterLabel(semester, 'en')).toBe('25-26 Summer')
    expect(getCourseUniverseSchedulerSemesterLabel({
      id: '2530',
      name: '2025-26 Spring',
      name_zh: '25-26春',
      section_count: 10,
    }, 'zh')).toBe('25-26春')
  })

  it('formats scheduler semester ids into full academic year labels', () => {
    expect(formatCourseUniverseAcademicYearLabel('2530')).toBe('2025-2026')
    expect(formatCourseUniverseAcademicYearLabel('2510')).toBe('2025-2026')
    expect(formatCourseUniverseAcademicYearLabel('2440')).toBe('2024-2025')
    expect(formatCourseUniverseAcademicYearLabel('2430')).toBe('2024-2025')
  })

  it('keeps graph cart actions tied to the active scheduler semester with explicit feedback', () => {
    const pageSource = readFileSync(
      new URL('../../components/courses/universe/CourseUniversePage.vue', import.meta.url),
      'utf8',
    )

    expect(pageSource).toContain('activeSchedulerSemester')
    expect(pageSource).toContain("t('scheduler.cartCourseUnavailable'")
    expect(pageSource).toContain("t('scheduler.cartAdded'")
    expect(pageSource).toContain("t('scheduler.cartRemoved'")
    expect(pageSource).not.toContain("selectedSemester.value = semesterData[0]?.id || ''")
  })

  it('keeps the shared course tools header focused on mode navigation', () => {
    const toolbarSource = readFileSync(
      new URL('../../components/courses/CourseToolsHeader.vue', import.meta.url),
      'utf8',
    )

    expect(toolbarSource).toContain('COURSE_UNIVERSE_MODES')
    expect(toolbarSource).not.toContain('<select')
    expect(toolbarSource).not.toContain('semesterLocked')
  })

  it('keeps all course tool entry pages on the shared mode navigation', () => {
    const expectedPages = [
      ['../../components/courses/universe/CourseUniversePage.vue', 'mode="mode"'],
      ['../../pages/courses/explore.vue', 'mode="explore"'],
      ['../../pages/courses/planner/index.vue', 'mode="planner"'],
      ['../../pages/courses/academic-map.vue', 'mode="academicMap"'],
    ] as const

    for (const [path, activeMode] of expectedPages) {
      const source = readFileSync(new URL(path, import.meta.url), 'utf8')
      expect(source).toContain('CourseToolsHeader')
      expect(source).toContain(activeMode)
      expect(source).not.toContain(':subtitle=')
    }

    const academicMapSource = readFileSync(
      new URL('../../pages/courses/academic-map.vue', import.meta.url),
      'utf8',
    )
    expect(academicMapSource).not.toContain("t('academicMap.openCourses')")

    const plannerSource = readFileSync(
      new URL('../../pages/courses/planner/index.vue', import.meta.url),
      'utf8',
    )
    expect(plannerSource).toContain('<template #actions>')
    expect(plannerSource).not.toContain('scheduler-home__hero')
  })

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

  it('builds stable course overview paths from graph node codes', () => {
    expect(buildCourseUniverseCourseDetailPath('AIAA 2205')).toBe('/courses/AIAA2205')
    expect(buildCourseUniverseCourseDetailPath('DLED4010[2]')).toBe('/courses/DLED4010')
  })

  it('marks legacy schedule and degree progress routes active under courses', () => {
    expect(COURSE_UNIVERSE_ALIAS_PREFIXES).toEqual(['/courses', '/schedule', '/academic-map'])
    expect(isCourseUniverseActivePath('/courses')).toBe(true)
    expect(isCourseUniverseActivePath('/courses/123/offerings/2530')).toBe(true)
    expect(isCourseUniverseActivePath('/schedule/dashboard/2530')).toBe(true)
    expect(isCourseUniverseActivePath('/academic-map')).toBe(true)
    expect(isCourseUniverseActivePath('/forum')).toBe(false)
  })

  it('maps legacy routes to new course graph routes', () => {
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

  it('maps course nodes into the four display statuses used by the graph cards', () => {
    expect(getCourseUniverseNodeStatusKey({ academicStatus: 'completed' })).toBe('completed')
    expect(getCourseUniverseNodeStatusKey({ academicStatus: 'in_progress' })).toBe('inProgress')
    expect(getCourseUniverseNodeStatusKey({ academicStatus: 'interested' })).toBe('interested')
    expect(getCourseUniverseNodeStatusKey({ academicStatus: null })).toBe('notTaken')
    expect(getCourseUniverseNodeStatusKey({ academicStatus: 'planned' })).toBe('interested')
  })

  it('keeps planner cart state separate from the four academic display statuses', () => {
    expect(getCourseUniverseNodeStatusKey({ academicStatus: null, inPlanner: true })).toBe('notTaken')
    expect(getCourseUniverseNodeStatusKey({ academicStatus: 'interested', inPlanner: true })).toBe('interested')
  })

  it('uses full catalog course names when map title abbreviations are missing', () => {
    const nodes = normalizeCourseUniverseNodes({
      components: [
        { id: 'UCUG1052', node_type: null, x_coordinate: 100, y_coordinate: 120, category: 0 },
      ],
      courses: [
        {
          code: 'UCUG1052',
          course_title_abbr: null,
          name: 'Academic English for University Studies',
        },
      ],
      academicRecords: [],
      plannerCourses: [],
    })

    expect(nodes[0]).toMatchObject({
      code: 'UCUG1052',
      title: 'Academic English for University Studies',
    })
  })

  it('creates a readable default viewport instead of fitting the entire graph', () => {
    const nodes = [
      { code: 'AIAA2205', displayCode: 'AIAA 2205', title: 'Intro to AI', x: 0, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
      { code: 'DSAA3010', displayCode: 'DSAA 3010', title: 'Data Mining', x: 4200, y: 1200, category: 0, academicStatus: null, inPlanner: false, selected: false },
    ]

    const viewport = createReadableCourseUniverseViewport({ nodes })
    const viewBox = getCourseUniverseViewBox(viewport, { width: 1200, height: 620 })

    expect(viewBox.width).toBeLessThan(2300)
    expect(192 * (1200 / viewBox.width)).toBeGreaterThan(105)
    expect(viewBox.centerX).toBe(2100)
    expect(viewBox.centerY).toBe(600)
  })

  it('fits the full graph as an explicit overview action', () => {
    const nodes = [
      { code: 'AIAA2205', displayCode: 'AIAA 2205', title: 'Intro to AI', x: 0, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
      { code: 'DSAA3010', displayCode: 'DSAA 3010', title: 'Data Mining', x: 4200, y: 1200, category: 0, academicStatus: null, inPlanner: false, selected: false },
    ]

    const readable = createReadableCourseUniverseViewport({ nodes })
    const fitted = fitCourseUniverseViewport({ nodes, canvasSize: { width: 1200, height: 620 } })

    expect(fitted.zoom).toBeLessThan(readable.zoom)
    expect(getCourseUniverseViewBox(fitted, { width: 1200, height: 620 }).width).toBeGreaterThan(4200)
  })

  it('fits local subgraphs with compact padding so connected endpoints remain in frame', () => {
    const nodes = layoutCourseUniverseLocalSubgraph(prefixNodes)
    const canvasSize = { width: 1200, height: 620 }
    const viewport = fitCourseUniverseViewport({ nodes, canvasSize, padding: 150 })
    const overviewViewport = fitCourseUniverseViewport({ nodes, canvasSize })
    const viewBox = getCourseUniverseViewBox(viewport, canvasSize)
    const xs = nodes.map(node => node.x)
    const ys = nodes.map(node => node.y)

    expect(Math.min(...xs)).toBeGreaterThanOrEqual(viewBox.x)
    expect(Math.max(...xs)).toBeLessThanOrEqual(viewBox.x + viewBox.width)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(viewBox.y)
    expect(Math.max(...ys)).toBeLessThanOrEqual(viewBox.y + viewBox.height)
    expect(viewport.zoom).toBeGreaterThan(overviewViewport.zoom)
  })

  it('centers search matches and zooms in for inspection', () => {
    const nodes = [
      { code: 'AIAA2205', displayCode: 'AIAA 2205', title: 'Intro to AI', x: 0, y: 0, category: 0, academicStatus: null, inPlanner: false, selected: false },
      { code: 'DSAA3010', displayCode: 'DSAA 3010', title: 'Data Mining', x: 4200, y: 1200, category: 0, academicStatus: null, inPlanner: false, selected: false },
    ]

    const viewport = createReadableCourseUniverseViewport({
      nodes,
      focusQuery: 'data mining',
    })

    expect(viewport.centerX).toBe(4200 + COURSE_UNIVERSE_COURSE_WIDTH / 2)
    expect(viewport.centerY).toBe(1200 + COURSE_UNIVERSE_COURSE_HEIGHT / 2)
    expect(viewport.zoom).toBeGreaterThan(1)
  })

  it('starts graph dragging only after the pointer leaves the click tolerance', () => {
    const start = { clientX: 100, clientY: 100 }

    expect(hasCourseUniversePointerMoved(start, { clientX: 103, clientY: 104 })).toBe(false)
    expect(hasCourseUniversePointerMoved(start, { clientX: 106, clientY: 100 })).toBe(true)
  })

  it('extracts course prefixes from compact or formatted course codes', () => {
    expect(getCourseUniverseNodePrefix('UCUG1051')).toBe('UCUG')
    expect(getCourseUniverseNodePrefix('UFUG 1101')).toBe('UFUG')
    expect(getCourseUniverseNodePrefix('DLED2010A')).toBe('DLED')
  })

  it('builds prefix options sorted by graph density', () => {
    expect(buildCourseUniversePrefixOptions(prefixNodes, 2)).toEqual([
      { prefix: 'UCUG', count: 2 },
      { prefix: 'AIAA', count: 1 },
    ])
  })

  it('keeps cross-prefix direct neighbours inside a prefix subgraph', () => {
    const visibleCodes = buildCourseUniverseVisibleCodeSet({
      nodes: prefixNodes,
      lines: prefixLines,
      selectedPrefix: 'UCUG',
    })

    expect([...visibleCodes].sort()).toEqual([
      'DLED2010',
      'UCUG1051',
      'UCUG1052',
      'UFUG1101',
    ])
  })

  it('limits a selected course view to upstream and downstream courses', () => {
    const visibleCodes = buildCourseUniverseVisibleCodeSet({
      nodes: prefixNodes,
      lines: prefixLines,
      selectedCourseCode: 'UFUG1101',
    })

    expect([...visibleCodes].sort()).toEqual([
      'AIAA2205',
      'DLED2010',
      'UCUG1052',
      'UFUG1101',
    ])
  })

  it('lays out local subgraphs in readable lanes instead of keeping global spacing', () => {
    const localNodes = layoutCourseUniverseLocalSubgraph(prefixNodes)
    const xs = localNodes.map(node => node.x)
    const ys = localNodes.map(node => node.y)

    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1200)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(170)
    expect(localNodes.find(node => node.code === 'UCUG1051')?.x).toBeLessThan(
      localNodes.find(node => node.code === 'AIAA2205')?.x || 0,
    )
  })

  it('preserves course cards and intermediate logic nodes in the render graph', () => {
    const graph = buildCourseUniverseGraph({ components: graphComponents, lines: graphLines })

    expect(graph.components).toHaveLength(5)
    expect(graph.components.find(component => component.id === 'UCUG1051')).toMatchObject({
      kind: 'course',
      x: 100,
      y: 120,
      width: COURSE_UNIVERSE_COURSE_WIDTH,
      height: COURSE_UNIVERSE_COURSE_HEIGHT,
    })
    expect(graph.components.find(component => component.id === '(UCUG1051|UFUG1101)')).toMatchObject({
      kind: 'logic',
      category: 1,
      hollow: true,
    })
  })

  it('snaps close course columns and separates overlapping cards before rendering', () => {
    const laidOut = layoutCourseUniverseGraphComponents({
      components: overlappingComponents,
      lines: overlappingLines,
    })
    const byId = new Map(laidOut.map(component => [component.id, component]))

    expect(byId.get('UCUG1052')?.x_coordinate).toBe(byId.get('UCUG1052A')?.x_coordinate)
    expect(byId.get('UCUG1052A')?.x_coordinate).toBe(byId.get('UCUG1052S')?.x_coordinate)

    const rightColumn = ['UCUG1052', 'UCUG1052A', 'UCUG1052S']
      .map(id => byId.get(id)?.y_coordinate || 0)
      .sort((a, b) => a - b)
    expect(rightColumn[1] - rightColumn[0]).toBeGreaterThanOrEqual(COURSE_UNIVERSE_COURSE_HEIGHT + 24)
    expect(rightColumn[2] - rightColumn[1]).toBeGreaterThanOrEqual(COURSE_UNIVERSE_COURSE_HEIGHT + 24)
  })

  it('compacts sparse course columns so local prefix views stay readable', () => {
    const laidOut = layoutCourseUniverseGraphComponents({
      components: [
        { id: 'UCUG1050', node_type: null, x_coordinate: 100, y_coordinate: 100, category: 0 },
        { id: 'UCUG1051', node_type: null, x_coordinate: 104, y_coordinate: 640, category: 0 },
        { id: 'UCUG1052', node_type: null, x_coordinate: 108, y_coordinate: 1400, category: 0 },
        { id: '(UCUG1050&UCUG1051)', node_type: false, x_coordinate: 340, y_coordinate: 170, category: 1 },
      ],
      lines: [
        { id: 25, start_id: 'UCUG1050', end_id: '(UCUG1050&UCUG1051)', line_type: false, x_coordinate: 300, category: 1 },
        { id: 26, start_id: 'UCUG1051', end_id: '(UCUG1050&UCUG1051)', line_type: false, x_coordinate: 300, category: 1 },
        { id: 27, start_id: '(UCUG1050&UCUG1051)', end_id: 'UCUG1052', line_type: null, x_coordinate: 420, category: 1 },
      ],
    })
    const byId = new Map(laidOut.map(component => [component.id, component]))

    expect(byId.get('UCUG1051')?.y_coordinate).toBe(100 + COURSE_UNIVERSE_COURSE_HEIGHT + 24)
    expect(byId.get('UCUG1052')?.y_coordinate).toBe(100 + (COURSE_UNIVERSE_COURSE_HEIGHT + 24) * 2)
  })

  it('packs isolated visible courses into an aligned multi-column gallery', () => {
    const visibleIds = new Set(isolatedComponents.map(component => component.id))
    const laidOut = layoutCourseUniverseGraphComponents({
      components: isolatedComponents,
      lines: isolatedLines,
      visibleComponentIds: visibleIds,
    })
    const isolatedCourses = laidOut
      .filter(component => component.category === 0 && component.id.startsWith('UCUG15'))
      .sort((a, b) => a.id.localeCompare(b.id))
    const distinctColumns = new Set(isolatedCourses.map(component => component.x_coordinate))
    const rowCounts = new Map<number, number>()
    isolatedCourses.forEach(component => {
      rowCounts.set(component.y_coordinate, (rowCounts.get(component.y_coordinate) || 0) + 1)
    })

    expect(distinctColumns.size).toBeGreaterThanOrEqual(3)
    expect([...rowCounts.values()].some(count => count >= 3)).toBe(true)
    isolatedCourses.forEach(component => {
      expect(component.y_coordinate).toBeGreaterThan(300)
    })
  })

  it('routes lines from course edges through the API elbow coordinate', () => {
    const graph = buildCourseUniverseGraph({ components: graphComponents, lines: graphLines })

    expect(graph.lines.find(line => line.id === 10)).toMatchObject({
      path: `M ${100 + COURSE_UNIVERSE_COURSE_WIDTH},${120 + COURSE_UNIVERSE_COURSE_HEIGHT / 2} H 340 V 150 H 380`,
    })
    expect(graph.lines.find(line => line.id === 11)).toMatchObject({
      path: `M 380,150 H 460 V ${240 + COURSE_UNIVERSE_COURSE_HEIGHT / 2} H 520`,
    })
  })

  it('generates arrows and keeps relationship styling distinct', () => {
    const graph = buildCourseUniverseGraph({ components: graphComponents, lines: graphLines })

    expect(getCourseUniverseLineStyle({ category: 1, lineType: false })).toMatchObject({
      tone: 'prerequisite',
      dashed: false,
    })
    expect(getCourseUniverseLineStyle({ category: 2, lineType: true })).toMatchObject({
      tone: 'corequisite',
    })
    expect(getCourseUniverseLineStyle({ category: 3, lineType: true })).toMatchObject({
      tone: 'exclusion',
    })
    expect(graph.lines.find(line => line.id === 10)?.arrowPaths.length).toBeGreaterThan(0)
    expect(graph.lines.find(line => line.id === 13)?.arrowPaths).toHaveLength(2)
  })

  it('keeps intermediate nodes when focusing a selected course', () => {
    const visible = buildCourseUniverseVisibleComponentSet({
      components: graphComponents,
      lines: graphLines,
      courseNodes: prefixNodes,
      selectedCourseCode: 'UCUG1051',
    })

    expect(visible).toContain('UCUG1051')
    expect(visible).toContain('(UCUG1051|UFUG1101)')
    expect(visible).toContain('UFUG1101')
  })

  it('limits selected course views to direct relationship paths while keeping intermediate nodes', () => {
    const courseNodes = normalizeCourseUniverseNodes({
      components: directPathComponents,
      courses: [
        { course_code: 'UCUG1051', course_title_abbr: 'Core A' },
        { course_code: 'UFUG1101', course_title_abbr: 'Foundation A' },
        { course_code: 'DLED2010', course_title_abbr: 'Design Lab' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })
    const visible = buildCourseUniverseVisibleComponentSet({
      components: directPathComponents,
      lines: directPathLines,
      courseNodes,
      selectedCourseCode: 'UCUG1051',
    })

    expect(visible).toContain('UCUG1051')
    expect(visible).toContain('(UCUG1051|UFUG1101)')
    expect(visible).toContain('UFUG1101')
    expect(visible).not.toContain('(UFUG1101&DLED2010)')
    expect(visible).not.toContain('DLED2010')
  })

  it('fills missing sibling prerequisite branches for downstream AND requirements', () => {
    const courseNodes = normalizeCourseUniverseNodes({
      components: incompleteAndBranchComponents,
      courses: [
        { course_code: 'UFUG1102', course_title_abbr: 'Calculus I' },
        { course_code: 'UFUG1105', course_title_abbr: 'Honors Calculus I' },
        { course_code: 'UFUG1501', course_title_abbr: 'General Physics I' },
        { course_code: 'UFUG1503', course_title_abbr: 'Honors General Physics I' },
        { course_code: 'UFUG1504', course_title_abbr: 'Honors General Physics II' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })
    const visible = buildCourseUniverseVisibleComponentSet({
      components: incompleteAndBranchComponents,
      lines: incompleteAndBranchLines,
      courseNodes,
      selectedCourseCode: 'UFUG1102',
    })

    expect(visible).toContain('UFUG1504')
    expect(visible).toContain('((UFUG1501|UFUG1503)&(UFUG1102|UFUG1105))')
    expect(visible).toContain('(UFUG1501|UFUG1503)')
    expect(visible).toContain('UFUG1501')
    expect(visible).toContain('UFUG1503')
  })

  it('marks added sibling prerequisite branches as supplemental relationships', () => {
    const courseNodes = normalizeCourseUniverseNodes({
      components: incompleteAndBranchComponents,
      courses: [
        { course_code: 'UFUG1102', course_title_abbr: 'Calculus I' },
        { course_code: 'UFUG1105', course_title_abbr: 'Honors Calculus I' },
        { course_code: 'UFUG1501', course_title_abbr: 'General Physics I' },
        { course_code: 'UFUG1503', course_title_abbr: 'Honors General Physics I' },
        { course_code: 'UFUG1504', course_title_abbr: 'Honors General Physics II' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })
    const supplemental = buildCourseUniverseSupplementalComponentSet({
      components: incompleteAndBranchComponents,
      lines: incompleteAndBranchLines,
      courseNodes,
      selectedCourseCode: 'UFUG1102',
    })

    expect(supplemental).toContain('(UFUG1501|UFUG1503)')
    expect(supplemental).toContain('UFUG1501')
    expect(supplemental).toContain('UFUG1503')
    expect(supplemental).not.toContain('UFUG1102')
    expect(supplemental).not.toContain('UFUG1504')
  })

  it('limits prefix views to direct relationship paths while keeping intermediate nodes', () => {
    const courseNodes = normalizeCourseUniverseNodes({
      components: directPathComponents,
      courses: [
        { course_code: 'UCUG1051', course_title_abbr: 'Core A' },
        { course_code: 'UFUG1101', course_title_abbr: 'Foundation A' },
        { course_code: 'DLED2010', course_title_abbr: 'Design Lab' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })
    const visible = buildCourseUniverseVisibleComponentSet({
      components: directPathComponents,
      lines: directPathLines,
      courseNodes,
      selectedPrefix: 'UCUG',
    })

    expect(visible).toContain('UCUG1051')
    expect(visible).toContain('(UCUG1051|UFUG1101)')
    expect(visible).toContain('UFUG1101')
    expect(visible).not.toContain('(UFUG1101&DLED2010)')
    expect(visible).not.toContain('DLED2010')
  })

  it('keeps detached corequisite relation nodes when their courses are visible', () => {
    const courseNodes = normalizeCourseUniverseNodes({
      components: detachedRelationComponents,
      courses: [
        { course_code: 'AMAT2040', course_title_abbr: 'Physical Chemistry' },
        { course_code: 'AMAT2450', course_title_abbr: 'Physical Chemistry Laboratory' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })
    const visible = buildCourseUniverseVisibleComponentSet({
      components: detachedRelationComponents,
      lines: detachedRelationLines,
      courseNodes,
      selectedPrefix: 'AMAT',
    })

    expect(visible).toContain('AMAT2040')
    expect(visible).toContain('AMAT2450')
    expect(visible).toContain('co_AMAT2040_AMAT2450')
    expect(visible).toContain('co_AMAT2450_AMAT2040')
  })

  it('anchors detached relationship logic nodes to their laid out course cards', () => {
    const visibleIds = new Set(['AMAT2040', 'AMAT2450', 'co_AMAT2040_AMAT2450', 'co_AMAT2450_AMAT2040'])
    const laidOut = layoutCourseUniverseGraphComponents({
      components: detachedRelationComponents,
      lines: detachedRelationLines,
      visibleComponentIds: visibleIds,
    })
    const byId = new Map(laidOut.map(component => [component.id, component]))

    expect(byId.get('co_AMAT2040_AMAT2450')).toMatchObject({
      x_coordinate: (byId.get('AMAT2040')?.x_coordinate || 0) + COURSE_UNIVERSE_COURSE_WIDTH / 2,
      y_coordinate: (byId.get('AMAT2040')?.y_coordinate || 0) + COURSE_UNIVERSE_COURSE_HEIGHT / 2,
    })
    expect(byId.get('co_AMAT2450_AMAT2040')).toMatchObject({
      x_coordinate: (byId.get('AMAT2450')?.x_coordinate || 0) + COURSE_UNIVERSE_COURSE_WIDTH / 2,
      y_coordinate: (byId.get('AMAT2450')?.y_coordinate || 0) + COURSE_UNIVERSE_COURSE_HEIGHT / 2,
    })
  })

  it('routes detached relationship lines through the midpoint of their logic anchors', () => {
    const components = [
      { id: 'co_AMAT2040_AMAT2450', node_type: null, x_coordinate: 196, y_coordinate: 146, category: 2 },
      { id: 'co_AMAT2450_AMAT2040', node_type: null, x_coordinate: 616, y_coordinate: 146, category: 2 },
    ]
    const graph = buildCourseUniverseGraph({
      components,
      lines: [
        { id: 28, start_id: 'co_AMAT2040_AMAT2450', end_id: 'co_AMAT2450_AMAT2040', line_type: null, x_coordinate: 999, category: 2 },
      ],
    })

    expect(graph.lines[0].path).toBe('M 196,146 H 406 V 146 H 616')
  })

  it('keeps detached exclusion relation nodes when focusing a related course', () => {
    const courseNodes = normalizeCourseUniverseNodes({
      components: detachedRelationComponents,
      courses: [
        { course_code: 'UCUG1052', course_title_abbr: 'Academic English' },
        { course_code: 'UCUG1053', course_title_abbr: 'Advanced Academic English' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })
    const visible = buildCourseUniverseVisibleComponentSet({
      components: detachedRelationComponents,
      lines: detachedRelationLines,
      courseNodes,
      selectedCourseCode: 'UCUG1052',
    })

    expect(visible).toContain('UCUG1052')
    expect(visible).toContain('ex_UCUG1052_UCUG1053')
    expect(visible).toContain('ex_UCUG1053_UCUG1052')
  })

  it('does not expand detached relations for cross-prefix neighbor courses', () => {
    const courseNodes = normalizeCourseUniverseNodes({
      components: crossPrefixRelationComponents,
      courses: [
        { course_code: 'UCUG1051', course_title_abbr: 'Core A' },
        { course_code: 'DLED3010', course_title_abbr: 'English Communication I' },
        { course_code: 'DLED3020', course_title_abbr: 'English Communication II' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })
    const visible = buildCourseUniverseVisibleComponentSet({
      components: crossPrefixRelationComponents,
      lines: crossPrefixRelationLines,
      courseNodes,
      selectedPrefix: 'UCUG',
    })

    expect(visible).toContain('UCUG1051')
    expect(visible).toContain('DLED3010')
    expect(visible).not.toContain('DLED3020')
    expect(visible).not.toContain('co_DLED3010_DLED3020')
    expect(visible).not.toContain('co_DLED3020_DLED3010')
  })

  it('traverses complete relationship chains for hover highlighting', () => {
    const highlighted = buildCourseUniverseHighlightSet({
      startId: 'UCUG1051',
      components: graphComponents,
      lines: graphLines,
    })

    expect(highlighted.componentIds).toContain('(UCUG1051|UFUG1101)')
    expect(highlighted.componentIds).toContain('UFUG1101')
    expect(highlighted.lineIds).toContain(10)
    expect(highlighted.lineIds).toContain(11)
  })

  it('normalizes copied course components to their selectable course code', () => {
    const nodes = normalizeCourseUniverseNodes({
      components: [
        { id: 'DLED4010[2]', node_type: null, x_coordinate: 5237, y_coordinate: 721, category: 0 },
      ],
      courses: [
        { course_code: 'DLED4010', course_title_abbr: 'Capstone Project' },
      ],
      academicRecords: [],
      plannerCourses: [],
    })

    expect(nodes[0]).toMatchObject({
      code: 'DLED4010',
      componentId: 'DLED4010[2]',
      displayCode: 'DLED 4010',
      title: 'Capstone Project',
    })
  })
})
