<script setup lang="ts">
import { computed } from 'vue'
import {
  buildCourseUniverseSubjectGateways,
  getCourseUniverseNodeStatusKey,
  groupCourseUniverseSubjectNodes,
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

const emit = defineEmits<{
  (event: 'select', code: string): void
}>()

const { t } = useI18n()
const levelGroups = computed(() => groupCourseUniverseSubjectNodes({ nodes: props.nodes, prefix: props.prefix }))
const gateways = computed(() => buildCourseUniverseSubjectGateways({
  components: props.components,
  lines: props.lines,
  prefix: props.prefix,
}).slice(0, 6))
const subjectNodes = computed(() => levelGroups.value.flatMap(group => group.nodes))
const relatedCount = computed(() => subjectNodes.value.filter(node => props.relationshipCourseCodes.has(node.code)).length)
const independentCount = computed(() => subjectNodes.value.length - relatedCount.value)

function nodeClasses(node: CourseUniverseNode) {
  return [
    'subject-map__course',
    {
      'has-relationships': props.relationshipCourseCodes.has(node.code),
      [`is-${getCourseUniverseNodeStatusKey(node)}`]: props.showProgress,
    },
  ]
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
        <div>
          <dt>{{ t('courseUniverse.redesign.subject.totalCourses') }}</dt>
          <dd>{{ subjectNodes.length }}</dd>
        </div>
        <div>
          <dt>{{ t('courseUniverse.redesign.subject.withRelationships') }}</dt>
          <dd>{{ relatedCount }}</dd>
        </div>
        <div>
          <dt>{{ t('courseUniverse.redesign.subject.independentCourses') }}</dt>
          <dd>{{ independentCount }}</dd>
        </div>
      </dl>
    </header>

    <section v-if="gateways.length" class="subject-map__gateways" aria-labelledby="subject-gateway-title">
      <header>
        <div>
          <h4 id="subject-gateway-title">{{ t('courseUniverse.redesign.subject.externalGateways') }}</h4>
          <p>{{ t('courseUniverse.redesign.subject.externalGatewaysHelp') }}</p>
        </div>
        <Icon name="lucide:git-branch" aria-hidden="true" />
      </header>
      <div>
        <span v-for="gateway in gateways" :key="gateway.prefix">
          <strong>{{ gateway.prefix }}</strong>
          {{ t('courseUniverse.redesign.subject.externalCount', { count: gateway.count }) }}
        </span>
      </div>
    </section>

    <div class="subject-map__levels">
      <section v-for="group in levelGroups" :key="group.key" class="subject-map__level">
        <header>
          <span>{{ t(`courseUniverse.redesign.subject.levels.${group.key}`) }}</span>
          <small>{{ t('courseUniverse.redesign.subject.levelCount', { count: group.nodes.length }) }}</small>
        </header>
        <div class="subject-map__track">
          <span class="subject-map__rail" aria-hidden="true" />
          <button
            v-for="node in group.nodes"
            :key="node.code"
            type="button"
            :class="nodeClasses(node)"
            @click="emit('select', node.code)"
          >
            <span class="subject-map__stop" aria-hidden="true" />
            <strong>{{ node.displayCode }}</strong>
            <small>{{ node.title }}</small>
            <i v-if="showProgress">{{ t(`courseUniverse.statusShort.${getCourseUniverseNodeStatusKey(node)}`) }}</i>
            <i v-else-if="relationshipCourseCodes.has(node.code)">{{ t('courseUniverse.explorer.hasRelationships') }}</i>
            <i v-else>{{ t('courseUniverse.explorer.noRelationshipsShort') }}</i>
          </button>
        </div>
      </section>
    </div>

    <footer class="subject-map__footer">
      <span><i class="is-related" aria-hidden="true" />{{ t('courseUniverse.redesign.subject.legendRelated') }}</span>
      <span><i class="is-independent" aria-hidden="true" />{{ t('courseUniverse.redesign.subject.legendIndependent') }}</span>
      <span v-if="showProgress"><i class="is-completed" aria-hidden="true" />{{ t('courseUniverse.legend.completed') }}</span>
      <p>{{ t('courseUniverse.redesign.subject.clickHint') }}</p>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.subject-map {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  overflow: hidden;
}

.subject-map__header {
  align-items: end;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  padding: 20px;
}

.subject-map__header > div > span {
  align-items: center;
  color: var(--interactive-active-text);
  display: flex;
  font-size: 0.75rem;
  font-weight: 750;
  gap: 6px;
}

.subject-map__header h3 {
  color: var(--text-primary);
  font-size: 1.25rem;
  line-height: 1.2;
  margin: 6px 0 0;
}

.subject-map__header p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 7px 0 0;
  max-width: 62ch;
}

.subject-map__header dl {
  display: flex;
  gap: 0;
  margin: 0;
}

.subject-map__header dl > div {
  display: grid;
  gap: 4px;
  min-width: 92px;
  padding: 0 14px;
}

.subject-map__header dl > div + div { border-left: 1px solid var(--border-secondary); }
.subject-map__header dt { color: var(--text-secondary); font-size: 0.6875rem; line-height: 1.3; }
.subject-map__header dd { color: var(--text-primary); font-size: 1.125rem; font-weight: 800; margin: 0; }

.subject-map__gateways {
  align-items: center;
  background: color-mix(in srgb, var(--interactive-primary) 6%, var(--surface-secondary));
  border-bottom: 1px solid var(--border-secondary);
  border-top: 1px solid var(--border-secondary);
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
  padding: 14px 20px;
}

.subject-map__gateways header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.subject-map__gateways h4 { color: var(--text-primary); font-size: 0.875rem; margin: 0; }
.subject-map__gateways p { color: var(--text-secondary); font-size: 0.75rem; line-height: 1.4; margin: 4px 0 0; }
.subject-map__gateways header :deep(svg) { color: var(--interactive-primary); height: 20px; width: 20px; }
.subject-map__gateways > div { display: flex; flex-wrap: wrap; gap: 7px; }
.subject-map__gateways > div span { background: var(--surface-primary); border: 1px solid var(--interactive-secondary); border-radius: 999px; color: var(--text-secondary); font-size: 0.75rem; min-height: 32px; padding: 7px 10px; }
.subject-map__gateways > div strong { color: var(--interactive-active-text); margin-right: 4px; }

.subject-map__levels { background: var(--surface-secondary); }

.subject-map__level {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  min-height: 148px;
}

.subject-map__level + .subject-map__level { border-top: 1px solid var(--border-secondary); }

.subject-map__level > header {
  align-content: center;
  border-right: 1px solid var(--border-secondary);
  display: grid;
  gap: 5px;
  padding: 18px 20px;
}

.subject-map__level > header span { color: var(--text-primary); font-size: 0.9375rem; font-weight: 800; }
.subject-map__level > header small { color: var(--text-secondary); font-size: 0.75rem; }

.subject-map__track {
  align-items: center;
  display: grid;
  gap: 16px;
  grid-auto-columns: minmax(150px, 190px);
  grid-auto-flow: column;
  min-width: 0;
  overflow-x: auto;
  padding: 24px 26px;
  position: relative;
  scrollbar-color: var(--interactive-secondary) transparent;
  scrollbar-width: thin;
}

.subject-map__rail {
  background: var(--border-primary);
  height: 2px;
  left: 26px;
  position: absolute;
  right: 26px;
  top: 50%;
}

.subject-map__course {
  align-content: start;
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 4px;
  min-height: 94px;
  padding: 14px 13px 12px;
  position: relative;
  text-align: left;
  transition: border-color 180ms cubic-bezier(0.25, 1, 0.5, 1), background 180ms cubic-bezier(0.25, 1, 0.5, 1), transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 1;
}

.subject-map__course:hover {
  background: color-mix(in srgb, var(--interactive-primary) 6%, var(--surface-primary));
  border-color: var(--interactive-primary);
  transform: translateY(-2px);
}

.subject-map__course:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.subject-map__stop {
  background: var(--surface-primary);
  border: 2px solid var(--text-tertiary);
  border-radius: 999px;
  height: 10px;
  left: 14px;
  position: absolute;
  top: -6px;
  width: 10px;
}

.subject-map__course.has-relationships .subject-map__stop { border-color: var(--interactive-primary); }
.subject-map__course.is-completed .subject-map__stop { background: var(--semantic-success); border-color: var(--semantic-success); }
.subject-map__course.is-inProgress .subject-map__stop { background: var(--semantic-info); border-color: var(--semantic-info); }
.subject-map__course.is-interested .subject-map__stop { background: var(--semantic-purple); border-color: var(--semantic-purple); }
.subject-map__course strong { font-size: 0.8125rem; font-variant-numeric: tabular-nums; }
.subject-map__course small { color: var(--text-secondary); display: -webkit-box; font-size: 0.75rem; line-height: 1.35; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.subject-map__course i { color: var(--text-tertiary); font-size: 0.6875rem; font-style: normal; margin-top: 4px; }
.subject-map__course.is-completed i { color: var(--semantic-success); }
.subject-map__course.is-inProgress i { color: var(--semantic-info); }
.subject-map__course.is-interested i { color: var(--semantic-purple); }

.subject-map__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 13px 20px;
}

.subject-map__footer > span { align-items: center; color: var(--text-secondary); display: flex; font-size: 0.75rem; gap: 6px; }
.subject-map__footer i { background: var(--surface-primary); border: 2px solid var(--text-tertiary); border-radius: 999px; display: inline-block; height: 10px; width: 10px; }
.subject-map__footer i.is-related { border-color: var(--interactive-primary); }
.subject-map__footer i.is-completed { background: var(--semantic-success); border-color: var(--semantic-success); }
.subject-map__footer p { color: var(--text-tertiary); font-size: 0.75rem; margin: 0 0 0 auto; }

@media (max-width: 900px) {
  .subject-map__header { align-items: start; flex-direction: column; }
  .subject-map__header dl { width: 100%; }
  .subject-map__header dl > div { flex: 1; padding-left: 0; }
  .subject-map__gateways { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .subject-map__header,
  .subject-map__gateways,
  .subject-map__footer { padding-left: 14px; padding-right: 14px; }
  .subject-map__header dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .subject-map__header dl > div { min-width: 0; padding: 0 8px; }
  .subject-map__level { grid-template-columns: 1fr; }
  .subject-map__level > header { border-bottom: 1px solid var(--border-secondary); border-right: 0; padding: 12px 14px; }
  .subject-map__track { grid-auto-columns: minmax(145px, 78vw); padding: 24px 14px 18px; }
  .subject-map__rail { left: 14px; right: 14px; }
  .subject-map__footer p { flex-basis: 100%; margin-left: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .subject-map__course { transition: none; }
}
</style>
