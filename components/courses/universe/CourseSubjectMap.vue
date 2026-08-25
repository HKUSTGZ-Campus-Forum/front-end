<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  buildCourseUniverseSubjectGateways,
  getCourseUniverseComponentCourseCode,
  getCourseUniverseNodePrefix,
  getCourseUniverseNodeStatusKey,
  type CourseUniverseMapComponent,
  type CourseUniverseMapLine,
  type CourseUniverseNode,
} from '~/utils/courseUniverse'

const props = defineProps<{
  components: CourseUniverseMapComponent[]
  lines: CourseUniverseMapLine[]
  nodes: CourseUniverseNode[]
  prefix: string
  relationshipCourseCodes: Set<string>
  showProgress: boolean
}>()

const emit = defineEmits<{ (event: 'select', code: string): void }>()
interface SubjectEdge { id: string; from: string; to: string }
interface SubjectLayoutNode { node: CourseUniverseNode; x: number; y: number }

const { t } = useI18n()
const zoom = ref(1)
const showIndependent = ref(false)
const NODE_WIDTH = 190
const NODE_HEIGHT = 78
const BASE_COLUMN_GAP = 244
const ROW_GAP = 108

const subjectNodes = computed(() => props.nodes
  .filter(node => getCourseUniverseNodePrefix(node.code) === props.prefix)
  .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })))

const subjectEdges = computed<SubjectEdge[]>(() => {
  const componentById = new Map(props.components.map(component => [component.id, component]))
  const outgoing = new Map<string, string[]>()
  props.lines.forEach((line) => {
    if (line.category !== 1 || !componentById.has(line.start_id) || !componentById.has(line.end_id)) return
    if (!outgoing.has(line.start_id)) outgoing.set(line.start_id, [])
    outgoing.get(line.start_id)?.push(line.end_id)
  })
  const edges = new Map<string, SubjectEdge>()
  props.components.forEach((component) => {
    if (component.category !== 0) return
    const from = getCourseUniverseComponentCourseCode(component.id)
    if (getCourseUniverseNodePrefix(from) !== props.prefix) return
    const visited = new Set<string>()
    const queue = [...(outgoing.get(component.id) || [])]
    while (queue.length) {
      const nextId = queue.shift()
      if (!nextId || visited.has(nextId)) continue
      visited.add(nextId)
      const next = componentById.get(nextId)
      if (!next) continue
      if (next.category === 0) {
        const to = getCourseUniverseComponentCourseCode(next.id)
        if (to !== from && getCourseUniverseNodePrefix(to) === props.prefix) {
          const key = `${from}:${to}`
          edges.set(key, { id: key, from, to })
        }
        continue
      }
      outgoing.get(nextId)?.forEach(id => queue.push(id))
    }
  })
  return [...edges.values()]
})

const connectedCodes = computed(() => new Set(subjectEdges.value.flatMap(edge => [edge.from, edge.to])))
const connectedNodes = computed(() => subjectNodes.value.filter(node => connectedCodes.value.has(node.code)))
const independentNodes = computed(() => subjectNodes.value.filter(node => !connectedCodes.value.has(node.code)))
const levelGroups = computed(() => {
  const codes = new Set(connectedNodes.value.map(node => node.code))
  const indegree = new Map([...codes].map(code => [code, 0]))
  const outgoing = new Map<string, string[]>()
  subjectEdges.value.forEach((edge) => {
    if (!codes.has(edge.from) || !codes.has(edge.to)) return
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1)
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, [])
    outgoing.get(edge.from)?.push(edge.to)
  })
  const rank = new Map([...codes].map(code => [code, 0]))
  const queue = [...codes].filter(code => (indegree.get(code) || 0) === 0).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const visited = new Set<string>()
  while (queue.length) {
    const code = queue.shift()
    if (!code || visited.has(code)) continue
    visited.add(code)
    ;(outgoing.get(code) || []).forEach((to) => {
      rank.set(to, Math.max(rank.get(to) || 0, (rank.get(code) || 0) + 1))
      indegree.set(to, (indegree.get(to) || 0) - 1)
      if ((indegree.get(to) || 0) === 0) queue.push(to)
    })
  }
  const grouped = new Map<number, CourseUniverseNode[]>()
  connectedNodes.value.forEach((node) => {
    const nodeRank = visited.has(node.code) ? rank.get(node.code) || 0 : 0
    if (!grouped.has(nodeRank)) grouped.set(nodeRank, [])
    grouped.get(nodeRank)?.push(node)
  })
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([rankValue, nodes]) => {
      const sorted = nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      const chunks = []
      for (let index = 0; index < sorted.length; index += 7) chunks.push(sorted.slice(index, index + 7))
      return chunks.map((chunk, chunkIndex) => ({ key: `${rankValue}-${chunkIndex}`, rank: rankValue, nodes: chunk }))
    })
})
const columnGap = computed(() => levelGroups.value.length <= 3 ? 340 : BASE_COLUMN_GAP)
const maxRows = computed(() => Math.max(1, ...levelGroups.value.map(group => group.nodes.length)))
const mapWidth = computed(() => Math.max(920, 112 + Math.max(1, levelGroups.value.length) * columnGap.value))
const mapHeight = computed(() => Math.max(520, 142 + maxRows.value * ROW_GAP))
const gateways = computed(() => buildCourseUniverseSubjectGateways({ components: props.components, lines: props.lines, prefix: props.prefix }).slice(0, 8))
const layoutNodes = computed<SubjectLayoutNode[]>(() => levelGroups.value.flatMap((group, columnIndex) => group.nodes.map((node, rowIndex) => ({ node, x: 66 + columnIndex * columnGap.value, y: 112 + rowIndex * ROW_GAP }))))
const layoutByCode = computed(() => new Map(layoutNodes.value.map(item => [item.node.code, item])))
const renderedEdges = computed(() => subjectEdges.value.flatMap((edge) => {
  const from = layoutByCode.value.get(edge.from)
  const to = layoutByCode.value.get(edge.to)
  if (!from || !to) return []
  const startX = from.x + NODE_WIDTH
  const startY = from.y + NODE_HEIGHT / 2
  const endX = to.x
  const endY = to.y + NODE_HEIGHT / 2
  const bend = Math.abs(endX - startX) < 80 ? Math.max(startX, endX) + 66 : (startX + endX) / 2
  return [{ ...edge, path: `M ${startX} ${startY} C ${bend} ${startY}, ${bend} ${endY}, ${endX} ${endY}` }]
}))
const scaledCanvasStyle = computed(() => ({ height: `${mapHeight.value * zoom.value}px`, width: `${mapWidth.value * zoom.value}px` }))
const worldStyle = computed(() => ({ height: `${mapHeight.value}px`, transform: `scale(${zoom.value})`, width: `${mapWidth.value}px` }))

watch(() => props.prefix, () => { zoom.value = 1; showIndependent.value = false })
function setZoom(next: number) { zoom.value = Math.min(1.2, Math.max(0.72, Number(next.toFixed(2)))) }
function nodeStyle(item: SubjectLayoutNode) { return { left: `${item.x}px`, top: `${item.y}px`, width: `${NODE_WIDTH}px` } }
function nodeClasses(node: CourseUniverseNode) {
  return ['subject-map__course', { [`is-${getCourseUniverseNodeStatusKey(node)}`]: props.showProgress }]
}
</script>

<template>
  <section class="subject-map" :aria-label="t('courseUniverse.redesign.subject.ariaLabel', { subject: prefix })">
    <header class="subject-map__header">
      <div>
        <span><Icon name="lucide:map" aria-hidden="true" />{{ t('courseUniverse.redesign.subject.kicker') }}</span>
        <h3>{{ t('courseUniverse.redesign.subject.title', { subject: prefix }) }}</h3>
        <p>{{ t('courseUniverse.redesign.subject.description') }}</p>
      </div>
      <dl>
        <div><dt>{{ t('courseUniverse.redesign.subject.totalCourses') }}</dt><dd>{{ subjectNodes.length }}</dd></div>
        <div><dt>{{ t('courseUniverse.redesign.subject.withRelationships') }}</dt><dd>{{ connectedNodes.length }}</dd></div>
        <div><dt>{{ t('courseUniverse.redesign.subject.independentCourses') }}</dt><dd>{{ independentNodes.length }}</dd></div>
      </dl>
    </header>

    <div class="subject-map__toolbar">
      <div v-if="gateways.length" class="subject-map__gateways">
        <span>{{ t('courseUniverse.redesign.subject.externalGateways') }}</span>
        <i v-for="gateway in gateways" :key="gateway.prefix"><strong>{{ gateway.prefix }}</strong>{{ t('courseUniverse.redesign.subject.externalCount', { count: gateway.count }) }}</i>
      </div>
      <div class="subject-map__zoom" :aria-label="t('courseUniverse.redesign.subject.zoomControls')">
        <button type="button" :aria-label="t('courseUniverse.redesign.subject.zoomOut')" :disabled="zoom <= 0.72" @click="setZoom(zoom - 0.12)"><Icon name="lucide:minus" aria-hidden="true" /></button>
        <button type="button" @click="setZoom(1)">{{ Math.round(zoom * 100) }}%</button>
        <button type="button" :aria-label="t('courseUniverse.redesign.subject.zoomIn')" :disabled="zoom >= 1.2" @click="setZoom(zoom + 0.12)"><Icon name="lucide:plus" aria-hidden="true" /></button>
      </div>
    </div>

    <div v-if="connectedNodes.length" class="subject-map__viewport">
      <div class="subject-map__canvas" :style="scaledCanvasStyle">
        <div class="subject-map__world" :style="worldStyle">
          <div v-for="(group, index) in levelGroups" :key="group.key" class="subject-map__level-band" :style="{ left: `${40 + index * columnGap}px`, width: `${columnGap}px` }">
            <strong>{{ t('courseUniverse.redesign.subject.pathStage', { stage: index + 1 }) }}</strong>
            <span>{{ t('courseUniverse.redesign.subject.levelCount', { count: group.nodes.length }) }}</span>
          </div>
          <svg class="subject-map__wires" :viewBox="`0 0 ${mapWidth} ${mapHeight}`" aria-hidden="true">
            <defs><marker id="subject-map-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path d="M 0 0 L 7 3.5 L 0 7 Z" /></marker></defs>
            <path v-for="edge in renderedEdges" :key="edge.id" :d="edge.path" marker-end="url(#subject-map-arrow)" />
          </svg>
          <button v-for="item in layoutNodes" :key="item.node.code" type="button" :style="nodeStyle(item)" :class="nodeClasses(item.node)" @click="emit('select', item.node.code)">
            <span class="subject-map__course-icon"><Icon name="lucide:graduation-cap" aria-hidden="true" /></span>
            <span><strong>{{ item.node.displayCode }}</strong><small>{{ item.node.title }}</small></span>
            <i v-if="showProgress"><b aria-hidden="true" />{{ t(`courseUniverse.statusShort.${getCourseUniverseNodeStatusKey(item.node)}`) }}</i>
            <i v-else>{{ t('courseUniverse.explorer.hasRelationships') }}</i>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="subject-map__empty">
      <Icon name="lucide:waypoints" aria-hidden="true" />
      <strong>{{ t('courseUniverse.redesign.subject.noInternalPaths') }}</strong>
      <span>{{ t('courseUniverse.redesign.subject.noInternalPathsHelp') }}</span>
    </div>

    <section v-if="independentNodes.length" class="subject-map__independent">
      <button type="button" :aria-expanded="showIndependent" @click="showIndependent = !showIndependent">
        <span><strong>{{ t('courseUniverse.redesign.subject.independentTitle') }}</strong><small>{{ t('courseUniverse.redesign.subject.independentHelp', { count: independentNodes.length }) }}</small></span>
        <Icon :name="showIndependent ? 'lucide:chevron-up' : 'lucide:chevron-down'" aria-hidden="true" />
      </button>
      <div v-if="showIndependent">
        <button v-for="node in independentNodes" :key="node.code" type="button" @click="emit('select', node.code)">
          <strong>{{ node.displayCode }}</strong><span>{{ node.title }}</span><Icon name="lucide:arrow-up-right" aria-hidden="true" />
        </button>
      </div>
    </section>

    <footer class="subject-map__footer">
      <span><i class="is-path" aria-hidden="true" />{{ t('courseUniverse.redesign.subject.legendPrerequisite') }}</span>
      <span><i class="is-node" aria-hidden="true" />{{ t('courseUniverse.redesign.subject.legendCourse') }}</span>
      <p>{{ t('courseUniverse.redesign.subject.clickHint') }}</p>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.subject-map { background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 14px; overflow: hidden; }
.subject-map__header { align-items: end; display: flex; gap: 24px; justify-content: space-between; padding: 20px; }
.subject-map__header > div > span { align-items: center; color: var(--interactive-active-text); display: flex; font-size: .75rem; font-weight: 750; gap: 6px; }
.subject-map__header h3 { color: var(--text-primary); font-size: 1.25rem; line-height: 1.2; margin: 6px 0 0; }
.subject-map__header p { color: var(--text-secondary); font-size: .875rem; line-height: 1.5; margin: 7px 0 0; max-width: 62ch; }
.subject-map__header dl { display: flex; margin: 0; }
.subject-map__header dl > div { display: grid; gap: 4px; min-width: 92px; padding: 0 14px; }
.subject-map__header dl > div + div { border-left: 1px solid var(--border-secondary); }
.subject-map__header dt { color: var(--text-secondary); font-size: .6875rem; line-height: 1.3; }
.subject-map__header dd { color: var(--text-primary); font-size: 1.125rem; font-weight: 800; margin: 0; }
.subject-map__toolbar { align-items: center; background: color-mix(in srgb, var(--interactive-primary) 5%, var(--surface-secondary)); border-bottom: 1px solid var(--border-secondary); border-top: 1px solid var(--border-secondary); display: flex; gap: 14px; justify-content: space-between; min-height: 54px; padding: 9px 14px 9px 20px; }
.subject-map__gateways { align-items: center; display: flex; flex-wrap: wrap; gap: 7px; }
.subject-map__gateways > span { color: var(--text-secondary); font-size: .75rem; font-weight: 700; margin-right: 3px; }
.subject-map__gateways i { background: var(--surface-primary); border: 1px solid var(--interactive-secondary); border-radius: 999px; color: var(--text-secondary); font-size: .6875rem; font-style: normal; padding: 6px 9px; }
.subject-map__gateways strong { color: var(--interactive-active-text); margin-right: 3px; }
.subject-map__zoom { display: flex; flex: 0 0 auto; gap: 4px; }
.subject-map__zoom button { align-items: center; background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 8px; color: var(--text-primary); display: flex; font: inherit; font-size: .6875rem; font-weight: 700; height: 34px; justify-content: center; min-width: 34px; padding: 0 8px; }
.subject-map__zoom button:disabled { cursor: not-allowed; opacity: .45; }
.subject-map__zoom button:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.subject-map__viewport { background: var(--surface-secondary); max-height: 700px; overflow: auto; overscroll-behavior: contain; scrollbar-color: var(--interactive-secondary) transparent; scrollbar-width: thin; }
.subject-map__canvas { min-height: 100%; min-width: 100%; position: relative; }
.subject-map__world { position: absolute; transform-origin: left top; }
.subject-map__level-band { border-right: 1px dashed var(--border-secondary); bottom: 0; padding: 22px 26px; position: absolute; top: 0; }
.subject-map__level-band strong { color: var(--text-primary); display: block; font-size: .8125rem; }
.subject-map__level-band span { color: var(--text-tertiary); display: block; font-size: .6875rem; margin-top: 4px; }
.subject-map__wires { height: 100%; inset: 0; overflow: visible; pointer-events: none; position: absolute; width: 100%; }
.subject-map__wires path { fill: none; stroke: var(--interactive-active); stroke-linecap: round; stroke-width: 2.5; }
.subject-map__wires marker path { fill: var(--interactive-active); stroke: none; }
.subject-map__course { appearance: none; background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 10px; color: var(--text-primary); cursor: pointer; display: grid; font: inherit; gap: 7px 9px; grid-template-columns: 20px minmax(0, 1fr); height: 78px; padding: 11px 12px; position: absolute; text-align: left; transition: border-color 180ms cubic-bezier(.25,1,.5,1), background 180ms cubic-bezier(.25,1,.5,1), transform 180ms cubic-bezier(.25,1,.5,1); z-index: 2; }
.subject-map__course:hover { background: color-mix(in srgb, var(--interactive-primary) 6%, var(--surface-primary)); border-color: var(--interactive-primary); transform: translateY(-2px); }
.subject-map__course:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.subject-map__course-icon { color: var(--text-secondary); padding-top: 1px; }
.subject-map__course-icon :deep(svg) { height: 18px; width: 18px; }
.subject-map__course strong { display: block; font-size: .8125rem; font-variant-numeric: tabular-nums; }
.subject-map__course small { color: var(--text-secondary); display: -webkit-box; font-size: .6875rem; line-height: 1.3; margin-top: 3px; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.subject-map__course i { align-items: center; color: var(--text-tertiary); display: flex; font-size: .625rem; font-style: normal; gap: 5px; grid-column: 2; }
.subject-map__course i b { background: var(--text-tertiary); border-radius: 50%; height: 6px; width: 6px; }
.subject-map__course.is-completed i { color: var(--semantic-success); }.subject-map__course.is-completed i b { background: var(--semantic-success); }
.subject-map__course.is-inProgress i { color: var(--semantic-info); }.subject-map__course.is-inProgress i b { background: var(--semantic-info); }
.subject-map__course.is-interested i { color: var(--semantic-purple); }.subject-map__course.is-interested i b { background: var(--semantic-purple); }
.subject-map__empty { align-items: center; background: var(--surface-secondary); color: var(--text-secondary); display: grid; gap: 6px; justify-items: center; min-height: 340px; padding: 40px; text-align: center; }
.subject-map__empty :deep(svg) { color: var(--interactive-primary); height: 30px; width: 30px; }.subject-map__empty strong { color: var(--text-primary); font-size: .9375rem; }.subject-map__empty span { font-size: .8125rem; line-height: 1.5; max-width: 52ch; }
.subject-map__independent { border-top: 1px solid var(--border-secondary); }
.subject-map__independent > button { align-items: center; background: var(--surface-primary); border: 0; color: var(--text-primary); display: flex; font: inherit; justify-content: space-between; min-height: 62px; padding: 10px 20px; text-align: left; width: 100%; }
.subject-map__independent > button span { display: grid; gap: 3px; }.subject-map__independent > button strong { font-size: .8125rem; }.subject-map__independent > button small { color: var(--text-secondary); font-size: .6875rem; }
.subject-map__independent > div { background: var(--surface-secondary); border-top: 1px solid var(--border-secondary); display: grid; gap: 1px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.subject-map__independent > div button { align-items: center; background: var(--surface-primary); border: 0; color: var(--text-primary); display: grid; font: inherit; gap: 4px 7px; grid-template-columns: minmax(0, 1fr) 16px; min-height: 64px; padding: 10px 12px; text-align: left; }
.subject-map__independent > div button strong { font-size: .75rem; }.subject-map__independent > div button span { color: var(--text-secondary); font-size: .6875rem; grid-column: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.subject-map__independent > div button :deep(svg) { color: var(--interactive-primary); grid-column: 2; grid-row: 1 / span 2; height: 14px; width: 14px; }
.subject-map__footer { align-items: center; border-top: 1px solid var(--border-secondary); display: flex; flex-wrap: wrap; gap: 15px; min-height: 50px; padding: 10px 20px; }
.subject-map__footer span { align-items: center; color: var(--text-secondary); display: flex; font-size: .6875rem; gap: 7px; }.subject-map__footer i.is-path { background: var(--interactive-active); height: 2px; width: 24px; }.subject-map__footer i.is-node { background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 4px; height: 13px; width: 19px; }.subject-map__footer p { color: var(--text-tertiary); font-size: .6875rem; margin: 0 0 0 auto; }
@media (max-width: 900px) { .subject-map__header { align-items: start; flex-direction: column; }.subject-map__header dl { width: 100%; }.subject-map__header dl > div { flex: 1; padding-left: 0; }.subject-map__toolbar { align-items: flex-start; }.subject-map__independent > div { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .subject-map__header, .subject-map__toolbar, .subject-map__footer { padding-left: 14px; padding-right: 14px; }.subject-map__header dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }.subject-map__header dl > div { min-width: 0; padding: 0 8px; }.subject-map__toolbar { flex-direction: column; }.subject-map__zoom { align-self: flex-end; }.subject-map__viewport { max-height: 620px; }.subject-map__independent > div { grid-template-columns: 1fr; }.subject-map__footer p { flex-basis: 100%; margin-left: 0; } }
@media (prefers-reduced-motion: reduce) { .subject-map__course { transition: none; } }
</style>
