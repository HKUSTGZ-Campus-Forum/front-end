<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  CourseUniverseMapComponent,
  CourseUniverseMapLine,
  CourseUniverseNode,
} from '~/utils/courseUniverse'
import {
  COURSE_UNIVERSE_COURSE_HEIGHT,
  COURSE_UNIVERSE_COURSE_WIDTH,
  buildCourseUniverseCourseDetailPath,
  buildCourseUniverseGraph,
  buildCourseUniverseHighlightSet,
  buildCourseUniversePrefixOptions,
  buildCourseUniverseSupplementalComponentSet,
  buildCourseUniverseVisibleComponentSet,
  clampCourseUniverseZoom,
  createReadableCourseUniverseViewport,
  fitCourseUniverseViewport,
  getCourseUniverseBounds,
  getCourseUniverseNodeStatusKey,
  getCourseUniverseNodePrefix,
  getCourseUniverseViewBox,
  hasCourseUniversePointerMoved,
  layoutCourseUniverseGraphComponents,
  type CourseUniverseViewBox,
  type CourseUniverseViewport,
} from '~/utils/courseUniverse'

const props = defineProps<{
  components: CourseUniverseMapComponent[]
  nodes: CourseUniverseNode[]
  lines: CourseUniverseMapLine[]
  searchQuery: string
}>()

const emit = defineEmits<{
  (event: 'select', code: string): void
  (event: 'toggle-planner', code: string): void
}>()

const { t } = useI18n()
const { getLocalePath } = useAppLocale()

const svgRef = ref<SVGSVGElement | null>(null)
const canvasSize = ref({ width: 1200, height: 620 })
const viewport = ref<CourseUniverseViewport>({
  centerX: 600,
  centerY: 360,
  zoom: 1,
})
const isDragging = ref(false)
const didDrag = ref(false)
const hoveredId = ref('')
const selectedPrefix = ref('')
const dragStart = ref<{
  clientX: number
  clientY: number
  viewport: CourseUniverseViewport
  viewBox: CourseUniverseViewBox
} | null>(null)
let resizeObserver: ResizeObserver | null = null
const localLayoutMinZoom = 0.66

const query = computed(() => props.searchQuery.trim().toLowerCase())
const selectedCode = computed(() => props.nodes.find(node => node.selected)?.code || '')
const prefixOptions = computed(() => buildCourseUniversePrefixOptions(props.nodes))
const visibleComponentIds = computed(() => {
  return buildCourseUniverseVisibleComponentSet({
    components: props.components,
    lines: props.lines,
    selectedPrefix: selectedPrefix.value,
    selectedCourseCode: selectedCode.value,
    searchQuery: props.searchQuery,
    courseNodes: props.nodes,
  })
})
const supplementalComponentIds = computed(() => {
  return buildCourseUniverseSupplementalComponentSet({
    components: props.components,
    lines: props.lines,
    selectedPrefix: selectedPrefix.value,
    selectedCourseCode: selectedCode.value,
    searchQuery: props.searchQuery,
    courseNodes: props.nodes,
  })
})
const layoutComponents = computed(() => layoutCourseUniverseGraphComponents({
  components: props.components,
  lines: props.lines,
  visibleComponentIds: visibleComponentIds.value,
}))
const layoutComponentById = computed(() => new Map(layoutComponents.value.map(component => [component.id, component])))
const layoutLines = computed(() => props.lines.map((line) => {
  const start = layoutComponentById.value.get(line.start_id)
  const end = layoutComponentById.value.get(line.end_id)
  if (!start || !end) return line
  return {
    ...line,
    x_coordinate: Math.round((start.x_coordinate + end.x_coordinate) / 2),
  }
}))
const graph = computed(() => buildCourseUniverseGraph({
  components: layoutComponents.value,
  lines: layoutLines.value,
}))
const renderComponentById = computed(() => new Map(graph.value.components.map(component => [component.id, component])))

const visibleNodes = computed(() => {
  return props.nodes
    .filter(node => visibleComponentIds.value.has(node.componentId))
    .map(node => {
      const component = layoutComponentById.value.get(node.componentId)
      if (!component) return node
      return {
        ...node,
        x: component.x_coordinate,
        y: component.y_coordinate,
      }
    })
})

const visibleRenderComponents = computed(() => (
  graph.value.components.filter(component => visibleComponentIds.value.has(component.id))
))

const visibleLogicComponents = computed(() => (
  visibleRenderComponents.value.filter(component => (
    component.kind === 'logic'
  ))
))
const visibleViewportNodes = computed<CourseUniverseNode[]>(() => [
  ...visibleNodes.value,
  ...visibleLogicComponents.value.map(component => ({
    componentId: component.id,
    code: component.id,
    displayCode: component.id,
    title: component.id,
    x: component.x,
    y: component.y,
    category: component.category,
    academicStatus: null,
    inPlanner: false,
    selected: false,
  })),
])

const visibleRenderLines = computed(() => (
  graph.value.lines.filter(line => (
    visibleComponentIds.value.has(line.startId)
    && visibleComponentIds.value.has(line.endId)
  ))
))

const matchingComponentIds = computed(() => {
  if (!query.value) return new Set<string>()
  return new Set(visibleNodes.value
    .filter(node => (
      node.displayCode.toLowerCase().includes(query.value)
      || node.title.toLowerCase().includes(query.value)
    ))
    .map(node => node.componentId))
})

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

const relatedComponentIds = computed(() => {
  if (selectedCode.value || matchingComponentIds.value.size) return new Set(visibleComponentIds.value)
  return new Set<string>()
})

const prefixToneByPrefix = computed(() => {
  const prefixes = new Set(props.nodes.map(node => getCourseUniverseNodePrefix(node.code)))
  return new Map([...prefixes].sort().map((prefix, index) => [prefix, index % 8]))
})

const viewBox = computed(() => {
  const box = getCourseUniverseViewBox(viewport.value, canvasSize.value)
  return `${box.x} ${box.y} ${box.width} ${box.height}`
})

const semanticLevel = computed(() => {
  if (viewport.value.zoom < 0.62) return 'far'
  if (viewport.value.zoom < 1.08) return 'mid'
  return 'near'
})

function nodeClasses(node: CourseUniverseNode) {
  const hasFocusContext = Boolean(selectedCode.value || matchingComponentIds.value.size)
  const isRelated = relatedComponentIds.value.has(node.componentId)
  const isSupplemental = isSupplementalComponent(node.componentId)
  const prefix = getCourseUniverseNodePrefix(node.code)
  return [
    'cu-node',
    `is-${semanticLevel.value}`,
    `is-tone-${prefixToneByPrefix.value.get(prefix) || 0}`,
    {
      'is-selected': node.selected,
      'is-matched': matchingComponentIds.value.has(node.componentId),
      'is-related': isRelated,
      'is-supplemental': isSupplemental,
      'is-dimmed': hasFocusContext && !isRelated,
      'is-completed': node.academicStatus === 'completed',
      'is-in-progress': node.academicStatus === 'in_progress',
      'is-not-taken': getCourseUniverseNodeStatusKey(node) === 'notTaken',
      'is-interested': node.academicStatus === 'interested' || node.academicStatus === 'planned',
    },
  ]
}

function resetReadableView() {
  viewport.value = createReadableCourseUniverseViewport({
    nodes: visibleNodes.value,
    focusQuery: props.searchQuery,
  })
}

function fitFullGraph() {
  viewport.value = fitCourseUniverseViewport({
    nodes: visibleViewportNodes.value,
    canvasSize: canvasSize.value,
  })
}

function fitLocalGraph() {
  const nodesForViewport = visibleNodes.value
  const padding = 150
  const nextViewport = fitCourseUniverseViewport({
    nodes: nodesForViewport,
    canvasSize: canvasSize.value,
    padding,
  })
  const zoom = Math.max(nextViewport.zoom, localLayoutMinZoom)
  const bounds = getCourseUniverseBounds(nodesForViewport, padding)
  const clampedBox = getCourseUniverseViewBox({ ...nextViewport, zoom }, canvasSize.value)
  viewport.value = {
    ...nextViewport,
    centerX: bounds.width > clampedBox.width
      ? bounds.minX + clampedBox.width / 2
      : nextViewport.centerX,
    centerY: bounds.height > clampedBox.height
      ? bounds.minY + clampedBox.height / 2
      : nextViewport.centerY,
    zoom,
  }
}

function focusSelection() {
  viewport.value = createReadableCourseUniverseViewport({
    nodes: visibleNodes.value,
    focusQuery: selectedCode.value || props.searchQuery,
  })
}

function selectPrefix(prefix: string) {
  if (selectedCode.value) emit('select', '')
  selectedPrefix.value = prefix
}

function returnToPrefixGraph() {
  emit('select', '')
}

function zoomBy(factor: number) {
  zoomAt(factor)
}

function zoomAt(factor: number, clientX?: number, clientY?: number) {
  const svg = svgRef.value
  if (!svg) {
    viewport.value = {
      ...viewport.value,
      zoom: clampCourseUniverseZoom(viewport.value.zoom * factor),
    }
    return
  }

  const rect = svg.getBoundingClientRect()
  const box = getCourseUniverseViewBox(viewport.value, canvasSize.value)
  const pointX = clientX === undefined ? rect.left + rect.width / 2 : clientX
  const pointY = clientY === undefined ? rect.top + rect.height / 2 : clientY
  const ratioX = (pointX - rect.left) / Math.max(1, rect.width)
  const ratioY = (pointY - rect.top) / Math.max(1, rect.height)
  const worldX = box.x + ratioX * box.width
  const worldY = box.y + ratioY * box.height
  const nextZoom = clampCourseUniverseZoom(viewport.value.zoom * factor)
  const nextBox = getCourseUniverseViewBox({ ...viewport.value, zoom: nextZoom }, canvasSize.value)

  viewport.value = {
    centerX: worldX - ratioX * nextBox.width + nextBox.width / 2,
    centerY: worldY - ratioY * nextBox.height + nextBox.height / 2,
    zoom: nextZoom,
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  zoomAt(event.deltaY > 0 ? 0.88 : 1.12, event.clientX, event.clientY)
}

function handlePointerDown(event: PointerEvent) {
  if ((event.target as Element).closest('.cu-canvas__control')) return
  const svg = svgRef.value
  if (!svg) return
  didDrag.value = false
  dragStart.value = {
    clientX: event.clientX,
    clientY: event.clientY,
    viewport: { ...viewport.value },
    viewBox: getCourseUniverseViewBox(viewport.value, canvasSize.value),
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!dragStart.value || !svgRef.value) return
  if (!isDragging.value) {
    if (!hasCourseUniversePointerMoved(dragStart.value, event)) return
    isDragging.value = true
    didDrag.value = true
    svgRef.value.setPointerCapture(event.pointerId)
  }
  event.preventDefault()
  const rect = svgRef.value.getBoundingClientRect()
  const deltaX = event.clientX - dragStart.value.clientX
  const deltaY = event.clientY - dragStart.value.clientY
  viewport.value = {
    ...dragStart.value.viewport,
    centerX: dragStart.value.viewport.centerX - (deltaX / Math.max(1, rect.width)) * dragStart.value.viewBox.width,
    centerY: dragStart.value.viewport.centerY - (deltaY / Math.max(1, rect.height)) * dragStart.value.viewBox.height,
  }
}

function handlePointerUp(event: PointerEvent) {
  if (svgRef.value?.hasPointerCapture(event.pointerId)) {
    svgRef.value.releasePointerCapture(event.pointerId)
  }
  isDragging.value = false
  dragStart.value = null
}

function handleNodeClick(code: string) {
  if (didDrag.value) {
    didDrag.value = false
    return
  }
  emit('select', code)
}

function handlePlannerToggle(node: CourseUniverseNode) {
  if (didDrag.value) {
    didDrag.value = false
    return
  }
  emit('toggle-planner', node.code)
}

function isRenderComponentDimmed(id: string) {
  return Boolean(hoveredId.value && !highlightedComponentIds.value.has(id))
}

function isRenderLineDimmed(id: number) {
  return Boolean(hoveredId.value && !highlightedLineIds.value.has(id))
}

function compact(code: string) {
  return String(code || '').replace(/\s+/g, '').toUpperCase()
}

function hasDistinctTitle(node: CourseUniverseNode) {
  return Boolean(node.title && compact(node.title) !== compact(node.displayCode))
}

function getNodeX(node: CourseUniverseNode) {
  return renderComponentById.value.get(node.componentId)?.x || 0
}

function getNodeY(node: CourseUniverseNode) {
  return renderComponentById.value.get(node.componentId)?.y || 0
}

function getNodeTitle(node: CourseUniverseNode) {
  if (node.title.length <= 27) return node.title
  return `${node.title.slice(0, 26)}...`
}

function getNodeStatusKey(node: CourseUniverseNode) {
  return getCourseUniverseNodeStatusKey(node)
}

function getNodeStatusClass(node: CourseUniverseNode) {
  return isSupplementalComponent(node.componentId)
    ? 'otherRelation'
    : getNodeStatusKey(node)
}

function getNodeStatusLabel(node: CourseUniverseNode) {
  if (isSupplementalComponent(node.componentId)) return t('courseUniverse.relation.other')
  return t(`courseUniverse.statusShort.${getNodeStatusKey(node)}`)
}

function isSupplementalComponent(componentId: string) {
  return supplementalComponentIds.value.has(componentId)
}

function isSupplementalLine(line: { startId: string, endId: string }) {
  return isSupplementalComponent(line.startId) || isSupplementalComponent(line.endId)
}

function getPlannerCartActionLabel(node: CourseUniverseNode) {
  return node.inPlanner
    ? t('courseUniverse.actions.removeFromPlannerCart')
    : t('courseUniverse.actions.addToPlannerCart')
}

function getNodeDetailPath(node: CourseUniverseNode) {
  return getLocalePath({
    path: buildCourseUniverseCourseDetailPath(node.code),
    query: { from: 'universe' },
  })
}

watch(prefixOptions, options => {
  if (!options.some(option => option.prefix === selectedPrefix.value)) {
    selectedPrefix.value = options[0]?.prefix || ''
  }
}, { immediate: true })

watch([selectedPrefix, selectedCode, visibleNodes, canvasSize], async () => {
  if (!visibleNodes.value.length) return
  await nextTick()
  if (selectedCode.value) {
    focusSelection()
    return
  }
  if (query.value) {
    viewport.value = createReadableCourseUniverseViewport({
      nodes: visibleNodes.value,
      focusQuery: props.searchQuery,
    })
    return
  }
  if (selectedPrefix.value || selectedCode.value) {
    fitLocalGraph()
    return
  }
  resetReadableView()
}, { immediate: true })

onMounted(() => {
  if (!svgRef.value) return
  resizeObserver = new ResizeObserver(entries => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    canvasSize.value = {
      width: Math.max(320, rect.width),
      height: Math.max(360, rect.height),
    }
  })
  resizeObserver.observe(svgRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <section class="cu-canvas" :aria-label="t('courseUniverse.title')">
    <div v-if="prefixOptions.length" class="cu-prefix-bar">
      <button
        v-for="option in prefixOptions"
        :key="option.prefix"
        type="button"
        :class="['cu-prefix-bar__chip', { active: selectedPrefix === option.prefix }]"
        @click="selectPrefix(option.prefix)"
      >
        {{ option.prefix }}
        <span>{{ option.count }}</span>
      </button>
    </div>

    <div class="cu-canvas__context">
      <button
        v-if="selectedCode"
        type="button"
        class="cu-canvas__back"
        @click="returnToPrefixGraph"
      >
        ← {{ t('common.back') }}
      </button>
    </div>

    <div v-if="nodes.length === 0" class="cu-canvas__empty">
      {{ t('courseUniverse.empty') }}
    </div>

    <div v-else class="cu-canvas__stage">
      <div class="cu-canvas__controls" :aria-label="t('courseUniverse.actions.graphControls')">
        <button type="button" class="cu-canvas__control" :title="t('courseUniverse.actions.zoomIn')" :aria-label="t('courseUniverse.actions.zoomIn')" @click="zoomBy(1.16)">
          +
        </button>
        <button type="button" class="cu-canvas__control" :title="t('courseUniverse.actions.zoomOut')" :aria-label="t('courseUniverse.actions.zoomOut')" @click="zoomBy(0.86)">
          -
        </button>
        <button type="button" class="cu-canvas__control" :title="t('courseUniverse.actions.fitGraph')" :aria-label="t('courseUniverse.actions.fitGraph')" @click="fitFullGraph">
          ⤢
        </button>
        <button type="button" class="cu-canvas__control" :title="t('courseUniverse.actions.focusSelection')" :aria-label="t('courseUniverse.actions.focusSelection')" @click="focusSelection">
          ◎
        </button>
      </div>

      <svg
        ref="svgRef"
        :class="['cu-canvas__svg', { 'is-dragging': isDragging }]"
        :viewBox="viewBox"
        role="img"
        @wheel="handleWheel"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
      >
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
                'is-supplemental': isSupplementalLine(line),
                'is-highlighted': highlightedLineIds.has(line.id),
                'is-dimmed': isRenderLineDimmed(line.id),
              },
            ]"
          />
        </g>

        <g class="cu-line-arrows">
          <g
            v-for="line in visibleRenderLines"
            :key="`arrows-${line.id}`"
            :class="[
              `is-${line.tone}`,
              {
                'is-supplemental': isSupplementalLine(line),
                'is-highlighted': highlightedLineIds.has(line.id),
                'is-dimmed': isRenderLineDimmed(line.id),
              },
            ]"
          >
            <path v-for="(path, index) in line.arrowPaths" :key="`${line.id}-${index}`" :d="path" />
          </g>
        </g>

        <g class="cu-logic-nodes">
          <circle
            v-for="component in visibleLogicComponents"
            :key="component.id"
            :cx="component.x"
            :cy="component.y"
            :r="component.category === 1 ? 5 : 3"
            :class="[
              'cu-logic-node',
              `is-category-${component.category}`,
              {
                'is-hollow': component.hollow,
                'is-supplemental': isSupplementalComponent(component.id),
                'is-highlighted': highlightedComponentIds.has(component.id),
                'is-dimmed': isRenderComponentDimmed(component.id),
              },
            ]"
          />
        </g>

        <g class="cu-nodes">
          <g
            v-for="node in visibleNodes"
            :key="node.componentId"
            :class="[
              ...nodeClasses(node),
              {
                'is-highlighted': highlightedComponentIds.has(node.componentId),
                'is-dimmed': isRenderComponentDimmed(node.componentId),
              },
            ]"
            :transform="`translate(${getNodeX(node)}, ${getNodeY(node)})`"
            :aria-label="node.displayCode"
            role="button"
            tabindex="0"
            @mouseenter="hoveredId = node.componentId"
            @mouseleave="hoveredId = ''"
            @pointerdown.stop="handlePointerDown"
            @click="handleNodeClick(node.code)"
            @keydown.enter="handleNodeClick(node.code)"
            @keydown.space.prevent="handleNodeClick(node.code)"
          >
            <rect class="cu-node__card" :width="COURSE_UNIVERSE_COURSE_WIDTH" :height="COURSE_UNIVERSE_COURSE_HEIGHT" rx="12" ry="12" />
            <rect class="cu-node__accent" x="8" y="14" width="4" height="64" rx="2" ry="2" />
            <g class="cu-node__header">
              <text class="cu-node__code" x="20" y="31">{{ node.displayCode }}</text>
              <a
                v-if="semanticLevel === 'near'"
                class="cu-node__detail-link"
                :href="getNodeDetailPath(node)"
                :aria-label="`${node.displayCode} ${t('courseUniverse.actions.showDetails')}`"
                @pointerdown.stop
                @click.stop
              >
                <rect class="cu-node__detail-bg" x="128" y="15" width="48" height="23" rx="11.5" ry="11.5" />
                <text class="cu-node__detail-text" x="152" y="31">
                  {{ t('courseUniverse.actions.detailsShort') }}
                </text>
              </a>
            </g>
            <text v-if="semanticLevel !== 'far' && hasDistinctTitle(node)" class="cu-node__title" x="20" y="54">
              {{ getNodeTitle(node) }}
            </text>
            <g
              v-if="semanticLevel === 'near'"
              :class="['cu-node__status-pill', `is-${getNodeStatusClass(node)}`]"
            >
              <rect class="cu-node__status-bg" x="20" y="66" width="64" height="20" rx="10" ry="10" />
              <text class="cu-node__status-text" x="52" y="79.5">
                {{ getNodeStatusLabel(node) }}
              </text>
            </g>
            <a
              v-if="semanticLevel === 'near'"
              :class="['cu-node__cart-action', { 'is-added': node.inPlanner }]"
              href="#"
              :aria-label="`${node.displayCode} ${getPlannerCartActionLabel(node)}`"
              :data-icon="node.inPlanner ? 'shopping-cart-check' : 'shopping-cart'"
              role="button"
              tabindex="0"
              @pointerdown.stop
              @click.stop.prevent="handlePlannerToggle(node)"
              @keydown.enter.stop.prevent="handlePlannerToggle(node)"
              @keydown.space.stop.prevent="handlePlannerToggle(node)"
            >
              <title>{{ getPlannerCartActionLabel(node) }}</title>
              <rect class="cu-node__cart-bg" x="150" y="63" width="28" height="26" rx="10" ry="10" />
              <path class="cu-node__cart-icon" d="M 157 70 H 159 L 161 79 H 170 L 172 73 H 161" />
              <circle class="cu-node__cart-wheel" cx="163" cy="83" r="1.25" />
              <circle class="cu-node__cart-wheel" cx="169" cy="83" r="1.25" />
              <path v-if="node.inPlanner" class="cu-node__cart-check" d="M 164 75 L 167 78 L 173 72" />
            </a>
          </g>
        </g>
      </svg>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cu-canvas {
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  min-height: clamp(450px, calc(100vh - 300px), 680px);
  overflow: hidden;
  position: relative;
}

.cu-prefix-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 14px 0;
  position: relative;
  z-index: 4;
}

.cu-prefix-bar__chip {
  align-items: center;
  appearance: none;
  background: color-mix(in srgb, var(--surface-primary) 90%, transparent);
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 800;
  gap: 6px;
  min-height: 32px;
  padding: 0 11px;
  transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.18s;
}

.cu-prefix-bar__chip span {
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.cu-prefix-bar__chip:hover,
.cu-prefix-bar__chip.active {
  background: var(--btn-primary-bg);
  border-color: var(--interactive-primary);
  color: var(--text-inverse);
  transform: translateY(-1px);
}

.cu-prefix-bar__chip:hover span,
.cu-prefix-bar__chip.active span {
  color: var(--text-inverse);
}

.cu-canvas__context {
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.78rem;
  font-weight: 800;
  gap: 8px;
  padding: 8px 14px 0;
  position: relative;
  z-index: 4;
}

.cu-canvas__back {
  appearance: none;
  background: var(--btn-primary-bg);
  border: 1px solid var(--interactive-primary);
  border-radius: 999px;
  color: var(--text-inverse);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 5px 10px;
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
}

.cu-canvas__back:hover {
  background: var(--btn-primary-bg-hover);
  border-color: var(--interactive-hover);
  transform: translateY(-1px);
}

.cu-canvas__empty {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  min-height: 450px;
}

.cu-canvas__stage {
  height: clamp(410px, calc(100vh - 350px), 640px);
  position: relative;
}

.cu-canvas__controls {
  background: color-mix(in srgb, var(--surface-primary) 90%, transparent);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  box-shadow: var(--shadow-small);
  display: flex;
  gap: 6px;
  padding: 6px;
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 3;
}

.cu-canvas__control {
  align-items: center;
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
  color: var(--text-primary);
  cursor: pointer;
  display: inline-flex;
  font-size: 1rem;
  font-weight: 800;
  height: 34px;
  justify-content: center;
  line-height: 1;
  transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.18s;
  width: 34px;
}

.cu-canvas__control:hover {
  background: var(--btn-primary-bg);
  border-color: var(--interactive-primary);
  color: var(--text-inverse);
  transform: translateY(-1px);
}

.cu-canvas__svg {
  cursor: grab;
  display: block;
  height: 100%;
  touch-action: none;
  user-select: none;
  width: 100%;
}

.cu-canvas__svg.is-dragging {
  cursor: grabbing;
}

.cu-line {
  fill: none;
  pointer-events: none;
  stroke: var(--text-primary);
  stroke-width: 2;
  transition: opacity 0.18s, stroke 0.18s, filter 0.18s;
}

.cu-line.is-corequisite {
  stroke: var(--semantic-info);
}

.cu-line.is-exclusion {
  stroke: var(--semantic-error);
}

.cu-line.is-supplemental {
  stroke: var(--semantic-warning);
  stroke-dasharray: 4 6;
}

.cu-line.is-dashed {
  stroke-dasharray: 6 5;
}

.cu-line.is-highlighted {
  filter: drop-shadow(0 0 2px color-mix(in srgb, var(--interactive-primary) 22%, transparent));
}

.cu-line.is-dimmed,
.cu-line-arrows .is-dimmed,
.cu-logic-node.is-dimmed {
  opacity: 0.16;
}

.cu-line-arrows {
  fill: none;
  pointer-events: none;
  stroke: var(--text-primary);
  stroke-width: 2;
}

.cu-line-arrows .is-corequisite {
  stroke: var(--semantic-info);
}

.cu-line-arrows .is-exclusion {
  stroke: var(--semantic-error);
}

.cu-line-arrows .is-supplemental {
  stroke: var(--semantic-warning);
}

.cu-line-arrows .is-highlighted {
  opacity: 1;
}

.cu-logic-node {
  fill: var(--text-primary);
  pointer-events: none;
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

.cu-logic-node.is-supplemental {
  fill: color-mix(in srgb, var(--semantic-warning) 10%, var(--surface-primary));
  stroke: var(--semantic-warning);
}

.cu-logic-node.is-highlighted {
  filter: drop-shadow(0 0 2px color-mix(in srgb, var(--interactive-primary) 28%, transparent));
}

.cu-node {
  cursor: pointer;
  outline: none;
  transition: opacity 0.18s;
}

.cu-node__card {
  fill: var(--surface-primary);
  filter: drop-shadow(0 3px 6px color-mix(in srgb, var(--text-primary) 8%, transparent));
  stroke: var(--border-primary);
  stroke-width: 1.25;
  transition: fill 0.18s, stroke 0.18s, filter 0.18s;
}

.cu-node__accent {
  fill: var(--cu-node-accent, var(--interactive-primary));
  opacity: 0.72;
}

.cu-node__code,
.cu-node__title,
.cu-node__detail-text,
.cu-node__status-text {
  pointer-events: none;
  user-select: none;
}

.cu-node__code {
  fill: var(--text-primary);
  font-size: 16px;
  font-weight: 780;
}

.cu-node__title {
  fill: var(--text-secondary);
  font-size: 12px;
}

.cu-node__header {
  pointer-events: none;
}

.cu-node__detail-link {
  cursor: pointer;
  outline: none;
  pointer-events: auto;
}

.cu-node__detail-bg {
  fill: var(--surface-primary);
  stroke: color-mix(in srgb, var(--interactive-primary) 32%, var(--border-primary));
  stroke-width: 1;
  transition: fill 0.18s, stroke 0.18s;
}

.cu-node__detail-text {
  fill: var(--interactive-active);
  font-size: 10px;
  font-weight: 760;
  text-anchor: middle;
}

.cu-node__detail-link:hover .cu-node__detail-bg,
.cu-node__detail-link:focus .cu-node__detail-bg {
  fill: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  stroke: var(--interactive-primary);
}

.cu-node__detail-link:hover .cu-node__detail-text,
.cu-node__detail-link:focus .cu-node__detail-text {
  fill: var(--interactive-active);
}

.cu-node__status-pill {
  pointer-events: none;
}

.cu-node__status-bg {
  fill: color-mix(in srgb, var(--cu-status-color, var(--border-primary)) 8%, var(--surface-primary));
  stroke: color-mix(in srgb, var(--cu-status-color, var(--border-primary)) 34%, var(--border-primary));
  stroke-width: 1;
}

.cu-node__status-text {
  fill: var(--cu-status-text, var(--text-secondary));
  font-size: 10px;
  font-weight: 760;
  text-anchor: middle;
}

.cu-node__status-pill.is-completed {
  --cu-status-color: var(--semantic-success);
  --cu-status-text: var(--semantic-success);
}

.cu-node__status-pill.is-inProgress {
  --cu-status-color: var(--interactive-primary);
  --cu-status-text: var(--interactive-active);
}

.cu-node__status-pill.is-notTaken {
  --cu-status-color: var(--border-primary);
  --cu-status-text: var(--text-secondary);
}

.cu-node__status-pill.is-interested {
  --cu-status-color: var(--text-secondary);
  --cu-status-text: var(--text-secondary);
}

.cu-node__status-pill.is-otherRelation {
  --cu-status-color: var(--semantic-warning);
  --cu-status-text: color-mix(in srgb, var(--semantic-warning) 70%, var(--text-primary));
}

.cu-node__cart-action {
  cursor: pointer;
  outline: none;
  pointer-events: auto;
}

.cu-node__cart-bg {
  fill: var(--surface-primary);
  stroke: color-mix(in srgb, var(--interactive-primary) 30%, var(--border-primary));
  stroke-width: 1;
  transition: fill 0.18s, stroke 0.18s;
}

.cu-node__cart-icon,
.cu-node__cart-check {
  fill: none;
  pointer-events: none;
  stroke: var(--interactive-primary);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.55;
}

.cu-node__cart-wheel {
  fill: var(--interactive-primary);
  pointer-events: none;
}

.cu-node__cart-action:hover .cu-node__cart-bg,
.cu-node__cart-action:focus .cu-node__cart-bg {
  fill: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  stroke: var(--interactive-primary);
}

.cu-node__cart-action.is-added .cu-node__cart-bg {
  fill: var(--interactive-primary);
  stroke: var(--interactive-primary);
}

.cu-node__cart-action.is-added .cu-node__cart-icon,
.cu-node__cart-action.is-added .cu-node__cart-check,
.cu-node__cart-action:hover .cu-node__cart-icon,
.cu-node__cart-action:hover .cu-node__cart-check,
.cu-node__cart-action:focus .cu-node__cart-icon,
.cu-node__cart-action:focus .cu-node__cart-check {
  stroke: var(--interactive-primary);
}

.cu-node__cart-action.is-added .cu-node__cart-icon,
.cu-node__cart-action.is-added .cu-node__cart-check {
  stroke: var(--text-inverse);
}

.cu-node__cart-action:hover .cu-node__cart-wheel,
.cu-node__cart-action:focus .cu-node__cart-wheel {
  fill: var(--interactive-primary);
}

.cu-node__cart-action.is-added .cu-node__cart-wheel {
  fill: var(--text-inverse);
}

.cu-node.is-far .cu-node__code {
  font-size: 18px;
  transform: translateY(18px);
}

.cu-node.is-selected .cu-node__card,
.cu-node:focus .cu-node__card {
  stroke: var(--interactive-primary);
  filter: drop-shadow(0 4px 9px color-mix(in srgb, var(--interactive-primary) 20%, transparent));
}

.cu-node.is-dimmed {
  opacity: 0.34;
}

.cu-node.is-matched .cu-node__card,
.cu-node.is-related .cu-node__card { stroke: color-mix(in srgb, var(--interactive-primary) 62%, var(--border-primary)); }
.cu-node.is-completed .cu-node__card { stroke: color-mix(in srgb, var(--semantic-success) 45%, var(--border-primary)); }
.cu-node.is-in-progress .cu-node__card { stroke: color-mix(in srgb, var(--interactive-primary) 55%, var(--border-primary)); }
.cu-node.is-not-taken .cu-node__card { stroke: var(--border-primary); }
.cu-node.is-interested .cu-node__card { stroke: color-mix(in srgb, var(--text-secondary) 38%, var(--border-primary)); }
.cu-node.is-supplemental .cu-node__card {
  fill: color-mix(in srgb, var(--semantic-warning) 7%, var(--surface-primary));
  stroke: color-mix(in srgb, var(--semantic-warning) 58%, var(--border-primary));
}
.cu-node.is-supplemental .cu-node__accent { fill: var(--semantic-warning); }
.cu-node.is-supplemental .cu-node__code { fill: color-mix(in srgb, var(--semantic-warning) 22%, var(--text-primary)); }

.cu-node.is-tone-0 { --cu-node-accent: var(--interactive-primary); }
.cu-node.is-tone-1 { --cu-node-accent: var(--semantic-success); }
.cu-node.is-tone-2 { --cu-node-accent: var(--semantic-warning); }
.cu-node.is-tone-3 { --cu-node-accent: var(--semantic-info); }
.cu-node.is-tone-4 { --cu-node-accent: var(--text-secondary); }
.cu-node.is-tone-5 { --cu-node-accent: color-mix(in srgb, var(--interactive-primary) 70%, var(--semantic-success)); }
.cu-node.is-tone-6 { --cu-node-accent: color-mix(in srgb, var(--interactive-primary) 60%, var(--semantic-warning)); }
.cu-node.is-tone-7 { --cu-node-accent: color-mix(in srgb, var(--semantic-info) 70%, var(--semantic-success)); }

@media (max-width: 768px) {
  .cu-canvas,
  .cu-canvas__empty,
  .cu-canvas__stage,
  .cu-canvas__svg {
    min-height: 430px;
    height: 430px;
  }

  .cu-canvas__controls {
    left: 12px;
    right: auto;
    top: 8px;
  }
}
</style>
