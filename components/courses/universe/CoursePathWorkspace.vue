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
const downstreamSplit = computed(() => splitCourseUniverseItems(downstreamCourses.value, 4))
const provenance = computed(() => props.overview?.relationships.provenance || null)
const sourceVersion = computed(() => provenance.value?.source_version?.split(':')[0] || '')
const course = computed(() => props.overview?.course || null)
const statusKey = computed(() => getCourseUniverseNodeStatusKey(props.selectedNode))
const isPlannerUpdating = computed(() => props.plannerUpdatingCodes.has(props.selectedNode.code))

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
        <div class="course-path__lanes">
          <section class="course-path__lane course-path__lane--before" aria-labelledby="course-path-before-title">
            <header>
              <span>{{ t('courseUniverse.redesign.path.stepBefore') }}</span>
              <h4 id="course-path-before-title">{{ t('courseUniverse.redesign.path.prerequisites') }}</h4>
              <small>{{ t('courseUniverse.redesign.path.prerequisiteHint') }}</small>
            </header>

            <p v-if="relationText(prerequisite)" class="course-path__expression">
              <span>{{ t('courseUniverse.redesign.path.officialExpression') }}</span>
              <code>{{ relationText(prerequisite) }}</code>
            </p>

            <div v-if="prerequisiteCourses.length" class="course-path__stack course-path__stack--before">
              <button
                v-for="item in prerequisiteCourses"
                :key="item.code"
                type="button"
                :class="['course-path-node', relationshipStatusClass(item)]"
                @click="emit('select', item.code)"
              >
                <span class="course-path-node__status" aria-hidden="true" />
                <span>
                  <strong>{{ item.display_code }}</strong>
                  <small>{{ item.title }}</small>
                </span>
                <i>{{ relationshipStatusLabel(item) }}</i>
                <Icon name="lucide:chevron-right" aria-hidden="true" />
              </button>
            </div>
            <div v-else class="course-path__empty-relation">
              <Icon name="lucide:circle-check" aria-hidden="true" />
              <strong>{{ t('courseUniverse.redesign.path.noPrerequisites') }}</strong>
              <span>{{ t('courseUniverse.redesign.path.noPrerequisitesHelp') }}</span>
            </div>
          </section>

          <div class="course-path__connector course-path__connector--into" aria-hidden="true">
            <span />
          </div>

          <section class="course-path__lane course-path__lane--selected" aria-labelledby="course-path-selected-title">
            <header>
              <span>{{ t('courseUniverse.redesign.path.stepCurrent') }}</span>
              <h4 id="course-path-selected-title">{{ t('courseUniverse.redesign.path.selectedCourse') }}</h4>
            </header>
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
          </section>

          <div class="course-path__connector course-path__connector--out" aria-hidden="true">
            <span />
          </div>

          <section class="course-path__lane course-path__lane--after" aria-labelledby="course-path-after-title">
            <header>
              <span>{{ t('courseUniverse.redesign.path.stepAfter') }}</span>
              <h4 id="course-path-after-title">{{ t('courseUniverse.redesign.path.unlocks') }}</h4>
              <small>{{ t('courseUniverse.redesign.path.unlocksHint') }}</small>
            </header>
            <div v-if="downstreamSplit.visible.length" class="course-path__stack course-path__stack--after">
              <button
                v-for="item in downstreamSplit.visible"
                :key="item.code"
                type="button"
                :class="['course-path-node', relationshipStatusClass(item)]"
                @click="emit('select', item.code)"
              >
                <span class="course-path-node__status" aria-hidden="true" />
                <span>
                  <strong>{{ item.display_code }}</strong>
                  <small>{{ item.title }}</small>
                </span>
                <i>{{ relationshipStatusLabel(item) }}</i>
                <Icon name="lucide:chevron-right" aria-hidden="true" />
              </button>
            </div>
            <div v-else class="course-path__empty-relation">
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
          </section>
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

.course-path__lanes {
  background: var(--surface-secondary);
  display: grid;
  grid-template-columns: minmax(190px, 1fr) 44px minmax(210px, 1.08fr) 44px minmax(200px, 1fr);
  min-height: 480px;
  padding: 24px;
}

.course-path__lane {
  align-content: center;
  display: grid;
  gap: 14px;
  min-width: 0;
}

.course-path__lane > header > span {
  color: var(--text-tertiary);
  font-size: 0.75rem;
  font-weight: 750;
}

.course-path__lane h4 {
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.25;
  margin: 3px 0 0;
}

.course-path__lane header small {
  color: var(--text-secondary);
  display: block;
  font-size: 0.75rem;
  line-height: 1.4;
  margin-top: 4px;
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

.course-path__stack {
  display: grid;
  gap: 9px;
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

.course-path__connector {
  align-items: center;
  display: flex;
  position: relative;
}

.course-path__connector span {
  background: var(--interactive-active);
  height: 2px;
  position: relative;
  width: 100%;
}

.course-path__connector span::after {
  border-bottom: 5px solid transparent;
  border-left: 7px solid var(--interactive-active);
  border-top: 5px solid transparent;
  content: '';
  position: absolute;
  right: -1px;
  top: -4px;
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
  .course-path__lanes { grid-template-columns: 1fr; min-height: 0; }
  .course-path__lane { align-content: start; }
  .course-path__connector { height: 46px; justify-content: center; }
  .course-path__connector span { height: 100%; width: 2px; }
  .course-path__connector span::after { border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid var(--interactive-active); bottom: -1px; left: -4px; right: auto; top: auto; }
  .course-path__additional > div { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .course-path__header,
  .course-path__lanes,
  .course-path__additional,
  .course-inspector { padding-left: 14px; padding-right: 14px; }
  .course-path__lanes { padding-bottom: 18px; padding-top: 18px; }
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
