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

const props = defineProps<{
  components: CourseUniverseMapComponent[]
  nodes: CourseUniverseNode[]
  lines: CourseUniverseMapLine[]
  searchQuery: string
}>()

const emit = defineEmits<{
  (event: 'select', code: string): void
}>()

const { t } = useI18n()

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
const localLayoutMinZoom = 0.72

const query = computed(() => props.searchQuery.trim().toLowerCase())
const selectedCode = computed(() => props.nodes.find(node => node.selected)?.code || '')
const prefixOptions = computed(() => buildCourseUniversePrefixOptions(props.nodes))
const graph = computed(() => buildCourseUniverseGraph({
  components: props.components,
  lines: props.lines,
}))
const renderComponentById = computed(() => new Map(graph.value.components.map(component => [component.id, component])))
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

const visibleNodes = computed(() => {
  return props.nodes.filter(node => visibleComponentIds.value.has(node.componentId))
})

const visibleRenderComponents = computed(() => (
  graph.value.components.filter(component => visibleComponentIds.value.has(component.id))
))

const visibleLogicComponents = computed(() => (
  visibleRenderComponents.value.filter(component => (
    component.kind === 'logic'
    && !(component.category === 3 && component.hollow)
  ))
))

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
  const prefix = getCourseUniverseNodePrefix(node.code)
  return [
    'cu-node',
    `is-${semanticLevel.value}`,
    `is-tone-${prefixToneByPrefix.value.get(prefix) || 0}`,
    {
      'is-selected': node.selected,
      'is-matched': matchingComponentIds.value.has(node.componentId),
      'is-related': isRelated,
      'is-dimmed': hasFocusContext && !isRelated,
      'is-completed': node.academicStatus === 'completed',
      'is-in-progress': node.academicStatus === 'in_progress',
      'is-planned': node.academicStatus === 'planned',
      'is-interested': node.academicStatus === 'interested',
      'is-planner': node.inPlanner,
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
    nodes: visibleNodes.value,
    canvasSize: canvasSize.value,
  })
}

function fitLocalGraph() {
  const nextViewport = fitCourseUniverseViewport({
    nodes: visibleNodes.value,
    canvasSize: canvasSize.value,
    padding: 150,
  })
  viewport.value = {
    ...nextViewport,
    zoom: Math.max(nextViewport.zoom, localLayoutMinZoom),
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

function shouldShowPrefixBadge(node: CourseUniverseNode) {
  return Boolean(selectedPrefix.value && getCourseUniverseNodePrefix(node.code) !== selectedPrefix.value)
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
      <span v-if="selectedPrefix">{{ selectedPrefix }}</span>
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
                'is-highlighted': highlightedComponentIds.has(component.id),
                'is-dimmed': isRenderComponentDimmed(component.id),
              },
            ]"
          />
        </g>

        <g class="cu-nodes">
          <foreignObject
            v-for="node in visibleNodes"
            :key="node.componentId"
            :x="renderComponentById.get(node.componentId)?.x || 0"
            :y="renderComponentById.get(node.componentId)?.y || 0"
            :width="COURSE_UNIVERSE_COURSE_WIDTH"
            :height="COURSE_UNIVERSE_COURSE_HEIGHT"
          >
            <button
              type="button"
              :class="[
                ...nodeClasses(node),
                {
                  'is-highlighted': highlightedComponentIds.has(node.componentId),
                  'is-dimmed': isRenderComponentDimmed(node.componentId),
                },
              ]"
              @mouseenter="hoveredId = node.componentId"
              @mouseleave="hoveredId = ''"
              @pointerdown.stop="handlePointerDown"
              @click="handleNodeClick(node.code)"
            >
              <strong>{{ node.displayCode }}</strong>
              <em v-if="shouldShowPrefixBadge(node)">
                {{ getCourseUniverseNodePrefix(node.code) }}
              </em>
              <span v-if="semanticLevel !== 'far' && hasDistinctTitle(node)">{{ node.title }}</span>
              <small v-if="semanticLevel === 'near'">
                <template v-if="node.inPlanner">{{ t('courseUniverse.legend.inPlanner') }}</template>
                <template v-else-if="node.academicStatus">{{ t(`academicMap.status.${node.academicStatus}`) }}</template>
                <template v-else>{{ t('courseUniverse.selectCourse') }}</template>
              </small>
            </button>
          </foreignObject>
        </g>
      </svg>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cu-canvas {
  background:
    radial-gradient(circle at 18% 20%, color-mix(in srgb, var(--interactive-primary) 14%, transparent), transparent 26%),
    radial-gradient(circle at 80% 82%, color-mix(in srgb, var(--semantic-success) 12%, transparent), transparent 24%),
    var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 18px;
  min-height: clamp(640px, calc(100vh - 260px), 780px);
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
  background: var(--interactive-primary);
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

.cu-canvas__context span {
  background: color-mix(in srgb, var(--surface-primary) 84%, transparent);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  padding: 5px 10px;
}

.cu-canvas__back {
  appearance: none;
  background: var(--interactive-primary);
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
  background: var(--interactive-hover);
  border-color: var(--interactive-hover);
  transform: translateY(-1px);
}

.cu-canvas__empty {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  min-height: 620px;
}

.cu-canvas__stage {
  height: clamp(610px, calc(100vh - 292px), 750px);
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
  background: var(--interactive-primary);
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
  transition: opacity 0.18s, stroke 0.18s, stroke-width 0.18s;
}

.cu-line.is-corequisite {
  stroke: var(--semantic-info);
}

.cu-line.is-exclusion {
  stroke: var(--semantic-error);
}

.cu-line.is-dashed {
  stroke-dasharray: 6 5;
}

.cu-line.is-highlighted {
  stroke-width: 4;
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

.cu-line-arrows .is-highlighted {
  stroke-width: 3;
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

.cu-logic-node.is-highlighted {
  stroke-width: 3;
}

.cu-node {
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  box-shadow: var(--shadow-medium);
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  gap: 4px;
  height: 100%;
  min-height: 82px;
  padding: 10px;
  position: relative;
  text-align: left;
  transition: background 0.18s, border-color 0.18s, box-shadow 0.18s, opacity 0.18s;
  width: 100%;
}

.cu-node::before {
  background: var(--cu-node-accent, var(--interactive-primary));
  border-radius: 14px 0 0 14px;
  bottom: 0;
  content: '';
  left: 0;
  opacity: 0.88;
  position: absolute;
  top: 0;
  width: 6px;
}

.cu-node strong {
  font-size: 0.98rem;
  line-height: 1.12;
  padding-left: 4px;
}

.cu-node span,
.cu-node small,
.cu-node em {
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.35;
}

.cu-node em {
  background: color-mix(in srgb, var(--cu-node-accent, var(--interactive-primary)) 14%, var(--surface-secondary));
  border: 1px solid color-mix(in srgb, var(--cu-node-accent, var(--interactive-primary)) 34%, var(--border-primary));
  border-radius: 999px;
  color: var(--text-primary);
  font-style: normal;
  font-weight: 800;
  justify-self: start;
  padding: 1px 7px;
}

.cu-node span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cu-node small {
  font-weight: 700;
}

.cu-node.is-far {
  align-content: center;
  min-height: 82px;
}

.cu-node.is-far strong {
  font-size: 1.08rem;
}

.cu-node.is-mid {
  gap: 6px;
}

.cu-node.is-near span {
  white-space: normal;
}

.cu-node.is-selected {
  border-color: var(--interactive-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--interactive-primary) 18%, transparent), var(--shadow-large);
}

.cu-node.is-matched,
.cu-node.is-related {
  border-color: color-mix(in srgb, var(--interactive-primary) 62%, var(--border-primary));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 12%, transparent), var(--shadow-medium);
}

.cu-node.is-dimmed {
  opacity: 0.34;
}

.cu-node.is-completed { border-color: color-mix(in srgb, var(--semantic-success) 45%, var(--border-primary)); }
.cu-node.is-in-progress { border-color: color-mix(in srgb, var(--interactive-primary) 55%, var(--border-primary)); }
.cu-node.is-planned { border-color: color-mix(in srgb, var(--interactive-primary) 50%, var(--border-primary)); }
.cu-node.is-interested { border-color: color-mix(in srgb, var(--text-secondary) 38%, var(--border-primary)); }
.cu-node.is-planner { background: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-primary)); }

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
    min-height: 500px;
    height: 500px;
  }

  .cu-canvas__controls {
    left: 12px;
    right: auto;
    top: 12px;
  }
}
</style>
