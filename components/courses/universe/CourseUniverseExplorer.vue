<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CourseUniverseCanvas from './CourseUniverseCanvas.vue'
import CourseUniverseLegend from './CourseUniverseLegend.vue'
import type {
  CourseUniverseMapComponent,
  CourseUniverseMapLine,
  CourseUniverseNode,
} from '~/utils/courseUniverse'
import {
  buildCourseUniverseRelationshipCourseCodeSet,
  buildCourseUniverseSubjectOptions,
  getCourseUniverseIsolatedSubjectNodes,
} from '~/utils/courseUniverse'

const props = defineProps<{
  components: CourseUniverseMapComponent[]
  nodes: CourseUniverseNode[]
  lines: CourseUniverseMapLine[]
}>()

const emit = defineEmits<{
  (event: 'select', code: string): void
  (event: 'toggle-planner', code: string): void
}>()

const { t } = useI18n()
const searchInput = ref('')
const searchActive = ref(false)
const activeResultIndex = ref(0)
const selectedSubject = ref('')

const selectedNode = computed(() => props.nodes.find(node => node.selected) || null)
const relationshipCourseCodes = computed(() => buildCourseUniverseRelationshipCourseCodeSet({
  components: props.components,
  lines: props.lines,
}))
const subjectOptions = computed(() => buildCourseUniverseSubjectOptions({
  nodes: props.nodes,
  relationshipCourseCodes: relationshipCourseCodes.value,
}))
const selectedSubjectOption = computed(() => (
  subjectOptions.value.find(option => option.prefix === selectedSubject.value) || null
))
const isolatedSubjectNodes = computed(() => getCourseUniverseIsolatedSubjectNodes({
  nodes: props.nodes,
  prefix: selectedSubject.value,
  relationshipCourseCodes: relationshipCourseCodes.value,
}))
const normalizedSearch = computed(() => searchInput.value.trim().toLowerCase())
const searchResults = computed(() => {
  if (!normalizedSearch.value) return []
  return props.nodes
    .filter(node => (
      node.displayCode.toLowerCase().includes(normalizedSearch.value)
      || node.title.toLowerCase().includes(normalizedSearch.value)
    ))
    .sort((a, b) => {
      const aExact = a.code.toLowerCase() === normalizedSearch.value ? 1 : 0
      const bExact = b.code.toLowerCase() === normalizedSearch.value ? 1 : 0
      return bExact - aExact || a.code.localeCompare(b.code, undefined, { numeric: true })
    })
    .slice(0, 8)
})
const hasContext = computed(() => Boolean(selectedNode.value || selectedSubject.value))
const selectedHasRelationships = computed(() => (
  Boolean(selectedNode.value && relationshipCourseCodes.value.has(selectedNode.value.code))
))
watch(searchResults, (results) => {
  activeResultIndex.value = results.length ? 0 : -1
})

function chooseSubject(prefix: string) {
  selectedSubject.value = prefix
  searchInput.value = ''
  searchActive.value = false
  emit('select', '')
}

function handleSubjectChange(event: Event) {
  chooseSubject((event.target as HTMLSelectElement).value)
}

function chooseCourse(node: CourseUniverseNode, preserveSubject = false) {
  if (!preserveSubject) selectedSubject.value = ''
  searchInput.value = node.displayCode
  searchActive.value = false
  emit('select', node.code)
}

function handleCanvasSelect(code: string) {
  if (!code) {
    emit('select', '')
    searchInput.value = ''
    return
  }
  emit('select', code)
}

function clearContext() {
  selectedSubject.value = ''
  searchInput.value = ''
  searchActive.value = false
  emit('select', '')
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (!searchResults.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeResultIndex.value = (activeResultIndex.value + 1) % searchResults.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeResultIndex.value = (
      activeResultIndex.value - 1 + searchResults.value.length
    ) % searchResults.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const result = searchResults.value[activeResultIndex.value] || searchResults.value[0]
    if (result) chooseCourse(result)
  } else if (event.key === 'Escape') {
    searchActive.value = false
  }
}

function handleSearchFocusOut(event: FocusEvent) {
  const container = event.currentTarget as HTMLElement
  const next = event.relatedTarget as Node | null
  if (!next || !container.contains(next)) searchActive.value = false
}
</script>

<template>
  <section class="cu-explorer" :aria-label="t('courseUniverse.explorer.ariaLabel')">
    <header class="cu-explorer__header">
      <div class="cu-explorer__intro">
        <h2>{{ t('courseUniverse.explorer.title') }}</h2>
        <p>{{ t('courseUniverse.explorer.description') }}</p>
      </div>

      <div class="cu-explorer__controls">
        <div class="cu-explorer__search" @focusout="handleSearchFocusOut">
          <label for="course-graph-search">{{ t('courseUniverse.explorer.searchLabel') }}</label>
          <div class="cu-explorer__input-wrap">
            <span aria-hidden="true" class="cu-explorer__search-icon">⌕</span>
            <input
              id="course-graph-search"
              v-model="searchInput"
              type="search"
              role="combobox"
              autocomplete="off"
              :placeholder="t('courseUniverse.explorer.searchPlaceholder')"
              :aria-expanded="searchActive && searchResults.length > 0"
              aria-autocomplete="list"
              aria-controls="course-graph-search-results"
              :aria-activedescendant="activeResultIndex >= 0 ? `course-graph-result-${activeResultIndex}` : undefined"
              @focus="searchActive = true"
              @input="searchActive = true"
              @keydown="handleSearchKeydown"
            />
            <button
              v-if="searchInput"
              type="button"
              class="cu-explorer__clear-search"
              :aria-label="t('courseUniverse.explorer.clearSearch')"
              @click="searchInput = ''; searchActive = true"
            >
              ×
            </button>
          </div>
          <div
            v-if="searchActive && normalizedSearch"
            id="course-graph-search-results"
            class="cu-explorer__results"
            role="listbox"
          >
            <button
              v-for="(node, index) in searchResults"
              :id="`course-graph-result-${index}`"
              :key="node.code"
              type="button"
              role="option"
              :aria-selected="index === activeResultIndex"
              :class="['cu-explorer__result', { active: index === activeResultIndex }]"
              @mouseenter="activeResultIndex = index"
              @click="chooseCourse(node)"
            >
              <strong>{{ node.displayCode }}</strong>
              <span>{{ node.title }}</span>
              <small v-if="relationshipCourseCodes.has(node.code)">
                {{ t('courseUniverse.explorer.hasRelationships') }}
              </small>
              <small v-else>{{ t('courseUniverse.explorer.noRelationshipsShort') }}</small>
            </button>
            <p v-if="!searchResults.length" class="cu-explorer__no-results">
              {{ t('courseUniverse.explorer.noSearchResults') }}
            </p>
          </div>
        </div>

        <div class="cu-explorer__subject-select">
          <label for="course-graph-subject">{{ t('courseUniverse.explorer.subjectLabel') }}</label>
          <select
            id="course-graph-subject"
            :value="selectedSubject"
            @change="handleSubjectChange"
          >
            <option value="">{{ t('courseUniverse.explorer.chooseSubject') }}</option>
            <option
              v-for="option in subjectOptions"
              :key="option.prefix"
              :value="option.prefix"
            >
              {{ option.prefix }} ({{ option.count }})
            </option>
          </select>
        </div>
      </div>
    </header>

    <div v-if="!hasContext" class="cu-explorer__directory">
      <div class="cu-explorer__directory-heading">
        <div>
          <h3>{{ t('courseUniverse.explorer.directoryTitle') }}</h3>
          <p>{{ t('courseUniverse.explorer.directoryDescription') }}</p>
        </div>
        <span>{{ t('courseUniverse.explorer.subjectCount', { count: subjectOptions.length }) }}</span>
      </div>
      <div class="cu-explorer__subject-grid">
        <button
          v-for="option in subjectOptions"
          :key="option.prefix"
          type="button"
          class="cu-explorer__subject-card"
          @click="chooseSubject(option.prefix)"
        >
          <strong>{{ option.prefix }}</strong>
          <span>{{ t('courseUniverse.explorer.courseCount', { count: option.count }) }}</span>
          <small>
            {{ t('courseUniverse.explorer.relatedCount', { count: option.relatedCount }) }}
          </small>
          <i aria-hidden="true">→</i>
        </button>
      </div>
    </div>

    <template v-else>
      <div class="cu-explorer__context">
        <div>
          <span>{{ selectedNode ? t('courseUniverse.explorer.courseView') : t('courseUniverse.explorer.subjectView') }}</span>
          <strong>{{ selectedNode?.displayCode || selectedSubject }}</strong>
          <small v-if="selectedNode">{{ selectedNode.title }}</small>
          <small v-else-if="selectedSubjectOption">
            {{ t('courseUniverse.explorer.subjectSummary', {
              related: selectedSubjectOption.relatedCount,
              total: selectedSubjectOption.count,
            }) }}
          </small>
        </div>
        <button type="button" @click="clearContext">
          {{ t('courseUniverse.explorer.backToDirectory') }}
        </button>
      </div>

      <CourseUniverseLegend class="cu-explorer__legend" />

      <p
        v-if="selectedNode && !selectedHasRelationships"
        class="cu-explorer__relationship-note"
      >
        {{ t('courseUniverse.explorer.noRelationships', { course: selectedNode.displayCode }) }}
      </p>

      <CourseUniverseCanvas
        :components="components"
        :nodes="nodes"
        :lines="lines"
        :selected-prefix="selectedSubject"
        search-query=""
        @select="handleCanvasSelect"
        @toggle-planner="emit('toggle-planner', $event)"
      />

      <details v-if="selectedSubject && isolatedSubjectNodes.length" class="cu-explorer__isolated">
        <summary>
          <span>
            <strong>{{ t('courseUniverse.explorer.isolatedTitle') }}</strong>
            <small>{{ t('courseUniverse.explorer.isolatedDescription') }}</small>
          </span>
          <i>{{ isolatedSubjectNodes.length }}</i>
        </summary>
        <div class="cu-explorer__isolated-grid">
          <button
            v-for="node in isolatedSubjectNodes"
            :key="node.code"
            type="button"
            @click="chooseCourse(node, true)"
          >
            <strong>{{ node.displayCode }}</strong>
            <span>{{ node.title }}</span>
          </button>
        </div>
      </details>
    </template>
  </section>
</template>

<style scoped lang="scss">
.cu-explorer {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  display: grid;
  gap: 16px;
  padding: 18px;
}

.cu-explorer__header {
  align-items: end;
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(220px, 0.85fr) minmax(440px, 1.4fr);
}

.cu-explorer__intro h2,
.cu-explorer__directory h3 {
  color: var(--text-primary);
  font-size: 1.25rem;
  line-height: 1.2;
  margin: 0;
}

.cu-explorer__intro p,
.cu-explorer__directory-heading p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.55;
  margin: 6px 0 0;
}

.cu-explorer__controls {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(260px, 1fr) minmax(170px, 0.55fr);
}

.cu-explorer__search,
.cu-explorer__subject-select {
  min-width: 0;
  position: relative;
}

.cu-explorer__search > label,
.cu-explorer__subject-select label {
  color: var(--text-secondary);
  display: block;
  font-size: 0.75rem;
  font-weight: 750;
  margin: 0 0 6px;
}

.cu-explorer__input-wrap {
  position: relative;
}

.cu-explorer__input-wrap input,
.cu-explorer__subject-select select {
  appearance: none;
  background: var(--surface-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.875rem;
  height: 44px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
  width: 100%;
}

.cu-explorer__input-wrap input {
  padding: 0 42px 0 38px;
}

.cu-explorer__subject-select select {
  background-image: linear-gradient(45deg, transparent 50%, var(--text-secondary) 50%), linear-gradient(135deg, var(--text-secondary) 50%, transparent 50%);
  background-position: calc(100% - 16px) 18px, calc(100% - 11px) 18px;
  background-repeat: no-repeat;
  background-size: 5px 5px, 5px 5px;
  padding: 0 36px 0 12px;
}

.cu-explorer__input-wrap input:focus-visible,
.cu-explorer__subject-select select:focus-visible {
  border-color: var(--interactive-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 18%, transparent);
}

.cu-explorer__search-icon {
  color: var(--text-secondary);
  font-size: 1.2rem;
  left: 13px;
  position: absolute;
  top: 9px;
}

.cu-explorer__clear-search {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  font-size: 1.25rem;
  height: 40px;
  justify-content: center;
  position: absolute;
  right: 4px;
  top: 2px;
  width: 40px;
}

.cu-explorer__clear-search:focus-visible,
.cu-explorer__subject-card:focus-visible,
.cu-explorer__result:focus-visible,
.cu-explorer__context button:focus-visible,
.cu-explorer__isolated button:focus-visible {
  outline: 2px solid var(--interactive-primary);
  outline-offset: 2px;
}

.cu-explorer__results {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-medium);
  display: grid;
  gap: 4px;
  left: 0;
  max-height: 360px;
  overflow: auto;
  padding: 6px;
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 12;
}

.cu-explorer__result {
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  gap: 3px;
  grid-template-columns: auto 1fr auto;
  min-height: 52px;
  padding: 8px 10px;
  text-align: left;
}

.cu-explorer__result:hover,
.cu-explorer__result.active {
  background: color-mix(in srgb, var(--interactive-primary) 9%, var(--surface-secondary));
}

.cu-explorer__result strong {
  font-size: 0.8125rem;
}

.cu-explorer__result span {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cu-explorer__result small {
  color: var(--text-tertiary);
  font-size: 0.6875rem;
}

.cu-explorer__no-results {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  margin: 0;
  padding: 12px;
}

.cu-explorer__directory {
  background: var(--surface-secondary);
  border-radius: 12px;
  padding: 16px;
}

.cu-explorer__directory-heading {
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.cu-explorer__directory-heading > span {
  background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  border-radius: 999px;
  color: var(--interactive-primary);
  flex: 0 0 auto;
  font-size: 0.75rem;
  font-weight: 750;
  padding: 6px 10px;
}

.cu-explorer__subject-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 14px;
}

.cu-explorer__subject-card {
  align-items: center;
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  gap: 2px 8px;
  grid-template-columns: 1fr auto;
  min-height: 76px;
  padding: 11px 12px;
  text-align: left;
  transition: border-color 0.18s, background 0.18s, transform 0.18s;
}

.cu-explorer__subject-card:hover {
  background: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-primary));
  border-color: var(--interactive-primary);
  transform: translateY(-1px);
}

.cu-explorer__subject-card strong {
  font-size: 0.9375rem;
}

.cu-explorer__subject-card span,
.cu-explorer__subject-card small {
  color: var(--text-secondary);
  font-size: 0.75rem;
  grid-column: 1;
}

.cu-explorer__subject-card i {
  color: var(--interactive-primary);
  font-style: normal;
  grid-column: 2;
  grid-row: 1 / span 3;
}

.cu-explorer__context {
  align-items: center;
  background: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-secondary));
  border-radius: 10px;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 10px 12px;
}

.cu-explorer__context > div {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
}

.cu-explorer__context span {
  color: var(--text-tertiary);
  font-size: 0.75rem;
  font-weight: 700;
}

.cu-explorer__context strong {
  color: var(--text-primary);
  font-size: 1rem;
}

.cu-explorer__context small {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  min-width: 0;
}

.cu-explorer__context button {
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  flex: 0 0 auto;
  font-size: 0.75rem;
  font-weight: 750;
  min-height: 44px;
  padding: 0 12px;
}

.cu-explorer__legend {
  min-width: 0;
}

.cu-explorer__relationship-note {
  background: color-mix(in srgb, var(--semantic-warning) 10%, var(--surface-secondary));
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  line-height: 1.5;
  margin: 0;
  padding: 10px 12px;
}

.cu-explorer__isolated {
  background: var(--surface-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.cu-explorer__isolated summary {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  list-style: none;
  min-height: 58px;
  padding: 10px 14px;
}

.cu-explorer__isolated summary::-webkit-details-marker {
  display: none;
}

.cu-explorer__isolated summary span {
  display: grid;
  gap: 3px;
}

.cu-explorer__isolated summary strong {
  color: var(--text-primary);
  font-size: 0.875rem;
}

.cu-explorer__isolated summary small {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 400;
}

.cu-explorer__isolated summary i {
  background: var(--surface-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  min-width: 30px;
  padding: 5px 8px;
  text-align: center;
}

.cu-explorer__isolated-grid {
  border-top: 1px solid var(--border-secondary);
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 12px;
}

.cu-explorer__isolated-grid button {
  appearance: none;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 9px;
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  gap: 3px;
  min-height: 58px;
  padding: 9px 10px;
  text-align: left;
}

.cu-explorer__isolated-grid button:hover {
  border-color: var(--interactive-primary);
}

.cu-explorer__isolated-grid strong {
  font-size: 0.8125rem;
}

.cu-explorer__isolated-grid span {
  color: var(--text-secondary);
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .cu-explorer__header {
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .cu-explorer__subject-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .cu-explorer {
    border-left: 0;
    border-radius: 0;
    border-right: 0;
    gap: 14px;
    margin-inline: -14px;
    padding: 16px 14px;
  }

  .cu-explorer__controls {
    grid-template-columns: 1fr;
  }

  .cu-explorer__subject-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cu-explorer__subject-card {
    min-height: 72px;
  }

  .cu-explorer__context {
    align-items: flex-start;
  }

  .cu-explorer__context > div {
    display: grid;
    gap: 3px;
  }

  .cu-explorer__isolated-grid {
    grid-template-columns: 1fr;
  }

  .cu-explorer__result {
    grid-template-columns: auto 1fr;
  }

  .cu-explorer__result small {
    display: none;
  }
}

@media (max-width: 380px) {
  .cu-explorer__subject-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cu-explorer__subject-card,
  .cu-explorer__input-wrap input,
  .cu-explorer__subject-select select {
    transition: none;
  }
}
</style>
