<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  CourseOverviewPayload,
  CourseRelationshipCourse,
  CourseRelationshipDownstream,
  CourseRelationshipRequirement,
} from '~/types/course-overview'
import {
  buildCourseUniverseCourseDetailPath,
  compactCourseCode,
  formatCourseRequirementExpression,
  getCourseUniverseNodePrefix,
  getCourseUniverseNodeStatusKey,
  splitCourseUniverseItems,
  type CourseUniverseNode,
} from '~/utils/courseUniverse'

const props = defineProps<{
  selectedNode: CourseUniverseNode
  nodes: CourseUniverseNode[]
  overview: CourseOverviewPayload | null
  loading: boolean
  error: string
  activeSemesterLabel: string
  plannerUpdatingCodes: Set<string>
}>()

const emit = defineEmits<{
  (event: 'select', code: string): void
  (event: 'toggle-planner', code: string): void
  (event: 'retry'): void
}>()

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const showAdditionalDownstream = ref(false)

const requirementByType = computed(() => new Map(
  (props.overview?.relationships.requirements || []).map(item => [item.relation_type, item]),
))
const prerequisite = computed(() => requirementByType.value.get('prerequisite') || null)
const corequisite = computed(() => requirementByType.value.get('corequisite') || null)
const exclusion = computed(() => requirementByType.value.get('exclusion') || null)
const nodeByCode = computed(() => new Map(props.nodes.map(node => [node.code, node])))
const prerequisiteCourses = computed(() => prerequisite.value?.courses || [])
const downstreamCourses = computed(() => {
  const prefix = getCourseUniverseNodePrefix(props.selectedNode.code)
  return [...(props.overview?.relationships.downstream || [])].sort((a, b) => {
    const aLocal = getCourseUniverseNodePrefix(a.code) === prefix ? 1 : 0
    const bLocal = getCourseUniverseNodePrefix(b.code) === prefix ? 1 : 0
    return bLocal - aLocal || a.code.localeCompare(b.code, undefined, { numeric: true })
  })
})
const prerequisiteSplit = computed(() => splitCourseUniverseItems(prerequisiteCourses.value, 4))
const downstreamSplit = computed(() => splitCourseUniverseItems(downstreamCourses.value, 3))
const provenance = computed(() => props.overview?.relationships.provenance || null)
const sourceVersion = computed(() => provenance.value?.source_version?.split(':')[0] || '')
const course = computed(() => props.overview?.course || null)
const statusKey = computed(() => getCourseUniverseNodeStatusKey(props.selectedNode))
const isPlannerUpdating = computed(() => props.plannerUpdatingCodes.has(props.selectedNode.code))

const MAP_WIDTH = 840
const MAP_HEIGHT = 620
const LEFT_NODE_X = 28
const LEFT_NODE_WIDTH = 190
const SELECTED_X = 318
const SELECTED_WIDTH = 230
const RIGHT_NODE_X = 622
const RIGHT_NODE_WIDTH = 190
const SELECTED_CENTER_Y = 282

function distributedCenters(count: number, start: number, end: number) {
  if (count <= 0) return []
  if (count === 1) return [(start + end) / 2]
  return Array.from({ length: count }, (_, index) => start + (end - start) * index / (count - 1))
}

const prerequisiteCenters = computed(() => distributedCenters(prerequisiteSplit.value.visible.length, 220, 430))
const downstreamCenters = computed(() => distributedCenters(downstreamSplit.value.visible.length, 190, 420))
const prerequisiteUsesOr = computed(() => /\bOR\b/i.test(relationText(prerequisite.value)))
const mapStyle = computed(() => ({
  '--course-map-width': `${MAP_WIDTH}px`,
  '--course-map-height': `${MAP_HEIGHT}px`,
}))

function nodeStyle(side: 'before' | 'after', index: number) {
  const centers = side === 'before' ? prerequisiteCenters.value : downstreamCenters.value
  const width = side === 'before' ? LEFT_NODE_WIDTH : RIGHT_NODE_WIDTH
  const x = side === 'before' ? LEFT_NODE_X : RIGHT_NODE_X
  return {
    left: `${x}px`,
    top: `${(centers[index] || SELECTED_CENTER_Y) - 42}px`,
    width: `${width}px`,
  }
}

function pathFromPrerequisite(index: number) {
  const y = prerequisiteCenters.value[index] || SELECTED_CENTER_Y
  return `M ${LEFT_NODE_X + LEFT_NODE_WIDTH} ${y} C 264 ${y}, 258 ${SELECTED_CENTER_Y}, 286 ${SELECTED_CENTER_Y} H ${SELECTED_X}`
}

function pathToDownstream(index: number) {
  const y = downstreamCenters.value[index] || SELECTED_CENTER_Y
  return `M ${SELECTED_X + SELECTED_WIDTH} ${SELECTED_CENTER_Y} H 590 C 610 ${SELECTED_CENTER_Y}, 598 ${y}, ${RIGHT_NODE_X} ${y}`
}

watch(() => props.selectedNode.code, () => {
  showAdditionalDownstream.value = false
})

function relationText(requirement: CourseRelationshipRequirement | null) {
  return formatCourseRequirementExpression(requirement?.normalized_text || requirement?.raw_text || '')
}

function relatedNode(item: CourseRelationshipCourse | CourseRelationshipDownstream) {
  return nodeByCode.value.get(compactCourseCode(item.code)) || null
}

function relationshipStatusClass(item: CourseRelationshipCourse | CourseRelationshipDownstream) {
  const node = relatedNode(item)
  return node ? `is-${getCourseUniverseNodeStatusKey(node)}` : 'is-notTaken'
}

function relationshipStatusLabel(item: CourseRelationshipCourse | CourseRelationshipDownstream) {
  const node = relatedNode(item)
  return t(`courseUniverse.statusShort.${node ? getCourseUniverseNodeStatusKey(node) : 'notTaken'}`)
}

function detailPath(code: string) {
  return getLocalePath(buildCourseUniverseCourseDetailPath(code))
}
</script>

<template>
  <div class="course-path-workspace">
    <section class="course-path" :aria-label="t('courseUniverse.redesign.path.ariaLabel', { course: selectedNode.displayCode })">
      <header class="course-path__header">
        <div>
          <span class="course-path__scope">
            <Icon name="lucide:route" aria-hidden="true" />
            {{ t('courseUniverse.redesign.path.directScope') }}
          </span>
          <h3>{{ t('courseUniverse.redesign.path.title') }}</h3>
        </div>
        <p>{{ t('courseUniverse.redesign.path.description') }}</p>
      </header>

      <div v-if="loading" class="course-path__loading" aria-busy="true">
        <span v-for="index in 7" :key="index" />
        <span class="sr-only">{{ t('courseUniverse.redesign.path.loading') }}</span>
      </div>

      <div v-else-if="error" class="course-path__error" role="alert">
        <Icon name="lucide:cloud-alert" aria-hidden="true" />
        <div>
          <strong>{{ error }}</strong>
          <span>{{ t('courseUniverse.redesign.path.errorHelp') }}</span>
        </div>
        <button type="button" @click="emit('retry')">
          {{ t('courseUniverse.actions.retry') }}
        </button>
      </div>

      <template v-else-if="overview">
        <div class="course-path__viewport">
          <div class="course-path__map" :style="mapStyle">
            <div class="course-path__band course-path__band--before" aria-hidden="true" />
            <div class="course-path__band course-path__band--selected" aria-hidden="true" />

            <header class="course-path__map-heading is-before">
              <span>{{ t('courseUniverse.redesign.path.stepBefore') }}</span>
              <strong id="course-path-before-title">{{ t('courseUniverse.redesign.path.prerequisites') }}</strong>
              <small>{{ t('courseUniverse.redesign.path.prerequisiteHint') }}</small>
            </header>
            <header class="course-path__map-heading is-selected">
              <span>{{ t('courseUniverse.redesign.path.stepCurrent') }}</span>
              <strong id="course-path-selected-title">{{ t('courseUniverse.redesign.path.selectedCourse') }}</strong>
            </header>
            <header class="course-path__map-heading is-after">
              <span>{{ t('courseUniverse.redesign.path.stepAfter') }}</span>
              <strong id="course-path-after-title">{{ t('courseUniverse.redesign.path.unlocks') }}</strong>
              <small>{{ t('courseUniverse.redesign.path.unlocksHint') }}</small>
            </header>

            <svg class="course-path__wires" :viewBox="`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`" aria-hidden="true">
              <defs>
                <marker id="course-path-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                  <path d="M 0 0 L 8 4 L 0 8 Z" />
                </marker>
              </defs>
              <path
                v-for="(_, index) in prerequisiteSplit.visible"
                :key="`prerequisite-wire-${index}`"
                :d="pathFromPrerequisite(index)"
                class="course-path__wire"
                marker-end="url(#course-path-arrow)"
              />
              <path
                v-for="(_, index) in downstreamSplit.visible"
                :key="`downstream-wire-${index}`"
                :d="pathToDownstream(index)"
                class="course-path__wire"
                marker-end="url(#course-path-arrow)"
              />
              <path d="M 433 372 V 438" class="course-path__relation-wire" />
              <circle
                v-if="prerequisiteSplit.visible.length > 1"
                cx="286"
                :cy="SELECTED_CENTER_Y"
                r="7"
                :class="['course-path__junction', { 'is-solid': !prerequisiteUsesOr }]"
              />
              <circle v-if="downstreamSplit.visible.length > 1" cx="590" :cy="SELECTED_CENTER_Y" r="7" class="course-path__junction" />
            </svg>

            <p v-if="relationText(prerequisite)" class="course-path__expression">
              <span>{{ t('courseUniverse.redesign.path.officialExpression') }}</span>
              <code>{{ relationText(prerequisite) }}</code>
            </p>

            <button
              v-for="(item, index) in prerequisiteSplit.visible"
              :key="item.code"
              type="button"
              :style="nodeStyle('before', index)"
              :class="['course-path-node', 'is-before', relationshipStatusClass(item)]"
              @click="emit('select', item.code)"
            >
              <Icon name="lucide:graduation-cap" aria-hidden="true" />
              <span>
                <strong>{{ item.display_code }}</strong>
                <small>{{ item.title }}</small>
              </span>
              <i><span class="course-path-node__status" aria-hidden="true" />{{ relationshipStatusLabel(item) }}</i>
            </button>

            <div v-if="!prerequisiteSplit.visible.length" class="course-path__empty-relation is-before">
              <Icon name="lucide:circle-check" aria-hidden="true" />
              <strong>{{ t('courseUniverse.redesign.path.noPrerequisites') }}</strong>
              <span>{{ t('courseUniverse.redesign.path.noPrerequisitesHelp') }}</span>
            </div>

            <article class="course-path__selected-card">
              <span class="course-path__selected-kicker">{{ t('courseUniverse.redesign.path.currentFocus') }}</span>
              <strong>{{ selectedNode.displayCode }}</strong>
              <h5>{{ course?.title || selectedNode.title }}</h5>
              <p>
                <span v-if="course?.credits !== null && course?.credits !== undefined">
                  {{ t('courseUniverse.redesign.path.credits', { count: course.credits }) }}
                </span>
                <span :class="['course-path__status-pill', `is-${statusKey}`]">
                  {{ t(`courseUniverse.statusShort.${statusKey}`) }}
                </span>
              </p>
            </article>

            <div class="course-path__other-relations">
              <div class="is-corequisite">
                <span><Icon name="lucide:link-2" aria-hidden="true" />{{ t('courseUniverse.redesign.path.corequisites') }}</span>
                <strong>{{ relationText(corequisite) || t('courseUniverse.redesign.path.none') }}</strong>
              </div>
              <div class="is-exclusion">
                <span><Icon name="lucide:circle-slash-2" aria-hidden="true" />{{ t('courseUniverse.redesign.path.exclusions') }}</span>
                <strong>{{ relationText(exclusion) || t('courseUniverse.redesign.path.none') }}</strong>
              </div>
            </div>

            <button
              v-for="(item, index) in downstreamSplit.visible"
              :key="item.code"
              type="button"
              :style="nodeStyle('after', index)"
              :class="['course-path-node', 'is-after', relationshipStatusClass(item)]"
              @click="emit('select', item.code)"
            >
              <Icon name="lucide:graduation-cap" aria-hidden="true" />
              <span>
                <strong>{{ item.display_code }}</strong>
                <small>{{ item.title }}</small>
              </span>
              <i><span class="course-path-node__status" aria-hidden="true" />{{ relationshipStatusLabel(item) }}</i>
            </button>

            <div v-if="!downstreamSplit.visible.length" class="course-path__empty-relation is-after">
              <Icon name="lucide:milestone" aria-hidden="true" />
              <strong>{{ t('courseUniverse.redesign.path.noDownstream') }}</strong>
              <span>{{ t('courseUniverse.redesign.path.noDownstreamHelp') }}</span>
            </div>

            <button
              v-if="downstreamSplit.hidden.length"
              type="button"
              class="course-path__more"
              :aria-expanded="showAdditionalDownstream"
              @click="showAdditionalDownstream = !showAdditionalDownstream"
            >
              <Icon :name="showAdditionalDownstream ? 'lucide:minus' : 'lucide:plus'" aria-hidden="true" />
              {{ showAdditionalDownstream
                ? t('courseUniverse.redesign.path.hideAdditional')
                : t('courseUniverse.redesign.path.showAdditional', { count: downstreamSplit.hidden.length }) }}
            </button>
          </div>
        </div>

        <div v-if="showAdditionalDownstream" class="course-path__additional">
          <header>
            <strong>{{ t('courseUniverse.redesign.path.additionalTitle') }}</strong>
            <span>{{ t('courseUniverse.redesign.path.additionalDescription') }}</span>
          </header>
          <div>
            <button
              v-for="item in downstreamSplit.hidden"
              :key="item.code"
              type="button"
              @click="emit('select', item.code)"
            >
              <strong>{{ item.display_code }}</strong>
              <span>{{ item.title }}</span>
              <Icon name="lucide:arrow-up-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </template>
    </section>

    <aside class="course-inspector" :aria-label="t('courseUniverse.redesign.inspector.ariaLabel')">
      <header>
        <span>{{ t('courseUniverse.redesign.inspector.title') }}</span>
        <strong>{{ selectedNode.displayCode }}</strong>
        <h3>{{ course?.title || selectedNode.title }}</h3>
        <p v-if="course?.description">{{ course.description }}</p>
      </header>

      <div class="course-inspector__facts">
        <div>
          <span>{{ t('courseUniverse.redesign.inspector.credits') }}</span>
          <strong>{{ course?.credits ?? t('courseUniverse.detail.notAvailable') }}</strong>
        </div>
        <div>
          <span>{{ t('courseUniverse.redesign.inspector.status') }}</span>
          <strong>{{ t(`courseUniverse.statusShort.${statusKey}`) }}</strong>
        </div>
        <div>
          <span>{{ t('courseUniverse.redesign.inspector.directPrerequisites') }}</span>
          <strong>{{ prerequisiteCourses.length }}</strong>
        </div>
        <div>
          <span>{{ t('courseUniverse.redesign.inspector.directDownstream') }}</span>
          <strong>{{ downstreamCourses.length }}</strong>
        </div>
      </div>

      <section class="course-inspector__source">
        <span>{{ t('courseUniverse.redesign.inspector.source') }}</span>
        <strong :class="{ 'is-fallback': provenance?.is_fallback }">
          <Icon :name="provenance?.is_fallback ? 'lucide:triangle-alert' : 'lucide:badge-check'" aria-hidden="true" />
          {{ provenance?.is_fallback ? t('courseUniverse.source.fallback') : t('courseUniverse.source.official') }}
        </strong>
        <small v-if="sourceVersion">{{ t('courseUniverse.redesign.inspector.version', { version: sourceVersion }) }}</small>
      </section>

      <div class="course-inspector__actions">
        <NuxtLink :to="detailPath(selectedNode.code)" class="course-inspector__primary">
          {{ t('courseUniverse.actions.openOverview') }}
          <Icon name="lucide:arrow-up-right" aria-hidden="true" />
        </NuxtLink>
        <button
          type="button"
          :disabled="isPlannerUpdating"
          @click="emit('toggle-planner', selectedNode.code)"
        >
          <Icon :name="isPlannerUpdating ? 'lucide:loader-circle' : selectedNode.inPlanner ? 'lucide:shopping-cart-check' : 'lucide:shopping-cart'" :class="{ 'is-spinning': isPlannerUpdating }" aria-hidden="true" />
          {{ selectedNode.inPlanner ? t('courseUniverse.actions.removeFromPlannerCart') : t('courseUniverse.actions.addToPlannerCart') }}
          <small v-if="activeSemesterLabel">{{ activeSemesterLabel }}</small>
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped lang="scss">
.course-path-workspace {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 310px);
}

.course-path,
.course-inspector {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
}

.course-path {
  min-width: 0;
  overflow: hidden;
}

.course-path__header {
  align-items: end;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  gap: 24px;
  justify-content: space-between;
  padding: 18px 20px;
}

.course-path__header h3,
.course-inspector h3 {
  color: var(--text-primary);
  font-size: 1.125rem;
  line-height: 1.25;
  margin: 5px 0 0;
}

.course-path__header p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  max-width: 46ch;
  text-align: right;
}

.course-path__scope {
  align-items: center;
  color: var(--interactive-active-text);
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 750;
  gap: 6px;
}

.course-path__scope :deep(svg) {
  height: 16px;
  width: 16px;
}

.course-path__expression {
  background: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 24%, var(--border-secondary));
  border-radius: 10px;
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 10px 12px;
}

.course-path__expression span {
  color: var(--text-secondary);
  font-size: 0.6875rem;
  font-weight: 700;
}

.course-path__expression code {
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 750;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.course-path-node {
  align-items: center;
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 9px;
  grid-template-columns: 8px minmax(0, 1fr) auto 18px;
  min-height: 68px;
  padding: 10px 11px;
  text-align: left;
  transition: border-color 180ms cubic-bezier(0.25, 1, 0.5, 1), background 180ms cubic-bezier(0.25, 1, 0.5, 1), transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
}

.course-path-node:hover {
  background: color-mix(in srgb, var(--interactive-primary) 6%, var(--surface-primary));
  border-color: var(--interactive-primary);
  transform: translateY(-1px);
}

.course-path-node:focus-visible,
.course-path__more:focus-visible,
.course-path__additional button:focus-visible,
.course-inspector button:focus-visible,
.course-inspector a:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.course-path-node__status {
  background: var(--text-tertiary);
  border-radius: 999px;
  height: 8px;
  width: 8px;
}

.course-path-node.is-completed .course-path-node__status { background: var(--semantic-success); }
.course-path-node.is-inProgress .course-path-node__status { background: var(--semantic-info); }
.course-path-node.is-interested .course-path-node__status { background: var(--semantic-purple); }

.course-path-node strong {
  display: block;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.course-path-node small {
  color: var(--text-secondary);
  display: -webkit-box;
  font-size: 0.75rem;
  line-height: 1.35;
  margin-top: 4px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.course-path-node i {
  color: var(--text-tertiary);
  font-size: 0.6875rem;
  font-style: normal;
  white-space: nowrap;
}

.course-path-node :deep(svg) {
  color: var(--interactive-primary);
  height: 16px;
  width: 16px;
}

.course-path__selected-card {
  background: var(--surface-primary);
  border: 2px solid var(--interactive-primary);
  border-radius: 12px;
  padding: 18px;
}

.course-path__selected-kicker {
  color: var(--interactive-active-text);
  font-size: 0.6875rem;
  font-weight: 800;
}

.course-path__selected-card > strong {
  color: var(--interactive-active-text);
  display: block;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  margin-top: 10px;
}

.course-path__selected-card h5 {
  color: var(--text-primary);
  font-size: 1.25rem;
  line-height: 1.25;
  margin: 5px 0 0;
}

.course-path__selected-card p {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  gap: 8px;
  margin: 14px 0 0;
}

.course-path__status-pill {
  background: var(--surface-secondary);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 0.6875rem;
  font-weight: 750;
  padding: 4px 8px;
}

.course-path__status-pill.is-completed { background: var(--success-background); color: var(--semantic-success); }
.course-path__status-pill.is-inProgress { background: var(--info-background); color: var(--interactive-active-text); }
.course-path__status-pill.is-interested { background: var(--purple-background); color: var(--semantic-purple); }

.course-path__other-relations {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
  overflow: hidden;
}

.course-path__other-relations > div {
  display: grid;
  gap: 5px;
  padding: 10px 12px;
}

.course-path__other-relations > div + div { border-top: 1px solid var(--border-secondary); }

.course-path__other-relations span {
  align-items: center;
  display: flex;
  font-size: 0.6875rem;
  font-weight: 750;
  gap: 6px;
}

.course-path__other-relations strong {
  color: var(--text-primary);
  font-size: 0.75rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.course-path__other-relations .is-corequisite span { color: var(--semantic-info); }
.course-path__other-relations .is-exclusion span { color: var(--semantic-error); }

.course-path__empty-relation {
  align-items: center;
  background: var(--surface-primary);
  border: 1px dashed var(--border-primary);
  border-radius: 10px;
  display: grid;
  gap: 5px;
  justify-items: start;
  padding: 16px;
}

.course-path__empty-relation :deep(svg) { color: var(--semantic-success); height: 20px; width: 20px; }
.course-path__empty-relation strong { color: var(--text-primary); font-size: 0.8125rem; }
.course-path__empty-relation span { color: var(--text-secondary); font-size: 0.75rem; line-height: 1.45; }

.course-path__more {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 1px dashed var(--interactive-secondary);
  border-radius: 10px;
  color: var(--interactive-active-text);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 750;
  gap: 7px;
  justify-content: center;
  min-height: 44px;
  padding: 8px 12px;
}

.course-path__additional {
  border-top: 1px solid var(--border-secondary);
  display: grid;
  gap: 14px;
  padding: 18px 20px 20px;
}

.course-path__additional > header { display: grid; gap: 3px; }
.course-path__additional > header strong { color: var(--text-primary); font-size: 0.875rem; }
.course-path__additional > header span { color: var(--text-secondary); font-size: 0.75rem; }
.course-path__additional > div { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); }

.course-path__additional button {
  align-items: center;
  appearance: none;
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 9px;
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 3px 8px;
  grid-template-columns: minmax(0, 1fr) 18px;
  min-height: 60px;
  padding: 9px 10px;
  text-align: left;
}

.course-path__additional button strong { font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.course-path__additional button span { color: var(--text-secondary); font-size: 0.6875rem; grid-column: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.course-path__additional button :deep(svg) { color: var(--interactive-primary); grid-column: 2; grid-row: 1 / span 2; height: 15px; width: 15px; }

.course-inspector {
  align-self: start;
  display: grid;
  gap: 18px;
  padding: 20px;
  position: sticky;
  top: calc(var(--header-height) + 16px);
}

.course-inspector > header > span,
.course-inspector__source > span {
  color: var(--text-tertiary);
  display: block;
  font-size: 0.75rem;
  font-weight: 750;
}

.course-inspector > header > strong {
  color: var(--interactive-active-text);
  display: block;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  margin-top: 10px;
}

.course-inspector > header p {
  color: var(--text-secondary);
  display: -webkit-box;
  font-size: 0.8125rem;
  line-height: 1.55;
  margin: 12px 0 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.course-inspector__facts {
  border-bottom: 1px solid var(--border-secondary);
  border-top: 1px solid var(--border-secondary);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.course-inspector__facts > div { display: grid; gap: 4px; padding: 12px 0; }
.course-inspector__facts > div:nth-child(odd) { padding-right: 10px; }
.course-inspector__facts > div:nth-child(even) { border-left: 1px solid var(--border-secondary); padding-left: 12px; }
.course-inspector__facts > div:nth-child(n + 3) { border-top: 1px solid var(--border-secondary); }
.course-inspector__facts span { color: var(--text-secondary); font-size: 0.6875rem; line-height: 1.35; }
.course-inspector__facts strong { color: var(--text-primary); font-size: 0.9375rem; }

.course-inspector__source { display: grid; gap: 7px; }
.course-inspector__source strong { align-items: center; color: var(--semantic-success); display: flex; font-size: 0.8125rem; gap: 7px; }
.course-inspector__source strong.is-fallback { color: var(--semantic-warning); }
.course-inspector__source small { color: var(--text-secondary); font-size: 0.6875rem; }

.course-inspector__actions { display: grid; gap: 8px; }
.course-inspector__actions a,
.course-inspector__actions button {
  align-items: center;
  appearance: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 750;
  gap: 8px;
  justify-content: center;
  min-height: 44px;
  padding: 9px 12px;
  text-decoration: none;
}

.course-inspector__primary { background: var(--btn-primary-bg); border: 1px solid var(--interactive-primary); color: var(--text-inverse); }
.course-inspector__actions button { background: var(--surface-secondary); border: 1px solid var(--border-primary); color: var(--text-primary); flex-wrap: wrap; }
.course-inspector__actions button:disabled { cursor: wait; opacity: 0.65; }
.course-inspector__actions button small { color: var(--text-secondary); flex-basis: 100%; font-size: 0.6875rem; font-weight: 600; }

.course-path__viewport {
  background: var(--surface-secondary);
  min-height: var(--course-map-height);
  overflow: auto hidden;
  scrollbar-color: var(--interactive-secondary) transparent;
  scrollbar-width: thin;
}

.course-path__map {
  height: var(--course-map-height);
  min-width: var(--course-map-width);
  position: relative;
  width: var(--course-map-width);
}

.course-path__band {
  border-right: 1px dashed var(--border-secondary);
  bottom: 0;
  position: absolute;
  top: 0;
}

.course-path__band--before { left: 0; width: 272px; }
.course-path__band--selected { left: 272px; width: 318px; }

.course-path__map-heading {
  display: grid;
  gap: 3px;
  position: absolute;
  top: 24px;
  z-index: 2;
}

.course-path__map-heading.is-before { left: 28px; width: 190px; }
.course-path__map-heading.is-selected { left: 318px; text-align: center; width: 230px; }
.course-path__map-heading.is-after { left: 622px; width: 190px; }
.course-path__map-heading span { color: var(--interactive-active-text); font-size: 0.6875rem; font-weight: 800; }
.course-path__map-heading strong { color: var(--text-primary); font-size: 0.9375rem; }
.course-path__map-heading small { color: var(--text-secondary); font-size: 0.6875rem; line-height: 1.35; }

.course-path__wires {
  height: 100%;
  inset: 0;
  overflow: visible;
  pointer-events: none;
  position: absolute;
  width: 100%;
  z-index: 1;
}

.course-path__wires marker path { fill: var(--interactive-active); }
.course-path__wire {
  fill: none;
  stroke: var(--interactive-active);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.course-path__relation-wire {
  fill: none;
  stroke: var(--text-tertiary);
  stroke-dasharray: 4 5;
  stroke-width: 1.5;
}

.course-path__junction {
  fill: var(--surface-secondary);
  stroke: var(--interactive-active);
  stroke-width: 3;
}

.course-path__junction.is-solid { fill: var(--interactive-active); }

.course-path__expression {
  left: 28px;
  margin: 0;
  position: absolute;
  top: 92px;
  width: 190px;
  z-index: 2;
}

.course-path-node {
  gap: 10px;
  grid-template-columns: 20px minmax(0, 1fr);
  height: 84px;
  min-height: 84px;
  padding: 11px 12px;
  position: absolute;
  z-index: 3;
}

.course-path-node > :deep(svg) {
  align-self: start;
  color: var(--text-secondary);
  height: 19px;
  margin-top: 1px;
  width: 19px;
}

.course-path-node > i {
  align-items: center;
  display: flex;
  gap: 5px;
  grid-column: 2;
}

.course-path-node__status { display: inline-block; flex: 0 0 auto; }

.course-path__selected-card {
  height: 164px;
  left: 318px;
  padding: 18px 20px;
  position: absolute;
  top: 200px;
  width: 230px;
  z-index: 4;
}

.course-path__other-relations {
  left: 318px;
  position: absolute;
  top: 446px;
  width: 230px;
  z-index: 3;
}

.course-path__empty-relation {
  position: absolute;
  top: 214px;
  width: 190px;
  z-index: 3;
}

.course-path__empty-relation.is-before { left: 28px; }
.course-path__empty-relation.is-after { left: 622px; }

.course-path__more {
  bottom: 24px;
  left: 622px;
  position: absolute;
  width: 190px;
  z-index: 3;
}

.course-path__loading {
  align-content: center;
  background: var(--surface-secondary);
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 480px;
  padding: 24px;
}

.course-path__loading span {
  animation: course-path-pulse 1.4s ease-in-out infinite;
  background: var(--surface-primary);
  border-radius: 10px;
  height: 72px;
}

.course-path__loading span:nth-child(2),
.course-path__loading span:nth-child(5) { grid-column: 2; }

.course-path__error {
  align-items: center;
  background: var(--surface-secondary);
  display: grid;
  gap: 12px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  min-height: 300px;
  padding: 24px;
}

.course-path__error :deep(svg) { color: var(--semantic-error); height: 22px; width: 22px; }
.course-path__error div { display: grid; gap: 4px; }
.course-path__error strong { color: var(--text-primary); font-size: 0.875rem; }
.course-path__error span { color: var(--text-secondary); font-size: 0.75rem; }
.course-path__error button { background: var(--btn-primary-bg); border: 1px solid var(--interactive-primary); border-radius: 9px; color: var(--text-inverse); cursor: pointer; font: inherit; font-size: 0.8125rem; font-weight: 750; min-height: 44px; padding: 8px 14px; }

.is-spinning { animation: course-path-spin 0.8s linear infinite; }

@keyframes course-path-pulse { 50% { opacity: 0.55; } }
@keyframes course-path-spin { to { transform: rotate(360deg); } }

@media (max-width: 1180px) {
  .course-path-workspace { grid-template-columns: 1fr; }
  .course-inspector { position: static; }
  .course-inspector__facts { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .course-inspector__facts > div { border: 0 !important; padding: 12px !important; }
  .course-inspector__facts > div + div { border-left: 1px solid var(--border-secondary) !important; }
}

@media (max-width: 820px) {
  .course-path__header { align-items: start; flex-direction: column; gap: 8px; }
  .course-path__header p { text-align: left; }
  .course-path__additional > div { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .course-path__header,
  .course-path__additional,
  .course-inspector { padding-left: 14px; padding-right: 14px; }
  .course-path__additional > div { grid-template-columns: 1fr; }
  .course-inspector__facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .course-inspector__facts > div:nth-child(3) { border-left: 0 !important; border-top: 1px solid var(--border-secondary) !important; }
  .course-inspector__facts > div:nth-child(4) { border-top: 1px solid var(--border-secondary) !important; }
}

@media (prefers-reduced-motion: reduce) {
  .course-path-node,
  .course-path__loading span,
  .is-spinning { animation: none; transition: none; }
}
</style>
