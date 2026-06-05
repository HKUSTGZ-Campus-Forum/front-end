# Course Universe Complete Graph Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the complete scheduler relationship graph inside Course Universe so that course cards, intermediate logic nodes, routed lines, arrows, hover highlighting, clicks, and whole-map dragging behave coherently.

**Architecture:** Extend `utils/courseUniverse.ts` with pure full-graph rendering helpers that adapt the existing scheduler API payload into SVG-ready primitives. Keep `CourseUniverseCanvas.vue` focused on interaction state and rendering, and keep `CourseUniversePage.vue` responsible for loading and passing API data.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, SCSS, SVG, Vitest.

---

## File Structure

- Modify: `tests/course-universe/courseUniverse.test.ts`
  - Add regression coverage for full graph preservation, routed card-edge lines,
    relation semantics, arrow generation, intermediate-node visibility, and
    hover traversal.
- Modify: `utils/courseUniverse.ts`
  - Add full graph render types and pure adapter helpers.
  - Replace course-only visibility traversal with full-component traversal.
  - Keep existing route, status, viewport, and pointer-intent helpers.
- Modify: `components/courses/universe/CourseUniversePage.vue`
  - Pass raw scheduler map components into the canvas.
- Modify: `components/courses/universe/CourseUniverseCanvas.vue`
  - Consume complete graph primitives.
  - Render routed SVG paths, intermediate logic nodes, arrows, and hover state.
  - Preserve click-to-select and drag-to-pan behavior.

## Task 1: Lock The Full Graph Contract With Failing Tests

**Files:**
- Modify: `tests/course-universe/courseUniverse.test.ts`

- [ ] **Step 1: Add imports and graph fixtures**

Add these imports:

```ts
import {
  COURSE_UNIVERSE_COURSE_HEIGHT,
  COURSE_UNIVERSE_COURSE_WIDTH,
  buildCourseUniverseGraph,
  buildCourseUniverseHighlightSet,
  buildCourseUniverseVisibleComponentSet,
  getCourseUniverseLineStyle,
} from '../../utils/courseUniverse'
```

Add these fixtures after `prefixLines`:

```ts
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
```

- [ ] **Step 2: Add failing graph-adapter tests**

Append these tests inside the existing `describe` block:

```ts
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

it('keeps relationship styling distinct across prerequisite, co-requisite, and exclusion lines', () => {
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
```

- [ ] **Step 3: Run the targeted tests and verify RED**

Run:

```bash
npm test -- tests/course-universe/courseUniverse.test.ts
```

Expected: FAIL because the new complete-graph exports do not exist.

- [ ] **Step 4: Commit the failing regression tests**

```bash
git add tests/course-universe/courseUniverse.test.ts
git commit -m "test: cover complete course graph rendering"
```

## Task 2: Implement The Pure Complete-Graph Adapter

**Files:**
- Modify: `utils/courseUniverse.ts`

- [ ] **Step 1: Add render constants and interfaces**

Add after the existing viewport constants:

```ts
export const COURSE_UNIVERSE_COURSE_WIDTH = 192
export const COURSE_UNIVERSE_COURSE_HEIGHT = 92

export interface CourseUniverseRenderComponent {
  id: string
  kind: 'course' | 'logic'
  category: number
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
```

- [ ] **Step 2: Add line-style and routed-path helpers**

Add pure helpers:

```ts
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
```

- [ ] **Step 3: Add arrow-path helpers**

Add:

```ts
function buildCourseUniverseArrowPath(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right') {
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
  const distance = Math.abs(end - start)
  const count = Math.max(0, Math.floor(distance / 60))
  if (!count) return []
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
  if (input.category === 1) {
    return buildCourseUniverseRepeatedArrows(input.startY, input.endY, input.elbowX, 'vertical')
  }
  if (input.category === 2 || (input.category === 3 && !input.lineType)) {
    return [
      ...buildCourseUniverseRepeatedArrows(input.startX, input.elbowX, input.startY, 'horizontal'),
      ...buildCourseUniverseRepeatedArrows(input.startY, input.endY, input.elbowX, 'vertical'),
      ...buildCourseUniverseRepeatedArrows(input.elbowX, input.endX, input.endY, 'horizontal'),
    ]
  }
  if (input.category === 3 && input.lineType) {
    return [
      buildCourseUniverseArrowPath(input.startX, input.startY, input.elbowX > input.startX ? 'left' : 'right'),
      buildCourseUniverseArrowPath(input.endX, input.endY, input.elbowX > input.endX ? 'left' : 'right'),
    ]
  }
  return []
}
```

- [ ] **Step 4: Build SVG-ready components and routed lines**

Add:

```ts
export function buildCourseUniverseGraph(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
}): CourseUniverseGraph {
  const componentById = new Map(input.components.map(component => [component.id, component]))
  const components = input.components.map(component => ({
    id: component.id,
    kind: component.category === 0 ? 'course' as const : 'logic' as const,
    category: component.category,
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
```

- [ ] **Step 5: Add full-component traversal helpers**

Add adjacency helpers that retain logic nodes:

```ts
function buildCourseUniverseComponentAdjacency(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
}) {
  const ids = new Set(input.components.map(component => component.id))
  const outgoing = new Map<string, Set<string>>()
  const incoming = new Map<string, Set<string>>()
  const lineIdsByPair = new Map<string, number[]>()
  input.lines.forEach(line => {
    if (!ids.has(line.start_id) || !ids.has(line.end_id)) return
    if (!outgoing.has(line.start_id)) outgoing.set(line.start_id, new Set())
    if (!incoming.has(line.end_id)) incoming.set(line.end_id, new Set())
    outgoing.get(line.start_id)?.add(line.end_id)
    incoming.get(line.end_id)?.add(line.start_id)
    lineIdsByPair.set(`${line.start_id}\u0000${line.end_id}`, [
      ...(lineIdsByPair.get(`${line.start_id}\u0000${line.end_id}`) || []),
      line.id,
    ])
  })
  return { incoming, outgoing, lineIdsByPair }
}

function traverseCourseUniverseComponents(startId: string, adjacency: Map<string, Set<string>>) {
  const result = new Set<string>()
  const queue = [...(adjacency.get(startId) || [])]
  while (queue.length) {
    const id = queue.shift()
    if (!id || result.has(id)) continue
    result.add(id)
    adjacency.get(id)?.forEach(nextId => queue.push(nextId))
  }
  return result
}
```

- [ ] **Step 6: Add visible-set and hover-set helpers**

Add:

```ts
export function buildCourseUniverseVisibleComponentSet(input: {
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
  courseNodes: CourseUniverseNode[]
  selectedPrefix?: string
  selectedCourseCode?: string | null
  searchQuery?: string
}) {
  const { incoming, outgoing } = buildCourseUniverseComponentAdjacency(input)
  const courseIdByCode = new Map(input.components
    .filter(component => component.category === 0)
    .map(component => [compactCourseCode(component.id), component.id]))
  const selectedId = courseIdByCode.get(compactCourseCode(input.selectedCourseCode || ''))
  const seeds = new Set<string>()

  if (selectedId) seeds.add(selectedId)
  else if (String(input.searchQuery || '').trim()) {
    const query = String(input.searchQuery).trim().toLowerCase()
    input.courseNodes.forEach(node => {
      if (node.displayCode.toLowerCase().includes(query) || node.title.toLowerCase().includes(query)) {
        const id = courseIdByCode.get(node.code)
        if (id) seeds.add(id)
      }
    })
  } else if (input.selectedPrefix) {
    input.courseNodes.forEach(node => {
      if (getCourseUniverseNodePrefix(node.code) === input.selectedPrefix) {
        const id = courseIdByCode.get(node.code)
        if (id) seeds.add(id)
      }
    })
  } else {
    return new Set(input.components.map(component => component.id))
  }

  const result = new Set(seeds)
  seeds.forEach(seed => {
    traverseCourseUniverseComponents(seed, incoming).forEach(id => result.add(id))
    traverseCourseUniverseComponents(seed, outgoing).forEach(id => result.add(id))
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
```

- [ ] **Step 7: Run the targeted tests and verify GREEN**

Run:

```bash
npm test -- tests/course-universe/courseUniverse.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the adapter**

```bash
git add utils/courseUniverse.ts
git commit -m "feat: adapt complete course graph model"
```

## Task 3: Connect The Complete Graph To The Vue Page

**Files:**
- Modify: `components/courses/universe/CourseUniversePage.vue`

- [ ] **Step 1: Pass raw components into the canvas**

Update the canvas call:

```vue
<CourseUniverseCanvas
  :components="components"
  :nodes="nodes"
  :lines="lines"
  :search-query="searchQuery"
  @select="selectedCourseCode = $event"
/>
```

- [ ] **Step 2: Run the production build to expose the missing canvas contract**

Run:

```bash
npm run build
```

Expected: FAIL because `CourseUniverseCanvas.vue` does not yet declare the
`components` prop.

- [ ] **Step 3: Commit the page wiring**

```bash
git add components/courses/universe/CourseUniversePage.vue
git commit -m "feat: pass complete graph data to course canvas"
```

## Task 4: Render Complete Graph Primitives In The Canvas

**Files:**
- Modify: `components/courses/universe/CourseUniverseCanvas.vue`

- [ ] **Step 1: Replace course-only graph imports and props**

Import:

```ts
import type {
  CourseUniverseMapComponent,
  CourseUniverseMapLine,
  CourseUniverseNode,
} from '~/utils/courseUniverse'
import {
  COURSE_UNIVERSE_COURSE_HEIGHT,
  COURSE_UNIVERSE_COURSE_WIDTH,
  buildCourseUniverseGraph,
  buildCourseUniverseHighlightSet,
  buildCourseUniversePrefixOptions,
  buildCourseUniverseVisibleComponentSet,
  clampCourseUniverseZoom,
  createReadableCourseUniverseViewport,
  fitCourseUniverseViewport,
  getCourseUniverseNodePrefix,
  getCourseUniverseViewBox,
  hasCourseUniversePointerMoved,
  type CourseUniverseViewBox,
  type CourseUniverseViewport,
} from '~/utils/courseUniverse'
```

Declare:

```ts
const props = defineProps<{
  components: CourseUniverseMapComponent[]
  nodes: CourseUniverseNode[]
  lines: CourseUniverseMapLine[]
  searchQuery: string
}>()
```

- [ ] **Step 2: Build full-graph computed state**

Replace course-only visible and local-layout state with:

```ts
const hoveredId = ref('')
const graph = computed(() => buildCourseUniverseGraph({
  components: props.components,
  lines: props.lines,
}))
const nodeByCode = computed(() => new Map(props.nodes.map(node => [node.code, node])))
const visibleComponentIds = computed(() => buildCourseUniverseVisibleComponentSet({
  components: props.components,
  lines: props.lines,
  courseNodes: props.nodes,
  selectedPrefix: selectedPrefix.value,
  selectedCourseCode: selectedCode.value,
  searchQuery: props.searchQuery,
}))
const visibleRenderComponents = computed(() => (
  graph.value.components.filter(component => visibleComponentIds.value.has(component.id))
))
const visibleRenderLines = computed(() => (
  graph.value.lines.filter(line => (
    visibleComponentIds.value.has(line.startId)
    && visibleComponentIds.value.has(line.endId)
  ))
))
const highlighted = computed(() => (
  hoveredId.value
    ? buildCourseUniverseHighlightSet({
        startId: hoveredId.value,
        components: props.components,
        lines: props.lines,
      })
    : { componentIds: [], lineIds: [] }
))
const highlightedComponentIds = computed(() => new Set(highlighted.value.componentIds))
const highlightedLineIds = computed(() => new Set(highlighted.value.lineIds))
```

Replace the local-layout branch with raw-coordinate nodes:

```ts
const visibleNodes = computed(() => (
  props.nodes.filter(node => visibleComponentIds.value.has(node.code))
))
const renderedNodes = computed(() => visibleNodes.value)
```

Remove the `usesLocalLayout` computed value and the
`layoutCourseUniverseLocalSubgraph` import. Keep the existing viewport fitting
watcher, which will now fit the raw-coordinate subset without detaching lines
from their intermediate nodes.

- [ ] **Step 3: Add small render predicates**

Add:

```ts
function renderCourseNode(id: string) {
  return nodeByCode.value.get(compact(id))
}

function isRenderComponentDimmed(id: string) {
  return Boolean(hoveredId.value && !highlightedComponentIds.value.has(id))
}

function isRenderLineDimmed(id: number) {
  return Boolean(hoveredId.value && !highlightedLineIds.value.has(id))
}
```

- [ ] **Step 4: Replace straight lines with routed paths**

Render paths before components:

```vue
<g class="cu-lines">
  <path
    v-for="line in visibleRenderLines"
    :key="line.id"
    :d="line.path"
    :class="[
      'cu-line',
      `is-${line.tone}`,
      {
        'is-dashed': line.dashed,
        'is-highlighted': highlightedLineIds.has(line.id),
        'is-dimmed': isRenderLineDimmed(line.id),
      },
    ]"
  />
</g>
```

- [ ] **Step 5: Render logic circles and course cards from the same coordinates**

Render logic nodes:

```vue
<circle
  v-for="component in visibleRenderComponents.filter(item => item.kind === 'logic')"
  :key="component.id"
  :cx="component.x"
  :cy="component.y"
  :r="component.category === 1 ? 5 : 3"
  :class="[
    'cu-logic-node',
    `is-category-${component.category}`,
    {
      'is-hollow': component.hollow,
      'is-highlighted': highlightedComponentIds.has(component.id),
      'is-dimmed': isRenderComponentDimmed(component.id),
    },
  ]"
/>
```

Render cards with their API top-left coordinates:

```vue
<foreignObject
  v-for="component in visibleRenderComponents.filter(item => item.kind === 'course')"
  :key="component.id"
  :x="component.x"
  :y="component.y"
  :width="COURSE_UNIVERSE_COURSE_WIDTH"
  :height="COURSE_UNIVERSE_COURSE_HEIGHT"
>
  <button
    v-if="renderCourseNode(component.id)"
    type="button"
    :class="[
      ...nodeClasses(renderCourseNode(component.id)!),
      {
        'is-highlighted': highlightedComponentIds.has(component.id),
        'is-dimmed': isRenderComponentDimmed(component.id),
      },
    ]"
    @mouseenter="hoveredId = component.id"
    @mouseleave="hoveredId = ''"
    @click="handleNodeClick(renderCourseNode(component.id)!.code)"
  >
    <strong>{{ renderCourseNode(component.id)!.displayCode }}</strong>
    <em v-if="shouldShowPrefixBadge(renderCourseNode(component.id)!)">
      {{ getCourseUniverseNodePrefix(renderCourseNode(component.id)!.code) }}
    </em>
    <span v-if="semanticLevel !== 'far' && hasDistinctTitle(renderCourseNode(component.id)!)">
      {{ renderCourseNode(component.id)!.title }}
    </span>
    <small v-if="semanticLevel === 'near'">
      <template v-if="renderCourseNode(component.id)!.inPlanner">{{ t('courseUniverse.legend.inPlanner') }}</template>
      <template v-else-if="renderCourseNode(component.id)!.academicStatus">{{ t(`academicMap.status.${renderCourseNode(component.id)!.academicStatus}`) }}</template>
      <template v-else>{{ t('courseUniverse.selectCourse') }}</template>
    </small>
  </button>
</foreignObject>
```

- [ ] **Step 6: Add relation and logic-node styles**

Replace category-only line styling with:

```scss
.cu-line {
  fill: none;
  pointer-events: none;
  stroke: var(--text-primary);
  stroke-width: 2;
  transition: opacity 0.18s, stroke 0.18s, stroke-width 0.18s;
}

.cu-line.is-corequisite { stroke: var(--semantic-info); }
.cu-line.is-exclusion { stroke: var(--semantic-error); }
.cu-line.is-dashed { stroke-dasharray: 6 5; }
.cu-line.is-highlighted { stroke-width: 4; }
.cu-line.is-dimmed,
.cu-logic-node.is-dimmed { opacity: 0.16; }

.cu-logic-node {
  fill: var(--text-primary);
  stroke: var(--text-primary);
  stroke-width: 2;
}

.cu-logic-node.is-category-2 {
  fill: var(--semantic-info);
  stroke: var(--semantic-info);
}

.cu-logic-node.is-category-3 {
  fill: var(--semantic-error);
  stroke: var(--semantic-error);
}

.cu-logic-node.is-hollow {
  fill: var(--surface-primary);
}
```

- [ ] **Step 7: Render arrow primitives**

Render arrow paths after the routed relationship paths:

```vue
<g
  v-for="line in visibleRenderLines"
  :key="`arrows-${line.id}`"
  :class="[
    'cu-line-arrows',
    `is-${line.tone}`,
    {
      'is-highlighted': highlightedLineIds.has(line.id),
      'is-dimmed': isRenderLineDimmed(line.id),
    },
  ]"
>
  <path v-for="path in line.arrowPaths" :key="path" :d="path" />
</g>
```

Add:

```scss
.cu-line-arrows {
  fill: none;
  pointer-events: none;
  stroke: var(--text-primary);
  stroke-width: 2;
}

.cu-line-arrows.is-corequisite { stroke: var(--semantic-info); }
.cu-line-arrows.is-exclusion { stroke: var(--semantic-error); }
.cu-line-arrows.is-highlighted { stroke-width: 3; }
.cu-line-arrows.is-dimmed { opacity: 0.16; }
```

- [ ] **Step 8: Run targeted tests and build**

Run:

```bash
npm test -- tests/course-universe/courseUniverse.test.ts
npm run build
```

Expected: both commands PASS.

- [ ] **Step 9: Commit the canvas integration**

```bash
git add components/courses/universe/CourseUniverseCanvas.vue utils/courseUniverse.ts
git commit -m "fix: render complete course relationship graph"
```

## Task 5: Verify The User Workflow In The Browser

**Files:**
- No source files unless verification exposes a defect.

- [ ] **Step 1: Open the Course Universe**

Use the existing frontend dev server at:

```text
http://localhost:3000/courses
```

- [ ] **Step 2: Verify graph rendering visually**

Confirm:

- prerequisite lines attach to course-card edges;
- intermediate logic circles are visible;
- relationship paths use routed elbows instead of floating straight lines;
- prefix switching keeps coherent relationship paths.

- [ ] **Step 3: Verify interactions**

Confirm:

- hovering a course highlights its connected chain;
- clicking a course opens the right detail panel;
- dragging from empty canvas space pans the map;
- dragging from a course card pans the map and does not open the detail panel;
- zoom buttons and wheel zoom remain functional.

- [ ] **Step 4: Capture a verification screenshot**

Take one browser screenshot showing attached paths and logic nodes.

- [ ] **Step 5: Run the final verification suite**

Run:

```bash
npm test -- tests/course-universe/courseUniverse.test.ts
npm run build
git diff --check
git status --short
```

Expected:

- targeted tests PASS;
- production build PASS;
- `git diff --check` prints no whitespace errors;
- only intentional changes remain.

- [ ] **Step 6: Stop the local frontend server**

Stop the process listening on port `3000` after browser verification, then
confirm:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Expected: no listening process.
