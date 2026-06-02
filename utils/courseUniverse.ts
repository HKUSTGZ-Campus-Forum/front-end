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

export interface CourseUniverseCanvasSize {
  width: number
  height: number
}

export interface CourseUniverseViewport {
  centerX: number
  centerY: number
  zoom: number
}

export interface CourseUniverseViewBox extends CourseUniverseViewport {
  x: number
  y: number
  width: number
  height: number
}

export interface CourseUniversePrefixOption {
  prefix: string
  count: number
}

export const COURSE_UNIVERSE_NODE_WORLD_WIDTH = 192
export const COURSE_UNIVERSE_READABLE_SCALE = 0.82
export const COURSE_UNIVERSE_MIN_ZOOM = 0.28
export const COURSE_UNIVERSE_FIT_MIN_ZOOM = 0.14
export const COURSE_UNIVERSE_MAX_ZOOM = 2.25
export const COURSE_UNIVERSE_FOCUS_ZOOM = 1.45

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

export function getCourseUniverseNodePrefix(code: string) {
  const match = compactCourseCode(code).match(/^([A-Z]+)\d/)
  return match?.[1] || compactCourseCode(code)
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

export function clampCourseUniverseZoom(zoom: number, minZoom = COURSE_UNIVERSE_MIN_ZOOM) {
  return Math.min(COURSE_UNIVERSE_MAX_ZOOM, Math.max(minZoom, zoom))
}

export function hasCourseUniversePointerMoved(
  start: { clientX: number; clientY: number },
  current: { clientX: number; clientY: number },
  threshold = 5,
) {
  return Math.hypot(current.clientX - start.clientX, current.clientY - start.clientY) > threshold
}

export function getCourseUniverseBounds(nodes: CourseUniverseNode[], padding = 360) {
  if (!nodes.length) {
    return {
      minX: -padding,
      minY: -padding,
      maxX: 1200 + padding,
      maxY: 720 + padding,
      width: 1200 + padding * 2,
      height: 720 + padding * 2,
      centerX: 600,
      centerY: 360,
    }
  }

  const xs = nodes.map(node => node.x)
  const ys = nodes.map(node => node.y)
  const minX = Math.min(...xs) - padding
  const minY = Math.min(...ys) - padding
  const maxX = Math.max(...xs) + padding
  const maxY = Math.max(...ys) + padding
  const width = maxX - minX
  const height = maxY - minY

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  }
}

export function findCourseUniverseFocusNode(nodes: CourseUniverseNode[], focusQuery?: string | null) {
  const query = compactCourseCode(focusQuery || '')
  const normalizedTextQuery = String(focusQuery || '').trim().toLowerCase()
  if (query || normalizedTextQuery) {
    const exactCodeMatch = nodes.find(node => (
      compactCourseCode(node.code) === query || compactCourseCode(node.displayCode) === query
    ))
    if (exactCodeMatch) return exactCodeMatch

    const textMatch = nodes.find(node => (
      node.displayCode.toLowerCase().includes(normalizedTextQuery)
      || node.title.toLowerCase().includes(normalizedTextQuery)
    ))
    if (textMatch) return textMatch
  }

  return nodes.find(node => node.selected) || null
}

export function createReadableCourseUniverseViewport(input: {
  nodes: CourseUniverseNode[]
  focusQuery?: string | null
}): CourseUniverseViewport {
  const focusNode = findCourseUniverseFocusNode(input.nodes, input.focusQuery)
  if (focusNode) {
    return {
      centerX: focusNode.x,
      centerY: focusNode.y,
      zoom: COURSE_UNIVERSE_FOCUS_ZOOM,
    }
  }

  const bounds = getCourseUniverseBounds(input.nodes)
  return {
    centerX: bounds.centerX,
    centerY: bounds.centerY,
    zoom: 1,
  }
}

export function fitCourseUniverseViewport(input: {
  nodes: CourseUniverseNode[]
  canvasSize: CourseUniverseCanvasSize
  padding?: number
}): CourseUniverseViewport {
  const bounds = getCourseUniverseBounds(input.nodes, input.padding)
  const widthScale = input.canvasSize.width / Math.max(1, bounds.width)
  const heightScale = input.canvasSize.height / Math.max(1, bounds.height)
  const fitScale = Math.min(widthScale, heightScale)

  return {
    centerX: bounds.centerX,
    centerY: bounds.centerY,
    zoom: clampCourseUniverseZoom(
      fitScale / COURSE_UNIVERSE_READABLE_SCALE,
      COURSE_UNIVERSE_FIT_MIN_ZOOM,
    ),
  }
}

export function getCourseUniverseViewBox(
  viewport: CourseUniverseViewport,
  canvasSize: CourseUniverseCanvasSize,
): CourseUniverseViewBox {
  const scale = COURSE_UNIVERSE_READABLE_SCALE * clampCourseUniverseZoom(viewport.zoom, COURSE_UNIVERSE_FIT_MIN_ZOOM)
  const width = Math.max(1, canvasSize.width / scale)
  const height = Math.max(1, canvasSize.height / scale)

  return {
    centerX: viewport.centerX,
    centerY: viewport.centerY,
    zoom: viewport.zoom,
    x: viewport.centerX - width / 2,
    y: viewport.centerY - height / 2,
    width,
    height,
  }
}

export function buildCourseUniversePrefixOptions(
  nodes: CourseUniverseNode[],
  limit = 12,
): CourseUniversePrefixOption[] {
  const counts = new Map<string, number>()
  nodes.forEach(node => {
    const prefix = getCourseUniverseNodePrefix(node.code)
    counts.set(prefix, (counts.get(prefix) || 0) + 1)
  })

  return [...counts.entries()]
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix))
    .slice(0, limit)
}

function buildCourseUniverseLineAdjacency(input: {
  nodes: CourseUniverseNode[]
  lines: CourseUniverseMapLine[]
}) {
  const nodeCodes = new Set(input.nodes.map(node => node.code))
  const outgoing = new Map<string, Set<string>>()
  const incoming = new Map<string, Set<string>>()

  input.lines.forEach(line => {
    const startCode = compactCourseCode(line.start_id)
    const endCode = compactCourseCode(line.end_id)
    if (!nodeCodes.has(startCode) || !nodeCodes.has(endCode)) return
    if (!outgoing.has(startCode)) outgoing.set(startCode, new Set())
    if (!incoming.has(endCode)) incoming.set(endCode, new Set())
    outgoing.get(startCode)?.add(endCode)
    incoming.get(endCode)?.add(startCode)
  })

  return { incoming, outgoing }
}

function traverseCourseUniverseGraph(
  startCode: string,
  adjacency: Map<string, Set<string>>,
) {
  const result = new Set<string>()
  const queue = [...(adjacency.get(startCode) || [])]

  while (queue.length) {
    const code = queue.shift()
    if (!code || result.has(code)) continue
    result.add(code)
    adjacency.get(code)?.forEach(nextCode => {
      if (!result.has(nextCode)) queue.push(nextCode)
    })
  }

  return result
}

export function buildCourseUniverseVisibleCodeSet(input: {
  nodes: CourseUniverseNode[]
  lines: CourseUniverseMapLine[]
  selectedPrefix?: string
  selectedCourseCode?: string | null
  searchQuery?: string
}) {
  const nodeCodes = new Set(input.nodes.map(node => node.code))
  const selectedCode = compactCourseCode(input.selectedCourseCode || '')
  const { incoming, outgoing } = buildCourseUniverseLineAdjacency(input)

  if (selectedCode && nodeCodes.has(selectedCode)) {
    const codes = new Set<string>([selectedCode])
    traverseCourseUniverseGraph(selectedCode, incoming).forEach(code => codes.add(code))
    traverseCourseUniverseGraph(selectedCode, outgoing).forEach(code => codes.add(code))
    return codes
  }

  const normalizedQuery = String(input.searchQuery || '').trim().toLowerCase()
  if (normalizedQuery) {
    const matchedCodes = new Set(input.nodes
      .filter(node => (
        node.displayCode.toLowerCase().includes(normalizedQuery)
        || node.title.toLowerCase().includes(normalizedQuery)
      ))
      .map(node => node.code))
    const codes = new Set(matchedCodes)
    matchedCodes.forEach(code => {
      incoming.get(code)?.forEach(nextCode => codes.add(nextCode))
      outgoing.get(code)?.forEach(nextCode => codes.add(nextCode))
    })
    return codes
  }

  if (input.selectedPrefix) {
    const codes = new Set(input.nodes
      .filter(node => getCourseUniverseNodePrefix(node.code) === input.selectedPrefix)
      .map(node => node.code))
    const primaryCodes = new Set(codes)
    input.lines.forEach(line => {
      const startCode = compactCourseCode(line.start_id)
      const endCode = compactCourseCode(line.end_id)
      if (!nodeCodes.has(startCode) || !nodeCodes.has(endCode)) return
      if (primaryCodes.has(startCode) || primaryCodes.has(endCode)) {
        codes.add(startCode)
        codes.add(endCode)
      }
    })
    return codes
  }

  return nodeCodes
}

export function layoutCourseUniverseLocalSubgraph(nodes: CourseUniverseNode[]): CourseUniverseNode[] {
  if (nodes.length <= 1) {
    return nodes.map(node => ({ ...node, x: 600, y: 360 }))
  }

  const sortedNodes = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y || a.code.localeCompare(b.code))
  const sourceColumns: CourseUniverseNode[][] = []
  const columnThreshold = 180

  sortedNodes.forEach(node => {
    const lastColumn = sourceColumns[sourceColumns.length - 1]
    const lastColumnAverageX = lastColumn
      ? lastColumn.reduce((sum, item) => sum + item.x, 0) / lastColumn.length
      : null
    if (lastColumn && lastColumnAverageX !== null && Math.abs(node.x - lastColumnAverageX) <= columnThreshold) {
      lastColumn.push(node)
      return
    }
    sourceColumns.push([node])
  })

  const maxRowsPerColumn = 9
  const renderColumns: CourseUniverseNode[][] = []
  sourceColumns.forEach(column => {
    const sortedColumn = [...column].sort((a, b) => a.y - b.y || a.x - b.x || a.code.localeCompare(b.code))
    for (let index = 0; index < sortedColumn.length; index += maxRowsPerColumn) {
      renderColumns.push(sortedColumn.slice(index, index + maxRowsPerColumn))
    }
  })

  const maxRows = Math.max(...renderColumns.map(column => column.length))
  const columnGap = 270
  const rowGap = 118
  const offsetX = 220
  const offsetY = 170

  return renderColumns.flatMap((column, columnIndex) => {
    const rowOffset = (maxRows - column.length) / 2
    return column.map((node, rowIndex) => ({
      ...node,
      x: offsetX + columnIndex * columnGap,
      y: offsetY + (rowOffset + rowIndex) * rowGap,
    }))
  })
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
