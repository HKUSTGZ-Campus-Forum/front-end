import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  COURSE_UNIVERSE_ALIAS_PREFIXES,
  COURSE_UNIVERSE_COURSE_HEIGHT,
  COURSE_UNIVERSE_COURSE_WIDTH,
  COURSE_UNIVERSE_MODES,
  buildCourseUniverseGraph,
  buildCourseUniverseHighlightSet,
  buildCourseUniverseModePath,
  buildCourseUniversePrefixOptions,
  buildCourseUniverseVisibleComponentSet,
  buildCourseUniverseVisibleCodeSet,
  createReadableCourseUniverseViewport,
  fitCourseUniverseViewport,
  getCourseUniverseRedirect,
  getCourseUniverseLineStyle,
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

    expect(viewport.centerX).toBe(4200)
    expect(viewport.centerY).toBe(1200)
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
