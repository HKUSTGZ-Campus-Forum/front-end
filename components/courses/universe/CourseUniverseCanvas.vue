<script setup lang="ts">
import { computed } from 'vue'
import type {
  CourseUniverseMapLine,
  CourseUniverseNode,
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

const nodeByCode = computed(() => new Map(props.nodes.map(node => [node.code, node])))
const query = computed(() => props.searchQuery.trim().toLowerCase())

const visibleNodes = computed(() => {
  if (!query.value) return props.nodes
  return props.nodes.filter(node => (
    node.displayCode.toLowerCase().includes(query.value)
    || node.title.toLowerCase().includes(query.value)
  ))
})

const visibleNodeCodes = computed(() => new Set(visibleNodes.value.map(node => node.code)))

const visibleLines = computed(() => props.lines.filter(line => (
  visibleNodeCodes.value.has(compact(line.start_id))
  && visibleNodeCodes.value.has(compact(line.end_id))
)))

const viewBox = computed(() => {
  if (!props.nodes.length) return '0 0 1200 720'
  const xs = props.nodes.map(node => node.x)
  const ys = props.nodes.map(node => node.y)
  const minX = Math.min(...xs) - 260
  const minY = Math.min(...ys) - 160
  const width = Math.max(...xs) - Math.min(...xs) + 520
  const height = Math.max(...ys) - Math.min(...ys) + 320
  return `${minX} ${minY} ${width} ${height}`
})

function nodeClasses(node: CourseUniverseNode) {
  return [
    'cu-node',
    {
      'is-selected': node.selected,
      'is-completed': node.academicStatus === 'completed',
      'is-in-progress': node.academicStatus === 'in_progress',
      'is-planned': node.academicStatus === 'planned',
      'is-interested': node.academicStatus === 'interested',
      'is-planner': node.inPlanner,
    },
  ]
}

function compact(code: string) {
  return String(code || '').replace(/\s+/g, '').toUpperCase()
}
</script>

<template>
  <section class="cu-canvas" :aria-label="t('courseUniverse.title')">
    <div v-if="nodes.length === 0" class="cu-canvas__empty">
      {{ t('courseUniverse.empty') }}
    </div>

    <svg v-else class="cu-canvas__svg" :viewBox="viewBox" role="img">
      <g class="cu-lines">
        <line
          v-for="line in visibleLines"
          :key="line.id"
          :x1="nodeByCode.get(compact(line.start_id))?.x || 0"
          :y1="nodeByCode.get(compact(line.start_id))?.y || 0"
          :x2="nodeByCode.get(compact(line.end_id))?.x || 0"
          :y2="nodeByCode.get(compact(line.end_id))?.y || 0"
          :class="['cu-line', `is-category-${line.category}`]"
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
            <span>{{ node.title }}</span>
            <small>
              <template v-if="node.inPlanner">{{ t('courseUniverse.legend.inPlanner') }}</template>
              <template v-else-if="node.academicStatus">{{ t(`academicMap.status.${node.academicStatus}`) }}</template>
              <template v-else>{{ t('courseUniverse.selectCourse') }}</template>
            </small>
          </button>
        </foreignObject>
      </g>
    </svg>
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
  min-height: 620px;
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

.cu-canvas__svg {
  display: block;
  height: 620px;
  width: 100%;
}

.cu-line {
  stroke: color-mix(in srgb, var(--text-secondary) 28%, transparent);
  stroke-width: 2;
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
  width: 100%;
}

.cu-node strong {
  font-size: 0.86rem;
}

.cu-node span,
.cu-node small {
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1.35;
}

.cu-node.is-selected {
  border-color: var(--interactive-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--interactive-primary) 18%, transparent), var(--shadow-large);
}

.cu-node.is-completed { border-color: color-mix(in srgb, var(--semantic-success) 45%, var(--border-primary)); }
.cu-node.is-in-progress { border-color: color-mix(in srgb, var(--interactive-primary) 55%, var(--border-primary)); }
.cu-node.is-planned { border-color: color-mix(in srgb, var(--interactive-primary) 50%, var(--border-primary)); }
.cu-node.is-interested { border-color: color-mix(in srgb, var(--text-secondary) 38%, var(--border-primary)); }
.cu-node.is-planner { background: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-primary)); }

@media (max-width: 768px) {
  .cu-canvas,
  .cu-canvas__empty,
  .cu-canvas__svg {
    min-height: 420px;
    height: 420px;
  }
}
</style>
