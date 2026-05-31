<!-- front-end/components/scheduler/SchedulerMap.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface MapComponent {
  id: string
  node_type: boolean | null
  x_coordinate: number
  y_coordinate: number
  category: number
}

interface MapLine {
  id: number
  start_id: string
  end_id: string
  line_type: boolean | null
  x_coordinate: number
  category: number
}

const components = ref<MapComponent[]>([])
const lines = ref<MapLine[]>([])
const searchQuery = ref('')
const hoveredId = ref<string | null>(null)
const loading = ref(true)

// Fetch data
onMounted(async () => {
  try {
    const [compResp, lineResp] = await Promise.all([
      fetch('/api/scheduler/map/components'),
      fetch('/api/scheduler/map/lines'),
    ])
    components.value = await compResp.json()
    lines.value = await lineResp.json()
  } finally {
    loading.value = false
  }
})

// Build adjacency for hover highlighting
const adjacency = computed(() => {
  const adj: Record<string, Set<string>> = {}
  for (const comp of components.value) {
    adj[comp.id] = new Set()
  }
  for (const line of lines.value) {
    adj[line.start_id]?.add(line.end_id)
    adj[line.end_id]?.add(line.start_id)
  }
  return adj
})

// BFS from hovered node
const highlightedIds = computed(() => {
  if (!hoveredId.value) return new Set<string>()
  const visited = new Set<string>()
  const queue = [hoveredId.value]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    for (const neighbor of adjacency.value[current] || []) {
      if (!visited.has(neighbor)) queue.push(neighbor)
    }
  }
  return visited
})

const componentMap = computed(() => {
  const map: Record<string, MapComponent> = {}
  for (const comp of components.value) {
    map[comp.id] = comp
  }
  return map
})

const filteredComponents = computed(() => {
  if (!searchQuery.value) return components.value
  const q = searchQuery.value.toLowerCase()
  return components.value.filter(c => c.id.toLowerCase().includes(q))
})

const filteredIds = computed(() => {
  if (!searchQuery.value) return null
  return new Set(filteredComponents.value.map(c => c.id))
})

const filteredLines = computed(() => {
  if (!filteredIds.value) return lines.value
  return lines.value.filter(l => filteredIds.value!.has(l.start_id) && filteredIds.value!.has(l.end_id))
})

function isHighlighted(id: string): boolean {
  return highlightedIds.value.has(id)
}

function isLineHighlighted(line: MapLine): boolean {
  return isHighlighted(line.start_id) && isHighlighted(line.end_id)
}

function getLineColor(line: MapLine): string {
  if (line.category === 2) return '#3b82f6' // co-req blue
  if (line.category === 3) return '#ef4444' // exclusion red
  return '#374151' // prerequisite dark
}

function getLineDash(line: MapLine): string {
  return line.line_type ? '' : '6,4'
}

function getNodeColor(comp: MapComponent): string {
  if (comp.category === 1) return '#000' // junction
  if (comp.category === 2) return '#3b82f6' // co-req junction
  if (comp.category === 3) return '#ef4444' // exclusion junction
  // course node - color by subject (first 4 chars of id)
  const subject = comp.id.slice(0, 4)
  const subjects = ['UCUG', 'UFUG', 'AIAA', 'DSAA', 'SMMG', 'FTEC', 'DLED', 'AMAT', 'BSBE', 'CMAA', 'CNCC', 'CNGF', 'EOAS', 'FUNH', 'INFH', 'INTR', 'IOTA', 'IPEN', 'LANG', 'MICS', 'MSSM', 'PDEV', 'PLED', 'ROAS', 'SEEN', 'SOCH', 'SYSH', 'UCMP', 'UGOD']
  const idx = subjects.indexOf(subject)
  const hue = idx >= 0 ? (idx * 360 / subjects.length) : 0
  return `hsl(${hue}, 55%, 45%)`
}
</script>

<template>
  <div class="map-page">
    <div v-if="loading" class="map-page__loading">Loading map...</div>
    <template v-else>
      <!-- Search bar -->
      <div class="map-page__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search courses..."
          class="map-page__input"
        />
      </div>

      <!-- SVG Map -->
      <div class="map-page__canvas">
        <svg width="6000" height="2400" viewBox="0 0 6000 2400">
          <!-- Lines -->
          <g>
            <line
              v-for="line in filteredLines"
              :key="line.id"
              :x1="componentMap[line.start_id]?.x_coordinate || 0"
              :y1="componentMap[line.start_id]?.y_coordinate || 0"
              :x2="componentMap[line.end_id]?.x_coordinate || 0"
              :y2="componentMap[line.end_id]?.y_coordinate || 0"
              :stroke="getLineColor(line)"
              :stroke-width="isLineHighlighted(line) ? 3 : 1.5"
              :stroke-dasharray="getLineDash(line)"
              :opacity="hoveredId ? (isLineHighlighted(line) ? 1 : 0.2) : 0.6"
            />
          </g>

          <!-- Components -->
          <g>
            <template v-for="comp in filteredComponents" :key="comp.id">
              <!-- Junction point -->
              <circle
                v-if="comp.category !== 0"
                :cx="comp.x_coordinate"
                :cy="comp.y_coordinate"
                :r="comp.category === 1 ? 5 : 3"
                :fill="getNodeColor(comp)"
                :opacity="hoveredId ? (isHighlighted(comp.id) ? 1 : 0.2) : 0.8"
              />
              <!-- Course node -->
              <g
                v-else
                :transform="`translate(${comp.x_coordinate - 210}, ${comp.y_coordinate - 30})`"
                @mouseenter="hoveredId = comp.id"
                @mouseleave="hoveredId = null"
                style="cursor: pointer"
              >
                <rect
                  width="420" height="60" rx="8"
                  :fill="getNodeColor(comp)"
                  :opacity="hoveredId ? (isHighlighted(comp.id) ? 1 : 0.2) : 0.85"
                  :stroke="hoveredId === comp.id ? '#000' : 'none'"
                  stroke-width="2"
                />
                <text
                  x="12" y="28"
                  fill="white"
                  font-size="16"
                  font-weight="bold"
                >{{ comp.id }}</text>
                <text
                  x="12" y="48"
                  fill="rgba(255,255,255,0.8)"
                  font-size="13"
                >{{ comp.id }}</text>
              </g>
            </template>
          </g>
        </svg>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.map-page {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-tertiary);
  }

  &__search {
    padding: 0.75rem;
    position: absolute;
    top: 72px;
    left: 80px;
    z-index: 10;
  }

  &__input {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-primary);
    border-radius: 10px;
    width: 280px;
    font-size: 0.85rem;
    background: var(--surface-primary);
    color: var(--text-primary);
    box-shadow: var(--shadow-medium);
    outline: none;

    &:focus {
      border-color: #2563eb;
    }
  }

  &__canvas {
    flex: 1;
    overflow: auto;
    background: var(--surface-primary);

    svg {
      display: block;
    }
  }
}
</style>
