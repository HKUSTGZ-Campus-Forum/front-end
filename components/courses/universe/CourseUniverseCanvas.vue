<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  CourseUniverseMapLine,
  CourseUniverseNode,
} from '~/utils/courseUniverse'
import {
  clampCourseUniverseZoom,
  createReadableCourseUniverseViewport,
  fitCourseUniverseViewport,
  getCourseUniverseViewBox,
  type CourseUniverseViewBox,
  type CourseUniverseViewport,
} from '~/utils/courseUniverse'

const props = defineProps<{
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
const dragStart = ref<{
  clientX: number
  clientY: number
  viewport: CourseUniverseViewport
  viewBox: CourseUniverseViewBox
} | null>(null)
let resizeObserver: ResizeObserver | null = null

const nodeByCode = computed(() => new Map(props.nodes.map(node => [node.code, node])))
const query = computed(() => props.searchQuery.trim().toLowerCase())

const matchingNodeCodes = computed(() => {
  if (!query.value) return new Set<string>()
  return new Set(props.nodes
    .filter(node => (
      node.displayCode.toLowerCase().includes(query.value)
      || node.title.toLowerCase().includes(query.value)
    ))
    .map(node => node.code))
})

const visibleNodeCodes = computed(() => {
  if (!query.value) return new Set(props.nodes.map(node => node.code))

  const codes = new Set(matchingNodeCodes.value)
  props.lines.forEach(line => {
    const startCode = compact(line.start_id)
    const endCode = compact(line.end_id)
    if (matchingNodeCodes.value.has(startCode) || matchingNodeCodes.value.has(endCode)) {
      codes.add(startCode)
      codes.add(endCode)
    }
  })
  return codes
})

const visibleNodes = computed(() => {
  return props.nodes.filter(node => visibleNodeCodes.value.has(node.code))
})

const visibleLines = computed(() => props.lines.filter(line => (
  visibleNodeCodes.value.has(compact(line.start_id))
  && visibleNodeCodes.value.has(compact(line.end_id))
  && nodeByCode.value.has(compact(line.start_id))
  && nodeByCode.value.has(compact(line.end_id))
)))

const selectedCode = computed(() => props.nodes.find(node => node.selected)?.code || '')

const relatedNodeCodes = computed(() => {
  const anchorCodes = new Set<string>()
  if (selectedCode.value) anchorCodes.add(selectedCode.value)
  matchingNodeCodes.value.forEach(code => anchorCodes.add(code))
  if (!anchorCodes.size) return new Set<string>()

  const codes = new Set(anchorCodes)
  props.lines.forEach(line => {
    const startCode = compact(line.start_id)
    const endCode = compact(line.end_id)
    if (anchorCodes.has(startCode) || anchorCodes.has(endCode)) {
      codes.add(startCode)
      codes.add(endCode)
    }
  })
  return codes
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
  const hasFocusContext = Boolean(selectedCode.value || matchingNodeCodes.value.size)
  const isRelated = relatedNodeCodes.value.has(node.code)
  return [
    'cu-node',
    `is-${semanticLevel.value}`,
    {
      'is-selected': node.selected,
      'is-matched': matchingNodeCodes.value.has(node.code),
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
    nodes: props.nodes,
    focusQuery: props.searchQuery,
  })
}

function fitFullGraph() {
  viewport.value = fitCourseUniverseViewport({
    nodes: props.nodes,
    canvasSize: canvasSize.value,
  })
}

function focusSelection() {
  viewport.value = createReadableCourseUniverseViewport({
    nodes: props.nodes,
    focusQuery: selectedCode.value || props.searchQuery,
  })
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
  if ((event.target as HTMLElement).closest('.cu-node, .cu-canvas__control')) return
  const svg = svgRef.value
  if (!svg) return
  isDragging.value = true
  dragStart.value = {
    clientX: event.clientX,
    clientY: event.clientY,
    viewport: { ...viewport.value },
    viewBox: getCourseUniverseViewBox(viewport.value, canvasSize.value),
  }
  svg.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value || !dragStart.value || !svgRef.value) return
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

function compact(code: string) {
  return String(code || '').replace(/\s+/g, '').toUpperCase()
}

function hasDistinctTitle(node: CourseUniverseNode) {
  return Boolean(node.title && compact(node.title) !== compact(node.displayCode))
}

watch(() => props.nodes.length, async length => {
  if (!length) return
  await nextTick()
  resetReadableView()
}, { immediate: true })

watch(() => props.searchQuery, value => {
  if (value.trim()) {
    viewport.value = createReadableCourseUniverseViewport({
      nodes: props.nodes,
      focusQuery: value,
    })
  }
})

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
          <line
            v-for="line in visibleLines"
            :key="line.id"
            :x1="nodeByCode.get(compact(line.start_id))?.x || 0"
            :y1="nodeByCode.get(compact(line.start_id))?.y || 0"
            :x2="nodeByCode.get(compact(line.end_id))?.x || 0"
            :y2="nodeByCode.get(compact(line.end_id))?.y || 0"
            :class="[
              'cu-line',
              `is-category-${line.category}`,
              {
                'is-related': relatedNodeCodes.has(compact(line.start_id)) && relatedNodeCodes.has(compact(line.end_id)),
                'is-dimmed': relatedNodeCodes.size && !(relatedNodeCodes.has(compact(line.start_id)) && relatedNodeCodes.has(compact(line.end_id))),
              },
            ]"
          />
        </g>

        <g class="cu-nodes">
          <foreignObject
            v-for="node in visibleNodes"
            :key="node.code"
            :x="node.x - 96"
            :y="node.y - 42"
            width="192"
            height="92"
          >
            <button
              type="button"
              :class="nodeClasses(node)"
              @click="emit('select', node.code)"
            >
              <strong>{{ node.displayCode }}</strong>
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

.cu-canvas__empty {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  min-height: 620px;
}

.cu-canvas__stage {
  height: clamp(640px, calc(100vh - 260px), 780px);
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
  stroke: color-mix(in srgb, var(--text-secondary) 28%, transparent);
  stroke-width: 2;
  transition: opacity 0.18s, stroke 0.18s, stroke-width 0.18s;
}

.cu-line.is-category-2 {
  stroke: color-mix(in srgb, var(--interactive-primary) 58%, transparent);
  stroke-width: 3;
}

.cu-line.is-category-3 {
  stroke: color-mix(in srgb, var(--semantic-warning) 62%, transparent);
  stroke-dasharray: 8 6;
  stroke-width: 3;
}

.cu-line.is-related {
  opacity: 1;
  stroke: color-mix(in srgb, var(--interactive-primary) 78%, var(--text-secondary));
  stroke-width: 4;
}

.cu-line.is-dimmed {
  opacity: 0.16;
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
  min-height: 82px;
  padding: 10px;
  text-align: left;
  transition: background 0.18s, border-color 0.18s, box-shadow 0.18s, opacity 0.18s;
  width: 100%;
}

.cu-node strong {
  font-size: 0.98rem;
  line-height: 1.12;
}

.cu-node span,
.cu-node small {
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.35;
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

@media (max-width: 768px) {
  .cu-canvas,
  .cu-canvas__empty,
  .cu-canvas__stage,
  .cu-canvas__svg {
    min-height: 520px;
    height: 520px;
  }

  .cu-canvas__controls {
    left: 12px;
    right: auto;
    top: 12px;
  }
}
</style>
