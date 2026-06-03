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
  componentId: string
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

export interface CourseUniverseRenderComponent {
  id: string
  kind: 'course' | 'logic'
  category: number
  courseCode: string | null
  x: number
  y: number
  width: number
  height: number
  hollow: boolean
}

export interface CourseUniverseRenderLine {
  id: number
  startId: string
  endId: string
  category: number
  lineType: boolean | null
  path: string
  arrowPaths: string[]
  tone: 'prerequisite' | 'corequisite' | 'exclusion'
  dashed: boolean
}

export interface CourseUniverseGraph {
  components: CourseUniverseRenderComponent[]
  lines: CourseUniverseRenderLine[]
}

export const COURSE_UNIVERSE_COURSE_WIDTH = 192
export const COURSE_UNIVERSE_COURSE_HEIGHT = 92
export const COURSE_UNIVERSE_NODE_WORLD_WIDTH = COURSE_UNIVERSE_COURSE_WIDTH
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
  return String(code || '').replace(/[^A-Za-z0-9]+/g, '').toUpperCase()
}

export function getCourseUniverseComponentCourseCode(componentId: string) {
  return compactCourseCode(componentId).replace(/\[\d+\]$/, '')
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

export function getCourseUniverseLineStyle(input: {
  category: number
  lineType: boolean | null
}) {
  return {
    tone: input.category === 2
      ? 'corequisite' as const
      : input.category === 3
        ? 'exclusion' as const
        : 'prerequisite' as const,
    dashed: !(
      (input.category <= 2 && input.lineType === false)
      || (input.category === 3 && input.lineType === true)
    ),
  }
}

function getCourseUniverseLinePoint(
  component: CourseUniverseMapComponent,
  edge: 'start' | 'end',
) {
  if (component.category !== 0) {
    return { x: component.x_coordinate, y: component.y_coordinate }
  }
  return {
    x: component.x_coordinate + (edge === 'start' ? COURSE_UNIVERSE_COURSE_WIDTH : 0),
    y: component.y_coordinate + COURSE_UNIVERSE_COURSE_HEIGHT / 2,
  }
}

function buildCourseUniverseArrowPath(
  x: number,
  y: number,
  direction: 'up' | 'down' | 'left' | 'right',
) {
  if (direction === 'up') return `M ${x - 4},${y - 4} L ${x},${y} L ${x + 4},${y - 4}`
  if (direction === 'down') return `M ${x - 4},${y + 4} L ${x},${y} L ${x + 4},${y + 4}`
  if (direction === 'left') return `M ${x + 4},${y - 4} L ${x},${y} L ${x + 4},${y + 4}`
  return `M ${x - 4},${y - 4} L ${x},${y} L ${x - 4},${y + 4}`
}

function buildCourseUniverseRepeatedArrows(
  start: number,
  end: number,
  fixed: number,
  axis: 'horizontal' | 'vertical',
) {
  if (start === end) return []
  const distance = Math.abs(end - start)
  const count = Math.max(1, Math.floor(distance / 60))
  const direction = axis === 'vertical'
    ? start < end ? 'up' as const : 'down' as const
    : start < end ? 'right' as const : 'left' as const
  const step = (end - start) / (count + 1)
  return Array.from({ length: count }, (_, index) => {
    const moving = start + step * (index + 1)
    return axis === 'vertical'
      ? buildCourseUniverseArrowPath(fixed, moving, direction)
      : buildCourseUniverseArrowPath(moving, fixed, direction)
  })
}

function buildCourseUniverseLineArrows(input: {
  category: number
  lineType: boolean | null
  startX: number
  startY: number
  endX: number
  endY: number
  elbowX: number
}) {
  const arrows = []
  if (input.category === 1 || input.category === 2 || (input.category === 3 && !input.lineType)) {
    arrows.push(...buildCourseUniverseRepeatedArrows(input.startY, input.endY, input.elbowX, 'vertical'))
  }
  if (input.category === 2 || (input.category === 3 && !input.lineType)) {
    arrows.push(...buildCourseUniverseRepeatedArrows(input.startX, input.elbowX, input.startY, 'horizontal'))
    arrows.push(...buildCourseUniverseRepeatedArrows(input.elbowX, input.endX, input.endY, 'horizontal'))
  }
  if (input.category === 3 && input.lineType) {
    if (Math.abs(input.elbowX - input.startX) >= 5) {
      arrows.push(buildCourseUniverseArrowPath(
        input.startX,
        input.startY,
        input.elbowX > input.startX ? 'left' : 'right',
      ))
    } else if (Math.abs(input.endY - input.startY) >= 5) {
      arrows.push(buildCourseUniverseArrowPath(
        input.elbowX,
        input.startY,
        input.endY > input.startY ? 'down' : 'up',
      ))
    }
    if (Math.abs(input.elbowX - input.endX) >= 5) {
      arrows.push(buildCourseUniverseArrowPath(
        input.endX,
        input.endY,
        input.elbowX > input.endX ? 'left' : 'right',
      ))
    } else if (Math.abs(input.startY - input.endY) >= 5) {
      arrows.push(buildCourseUniverseArrowPath(
        input.elbowX,
        input.endY,
        input.startY > input.endY ? 'down' : 'up',
      ))
    }
  }
  return arrows
}

export function buildCourseUniverseGraph(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
}): CourseUniverseGraph {
  const componentById = new Map(input.components.map(component => [component.id, component]))
  const components = input.components.map(component => ({
    id: component.id,
    kind: component.category === 0 ? 'course' as const : 'logic' as const,
    category: component.category,
    courseCode: component.category === 0 ? getCourseUniverseComponentCourseCode(component.id) : null,
    x: component.x_coordinate,
    y: component.y_coordinate,
    width: component.category === 0 ? COURSE_UNIVERSE_COURSE_WIDTH : 0,
    height: component.category === 0 ? COURSE_UNIVERSE_COURSE_HEIGHT : 0,
    hollow: Boolean(component.node_type),
  }))
  const lines = input.lines.flatMap(line => {
    const start = componentById.get(line.start_id)
    const end = componentById.get(line.end_id)
    if (!start || !end) return []
    const startPoint = getCourseUniverseLinePoint(start, 'start')
    const endPoint = getCourseUniverseLinePoint(end, 'end')
    return [{
      id: line.id,
      startId: line.start_id,
      endId: line.end_id,
      category: line.category,
      lineType: line.line_type,
      path: `M ${startPoint.x},${startPoint.y} H ${line.x_coordinate} V ${endPoint.y} H ${endPoint.x}`,
      arrowPaths: buildCourseUniverseLineArrows({
        category: line.category,
        lineType: line.line_type,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: endPoint.x,
        endY: endPoint.y,
        elbowX: line.x_coordinate,
      }),
      ...getCourseUniverseLineStyle({ category: line.category, lineType: line.line_type }),
    }]
  })
  return { components, lines }
}

function getCourseUniverseVisibleIds(
  components: CourseUniverseMapComponent[],
  visibleComponentIds?: Set<string>,
) {
  return visibleComponentIds || new Set(components.map(component => component.id))
}

function getCourseUniverseCourseDegree(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
  visibleIds: Set<string>
}) {
  const courseIds = new Set(input.components
    .filter(component => component.category === 0)
    .map(component => component.id))
  const degree = new Map<string, number>()
  input.components.forEach(component => {
    if (component.category === 0) degree.set(component.id, 0)
  })
  input.lines.forEach(line => {
    if (!input.visibleIds.has(line.start_id) || !input.visibleIds.has(line.end_id)) return
    if (courseIds.has(line.start_id)) degree.set(line.start_id, (degree.get(line.start_id) || 0) + 1)
    if (courseIds.has(line.end_id)) degree.set(line.end_id, (degree.get(line.end_id) || 0) + 1)
  })
  return degree
}

function groupCourseUniverseColumns(components: CourseUniverseMapComponent[], threshold = 96) {
  const columns: CourseUniverseMapComponent[][] = []
  const sorted = [...components].sort((a, b) => a.x_coordinate - b.x_coordinate || a.y_coordinate - b.y_coordinate || a.id.localeCompare(b.id))
  sorted.forEach(component => {
    const lastColumn = columns[columns.length - 1]
    const averageX = lastColumn
      ? lastColumn.reduce((sum, item) => sum + item.x_coordinate, 0) / lastColumn.length
      : null
    if (lastColumn && averageX !== null && Math.abs(component.x_coordinate - averageX) <= threshold) {
      lastColumn.push(component)
      return
    }
    columns.push([component])
  })
  return columns
}

function getCourseUniverseAlignedColumnX(column: CourseUniverseMapComponent[]) {
  const sortedX = column.map(component => component.x_coordinate).sort((a, b) => a - b)
  return Math.round(sortedX[Math.floor(sortedX.length / 2)])
}

export function layoutCourseUniverseGraphComponents(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
  visibleComponentIds?: Set<string>
}): CourseUniverseMapComponent[] {
  const visibleIds = getCourseUniverseVisibleIds(input.components, input.visibleComponentIds)
  const degree = getCourseUniverseCourseDegree({
    components: input.components,
    lines: input.lines,
    visibleIds,
  })
  const laidOut = new Map(input.components.map(component => [component.id, { ...component }]))
  const visibleCourses = input.components.filter(component => component.category === 0 && visibleIds.has(component.id))
  const connectedCourses = visibleCourses.filter(component => (degree.get(component.id) || 0) > 0)
  const isolatedCourses = visibleCourses.filter(component => (degree.get(component.id) || 0) === 0)
  const minVerticalGap = COURSE_UNIVERSE_COURSE_HEIGHT + 24

  groupCourseUniverseColumns(connectedCourses).forEach(column => {
    const columnX = getCourseUniverseAlignedColumnX(column)
    let previousY = Number.NEGATIVE_INFINITY
    column
      .sort((a, b) => a.y_coordinate - b.y_coordinate || a.x_coordinate - b.x_coordinate || a.id.localeCompare(b.id))
      .forEach(component => {
        const next = laidOut.get(component.id)
        if (!next) return
        next.x_coordinate = columnX
        next.y_coordinate = Math.max(component.y_coordinate, previousY + minVerticalGap)
        previousY = next.y_coordinate
      })
  })

  if (isolatedCourses.length) {
    const visibleLaidOutCourses = [...laidOut.values()].filter(component => (
      component.category === 0
      && visibleIds.has(component.id)
      && (degree.get(component.id) || 0) > 0
    ))
    const connectedMinX = visibleLaidOutCourses.length
      ? Math.min(...visibleLaidOutCourses.map(component => component.x_coordinate))
      : Math.min(...isolatedCourses.map(component => component.x_coordinate))
    const connectedMaxY = visibleLaidOutCourses.length
      ? Math.max(...visibleLaidOutCourses.map(component => component.y_coordinate))
      : Math.min(...isolatedCourses.map(component => component.y_coordinate)) - COURSE_UNIVERSE_COURSE_HEIGHT - 160
    const columnCount = isolatedCourses.length >= 7
      ? 4
      : isolatedCourses.length >= 4
        ? 3
        : Math.max(1, isolatedCourses.length)
    const columnGap = COURSE_UNIVERSE_COURSE_WIDTH + 92
    const rowGap = COURSE_UNIVERSE_COURSE_HEIGHT + 36
    const startX = Math.round(connectedMinX)
    const startY = Math.round(connectedMaxY + COURSE_UNIVERSE_COURSE_HEIGHT + 160)

    isolatedCourses
      .sort((a, b) => getCourseUniverseComponentCourseCode(a.id).localeCompare(
        getCourseUniverseComponentCourseCode(b.id),
        undefined,
        { numeric: true },
      ))
      .forEach((component, index) => {
        const next = laidOut.get(component.id)
        if (!next) return
        next.x_coordinate = startX + (index % columnCount) * columnGap
        next.y_coordinate = startY + Math.floor(index / columnCount) * rowGap
      })
  }

  return input.components.map(component => laidOut.get(component.id) || component)
}

function buildCourseUniverseComponentAdjacency(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
}) {
  const ids = new Set(input.components.map(component => component.id))
  const outgoing = new Map<string, Set<string>>()
  const incoming = new Map<string, Set<string>>()
  input.lines.forEach(line => {
    if (!ids.has(line.start_id) || !ids.has(line.end_id)) return
    if (!outgoing.has(line.start_id)) outgoing.set(line.start_id, new Set())
    if (!incoming.has(line.end_id)) incoming.set(line.end_id, new Set())
    outgoing.get(line.start_id)?.add(line.end_id)
    incoming.get(line.end_id)?.add(line.start_id)
  })
  return { incoming, outgoing }
}

function traverseCourseUniverseComponents(startId: string, adjacency: Map<string, Set<string>>) {
  const result = new Set<string>()
  const queue = [...(adjacency.get(startId) || [])]
  while (queue.length) {
    const id = queue.shift()
    if (!id || result.has(id)) continue
    result.add(id)
    adjacency.get(id)?.forEach(nextId => {
      if (!result.has(nextId)) queue.push(nextId)
    })
  }
  return result
}

function traverseCourseUniverseDirectPaths(
  startId: string,
  adjacency: Map<string, Set<string>>,
  courseComponentIds: Set<string>,
  seedIds: Set<string>,
) {
  const result = new Set<string>()
  const queue = [...(adjacency.get(startId) || [])]
  while (queue.length) {
    const id = queue.shift()
    if (!id || result.has(id)) continue
    result.add(id)
    if (courseComponentIds.has(id) && !seedIds.has(id)) continue
    adjacency.get(id)?.forEach(nextId => {
      if (!result.has(nextId)) queue.push(nextId)
    })
  }
  return result
}

export function buildCourseUniverseVisibleComponentSet(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
  courseNodes: CourseUniverseNode[]
  selectedPrefix?: string
  selectedCourseCode?: string | null
  searchQuery?: string
}) {
  const { incoming, outgoing } = buildCourseUniverseComponentAdjacency(input)
  const selectedCode = compactCourseCode(input.selectedCourseCode || '')
  const courseComponentIds = new Set(input.components
    .filter(component => component.category === 0)
    .map(component => component.id))
  const seeds = new Set<string>()
  let directPathsOnly = false

  if (selectedCode) {
    input.components.forEach(component => {
      if (component.category === 0 && getCourseUniverseComponentCourseCode(component.id) === selectedCode) {
        seeds.add(component.id)
      }
    })
  } else if (String(input.searchQuery || '').trim()) {
    directPathsOnly = true
    const query = String(input.searchQuery).trim().toLowerCase()
    input.courseNodes.forEach(node => {
      if (node.displayCode.toLowerCase().includes(query) || node.title.toLowerCase().includes(query)) {
        seeds.add(node.componentId)
      }
    })
  } else if (input.selectedPrefix) {
    directPathsOnly = true
    input.courseNodes.forEach(node => {
      if (getCourseUniverseNodePrefix(node.code) === input.selectedPrefix) {
        seeds.add(node.componentId)
      }
    })
  } else {
    return new Set(input.components.map(component => component.id))
  }

  const result = new Set(seeds)
  seeds.forEach(seed => {
    const upstream = directPathsOnly
      ? traverseCourseUniverseDirectPaths(seed, incoming, courseComponentIds, seeds)
      : traverseCourseUniverseComponents(seed, incoming)
    const downstream = directPathsOnly
      ? traverseCourseUniverseDirectPaths(seed, outgoing, courseComponentIds, seeds)
      : traverseCourseUniverseComponents(seed, outgoing)
    upstream.forEach(id => result.add(id))
    downstream.forEach(id => result.add(id))
  })
  return result
}

export function buildCourseUniverseHighlightSet(input: {
  startId: string
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
}) {
  const { incoming, outgoing } = buildCourseUniverseComponentAdjacency(input)
  const componentIds = new Set<string>([input.startId])
  traverseCourseUniverseComponents(input.startId, incoming).forEach(id => componentIds.add(id))
  traverseCourseUniverseComponents(input.startId, outgoing).forEach(id => componentIds.add(id))
  return {
    componentIds: [...componentIds],
    lineIds: input.lines
      .filter(line => componentIds.has(line.start_id) && componentIds.has(line.end_id))
      .map(line => line.id),
  }
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
      const code = getCourseUniverseComponentCourseCode(component.id)
      const course = coursesByCode.get(code)
      const record = recordsByCode.get(code)

      return {
        componentId: component.id,
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
