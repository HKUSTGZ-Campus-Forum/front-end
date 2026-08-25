<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CoursePathWorkspace from './CoursePathWorkspace.vue'
import CourseSubjectMap from './CourseSubjectMap.vue'
import type { CourseOverviewPayload } from '~/types/course-overview'
import type {
  CourseUniverseMapComponent,
  CourseUniverseMapLine,
  CourseUniverseNode,
} from '~/utils/courseUniverse'
import {
  buildCourseUniverseRelationshipCourseCodeSet,
  buildCourseUniverseSubjectOptions,
  getCourseUniverseNodePrefix,
} from '~/utils/courseUniverse'

const props = defineProps<{
  components: CourseUniverseMapComponent[]
  nodes: CourseUniverseNode[]
  lines: CourseUniverseMapLine[]
  overview: CourseOverviewPayload | null
  overviewLoading: boolean
  overviewError: string
  activeSemesterLabel: string
  plannerUpdatingCodes: Set<string>
}>()

const emit = defineEmits<{
  (event: 'select', code: string): void
  (event: 'toggle-planner', code: string): void
  (event: 'retry-overview'): void
}>()

const { t } = useI18n()
const searchInput = ref('')
const searchActive = ref(false)
const activeResultIndex = ref(0)
const selectedSubject = ref('')
const activeView = ref<'path' | 'subject'>('path')
const showProgress = ref(true)

const selectedNode = computed(() => props.nodes.find(node => node.selected) || null)
const relationshipCourseCodes = computed(() => buildCourseUniverseRelationshipCourseCodeSet({
  components: props.components,
  lines: props.lines,
}))
const subjectOptions = computed(() => buildCourseUniverseSubjectOptions({
  nodes: props.nodes,
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

watch(searchResults, (results) => {
  activeResultIndex.value = results.length ? 0 : -1
})

watch(selectedNode, (node) => {
  if (!node) return
  searchInput.value = node.displayCode
  if (!selectedSubject.value) selectedSubject.value = getCourseUniverseNodePrefix(node.code)
})

function chooseSubject(prefix: string) {
  selectedSubject.value = prefix
  searchInput.value = ''
  searchActive.value = false
  activeView.value = 'subject'
  emit('select', '')
}

function handleSubjectChange(event: Event) {
  const prefix = (event.target as HTMLSelectElement).value
  if (prefix) chooseSubject(prefix)
  else clearContext()
}

function chooseCourse(node: CourseUniverseNode, preserveSubject = false) {
  if (!preserveSubject || !selectedSubject.value) selectedSubject.value = getCourseUniverseNodePrefix(node.code)
  searchInput.value = node.displayCode
  searchActive.value = false
  activeView.value = 'path'
  emit('select', node.code)
}

function selectCourseByCode(code: string, preserveSubject = false) {
  const node = props.nodes.find(candidate => candidate.code === code)
  if (node) chooseCourse(node, preserveSubject)
  else emit('select', code)
}

function clearContext() {
  selectedSubject.value = ''
  searchInput.value = ''
  searchActive.value = false
  activeView.value = 'path'
  emit('select', '')
}

function returnToSubject() {
  if (!selectedSubject.value && selectedNode.value) selectedSubject.value = getCourseUniverseNodePrefix(selectedNode.value.code)
  activeView.value = 'subject'
  emit('select', '')
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (!searchResults.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeResultIndex.value = (activeResultIndex.value + 1) % searchResults.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeResultIndex.value = (activeResultIndex.value - 1 + searchResults.value.length) % searchResults.value.length
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
  <section class="course-explorer" :aria-label="t('courseUniverse.redesign.explorer.title')">
    <header class="course-explorer__masthead">
      <div class="course-explorer__intro">
        <span><Icon name="lucide:network" aria-hidden="true" />{{ t('courseUniverse.redesign.explorer.kicker') }}</span>
        <h2>{{ t('courseUniverse.redesign.explorer.title') }}</h2>
        <p>{{ t('courseUniverse.redesign.explorer.description') }}</p>
      </div>

      <div class="course-explorer__finders">
        <div class="course-explorer__search" @focusout="handleSearchFocusOut">
          <label for="course-path-search">{{ t('courseUniverse.explorer.searchLabel') }}</label>
          <div class="course-explorer__input">
            <Icon name="lucide:search" aria-hidden="true" />
            <input
              id="course-path-search"
              v-model="searchInput"
              type="search"
              role="combobox"
              autocomplete="off"
              :placeholder="t('courseUniverse.redesign.explorer.searchPlaceholder')"
              :aria-expanded="searchActive && searchResults.length > 0"
              aria-autocomplete="list"
              aria-controls="course-path-results"
              :aria-activedescendant="activeResultIndex >= 0 ? `course-path-result-${activeResultIndex}` : undefined"
              @focus="searchActive = true"
              @input="searchActive = true"
              @keydown="handleSearchKeydown"
            >
            <button
              v-if="searchInput"
              type="button"
              :aria-label="t('courseUniverse.explorer.clearSearch')"
              @click="searchInput = ''; searchActive = true"
            >
              <Icon name="lucide:x" aria-hidden="true" />
            </button>
          </div>
          <div
            v-if="searchActive && normalizedSearch"
            id="course-path-results"
            class="course-explorer__results"
            role="listbox"
          >
            <button
              v-for="(node, index) in searchResults"
              :id="`course-path-result-${index}`"
              :key="node.code"
              type="button"
              role="option"
              :aria-selected="index === activeResultIndex"
              :class="{ active: index === activeResultIndex }"
              @mouseenter="activeResultIndex = index"
              @click="chooseCourse(node)"
            >
              <strong>{{ node.displayCode }}</strong>
              <span>{{ node.title }}</span>
              <small>{{ relationshipCourseCodes.has(node.code)
                ? t('courseUniverse.explorer.hasRelationships')
                : t('courseUniverse.explorer.noRelationshipsShort') }}</small>
            </button>
            <p v-if="!searchResults.length">{{ t('courseUniverse.explorer.noSearchResults') }}</p>
          </div>
        </div>

        <div class="course-explorer__subject-select">
          <label for="course-path-subject">{{ t('courseUniverse.explorer.subjectLabel') }}</label>
          <div>
            <Icon name="lucide:library-big" aria-hidden="true" />
            <select id="course-path-subject" :value="selectedSubject" @change="handleSubjectChange">
              <option value="">{{ t('courseUniverse.explorer.chooseSubject') }}</option>
              <option v-for="option in subjectOptions" :key="option.prefix" :value="option.prefix">
                {{ option.prefix }} · {{ option.count }}
              </option>
            </select>
            <Icon name="lucide:chevron-down" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>

    <nav class="course-explorer__toolbar" :aria-label="t('courseUniverse.redesign.explorer.views')">
      <div class="course-explorer__tabs">
        <button
          type="button"
          :class="{ active: activeView === 'path' }"
          :aria-pressed="activeView === 'path'"
          @click="activeView = 'path'"
        >
          <Icon name="lucide:route" aria-hidden="true" />
          {{ t('courseUniverse.redesign.explorer.coursePath') }}
        </button>
        <button
          type="button"
          :class="{ active: activeView === 'subject' }"
          :aria-pressed="activeView === 'subject'"
          @click="activeView = 'subject'"
        >
          <Icon name="lucide:map" aria-hidden="true" />
          {{ t('courseUniverse.redesign.explorer.subjectMap') }}
        </button>
      </div>
      <label class="course-explorer__progress-toggle">
        <input v-model="showProgress" type="checkbox">
        <span aria-hidden="true"><i /></span>
        {{ t('courseUniverse.redesign.explorer.showProgress') }}
      </label>
    </nav>

    <div v-if="selectedNode || selectedSubject" class="course-explorer__context">
      <span>{{ t('courseUniverse.redesign.explorer.contextNavigation') }}</span>
      <button type="button" @click="clearContext">
        <Icon name="lucide:layout-grid" aria-hidden="true" />
        {{ t('courseUniverse.redesign.explorer.clearSubject') }}
      </button>
      <Icon name="lucide:chevron-right" aria-hidden="true" />
      <button v-if="selectedSubject" type="button" @click="returnToSubject">
        {{ selectedSubject }}
      </button>
      <template v-if="selectedNode">
        <Icon name="lucide:chevron-right" aria-hidden="true" />
        <strong>{{ selectedNode.displayCode }}</strong>
      </template>
    </div>

    <CoursePathWorkspace
      v-if="activeView === 'path' && selectedNode"
      :selected-node="selectedNode"
      :nodes="nodes"
      :overview="overview"
      :loading="overviewLoading"
      :error="overviewError"
      :active-semester-label="activeSemesterLabel"
      :planner-updating-codes="plannerUpdatingCodes"
      @select="selectCourseByCode"
      @toggle-planner="emit('toggle-planner', $event)"
      @retry="emit('retry-overview')"
    />

    <CourseSubjectMap
      v-else-if="activeView === 'subject' && selectedSubject"
      :components="components"
      :lines="lines"
      :nodes="nodes"
      :prefix="selectedSubject"
      :relationship-course-codes="relationshipCourseCodes"
      :show-progress="showProgress"
      @select="selectCourseByCode($event, true)"
    />

    <section v-else class="course-explorer__directory">
      <header>
        <div>
          <span>{{ activeView === 'path'
            ? t('courseUniverse.redesign.explorer.pathStart')
            : t('courseUniverse.redesign.explorer.mapStart') }}</span>
          <h3>{{ t('courseUniverse.explorer.directoryTitle') }}</h3>
          <p>{{ activeView === 'path'
            ? t('courseUniverse.redesign.explorer.pathStartHelp')
            : t('courseUniverse.redesign.explorer.mapStartHelp') }}</p>
        </div>
        <strong>{{ t('courseUniverse.explorer.subjectCount', { count: subjectOptions.length }) }}</strong>
      </header>
      <div>
        <button v-for="option in subjectOptions" :key="option.prefix" type="button" @click="chooseSubject(option.prefix)">
          <span>
            <strong>{{ option.prefix }}</strong>
            <small>{{ t('courseUniverse.explorer.courseCount', { count: option.count }) }}</small>
          </span>
          <span>{{ t('courseUniverse.explorer.relatedCount', { count: option.relatedCount }) }}</span>
          <Icon name="lucide:arrow-up-right" aria-hidden="true" />
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.course-explorer { display: grid; gap: 14px; }

.course-explorer__masthead {
  align-items: end;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  display: grid;
  gap: 28px;
  grid-template-columns: minmax(260px, 1fr) minmax(420px, 0.9fr);
  padding: 22px;
}

.course-explorer__intro > span { align-items: center; color: var(--interactive-active-text); display: flex; font-size: .75rem; font-weight: 750; gap: 7px; }
.course-explorer__intro h2 { color: var(--text-primary); font-size: 1.5rem; line-height: 1.2; margin: 7px 0 0; }
.course-explorer__intro p { color: var(--text-secondary); font-size: .875rem; line-height: 1.55; margin: 8px 0 0; max-width: 62ch; }
.course-explorer__finders { align-items: end; display: grid; gap: 10px; grid-template-columns: minmax(240px, 1fr) minmax(180px, .55fr); }
.course-explorer__search, .course-explorer__subject-select { position: relative; }
.course-explorer__search > label, .course-explorer__subject-select > label { color: var(--text-secondary); display: block; font-size: .6875rem; font-weight: 650; margin-bottom: 6px; }
.course-explorer__input, .course-explorer__subject-select > div { align-items: center; background: var(--surface-secondary); border: 1px solid var(--border-primary); border-radius: 10px; display: flex; gap: 8px; min-height: 44px; padding: 0 12px; }
.course-explorer__input:focus-within, .course-explorer__subject-select > div:focus-within { border-color: var(--interactive-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 14%, transparent); }
.course-explorer__input :deep(svg), .course-explorer__subject-select :deep(svg) { color: var(--text-tertiary); flex: 0 0 auto; height: 17px; width: 17px; }
.course-explorer__input input, .course-explorer__subject-select select { appearance: none; background: transparent; border: 0; color: var(--text-primary); font: inherit; font-size: .8125rem; min-width: 0; outline: 0; width: 100%; }
.course-explorer__input button { align-items: center; background: transparent; border: 0; border-radius: 5px; color: var(--text-secondary); display: flex; padding: 4px; }
.course-explorer__results { background: var(--surface-elevated, var(--surface-primary)); border: 1px solid var(--border-primary); border-radius: 11px; box-shadow: 0 16px 40px rgba(15, 42, 78, .16); display: grid; left: 0; max-height: 350px; overflow: auto; padding: 5px; position: absolute; right: 0; top: calc(100% + 6px); z-index: 20; }
.course-explorer__results button { background: transparent; border: 0; border-radius: 8px; display: grid; gap: 2px; grid-template-columns: auto 1fr; padding: 9px; text-align: left; }
.course-explorer__results button:hover, .course-explorer__results button.active { background: var(--interactive-hover); }
.course-explorer__results strong { color: var(--text-primary); font-size: .8125rem; }
.course-explorer__results span { color: var(--text-secondary); font-size: .75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.course-explorer__results small { color: var(--text-tertiary); font-size: .625rem; grid-column: 1 / -1; }
.course-explorer__results p { color: var(--text-secondary); font-size: .8125rem; margin: 0; padding: 16px; text-align: center; }

.course-explorer__toolbar { align-items: center; background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 12px; display: flex; justify-content: space-between; padding: 6px; }
.course-explorer__tabs { display: flex; gap: 4px; }
.course-explorer__tabs button { align-items: center; background: transparent; border: 0; border-radius: 8px; color: var(--text-secondary); display: flex; font-size: .8125rem; font-weight: 700; gap: 7px; min-height: 36px; padding: 0 12px; }
.course-explorer__tabs button.active { background: var(--interactive-active-bg); color: var(--interactive-active-text); }
.course-explorer__tabs :deep(svg) { height: 16px; width: 16px; }
.course-explorer__progress-toggle { align-items: center; color: var(--text-secondary); cursor: pointer; display: flex; font-size: .75rem; gap: 8px; padding: 0 8px; }
.course-explorer__progress-toggle input { height: 1px; opacity: 0; position: absolute; width: 1px; }
.course-explorer__progress-toggle > span { background: var(--surface-tertiary); border: 1px solid var(--border-primary); border-radius: 999px; display: block; height: 20px; padding: 2px; transition: background .16s ease; width: 36px; }
.course-explorer__progress-toggle i { background: var(--surface-primary); border-radius: 50%; box-shadow: 0 1px 3px rgba(15, 42, 78, .22); display: block; height: 14px; transition: transform .16s ease; width: 14px; }
.course-explorer__progress-toggle input:checked + span { background: var(--interactive-primary); border-color: var(--interactive-primary); }
.course-explorer__progress-toggle input:checked + span i { transform: translateX(15px); }
.course-explorer__progress-toggle input:focus-visible + span { outline: 3px solid color-mix(in srgb, var(--interactive-primary) 26%, transparent); outline-offset: 2px; }

.course-explorer__context { align-items: center; color: var(--text-tertiary); display: flex; flex-wrap: wrap; font-size: .6875rem; gap: 5px; padding: 0 5px; }
.course-explorer__context > span { margin-right: 4px; }
.course-explorer__context button { align-items: center; background: transparent; border: 0; border-radius: 6px; color: var(--text-secondary); display: flex; font-size: .75rem; gap: 5px; padding: 5px 6px; }
.course-explorer__context button:hover { background: var(--interactive-hover); color: var(--interactive-active-text); }
.course-explorer__context strong { color: var(--text-primary); font-size: .75rem; }
.course-explorer__context :deep(svg) { height: 13px; width: 13px; }

.course-explorer__directory { background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 14px; overflow: hidden; }
.course-explorer__directory > header { align-items: end; border-bottom: 1px solid var(--border-secondary); display: flex; justify-content: space-between; padding: 20px; }
.course-explorer__directory > header span { color: var(--interactive-active-text); font-size: .6875rem; font-weight: 750; }
.course-explorer__directory h3 { color: var(--text-primary); font-size: 1.125rem; margin: 5px 0 0; }
.course-explorer__directory p { color: var(--text-secondary); font-size: .8125rem; line-height: 1.5; margin: 6px 0 0; }
.course-explorer__directory > header > strong { background: var(--interactive-active-bg); border-radius: 999px; color: var(--interactive-active-text); font-size: .75rem; padding: 7px 10px; }
.course-explorer__directory > div { display: grid; gap: 1px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.course-explorer__directory > div > button { align-items: center; background: var(--surface-primary); border: 0; border-bottom: 1px solid var(--border-secondary); border-right: 1px solid var(--border-secondary); color: var(--text-secondary); display: grid; gap: 8px; grid-template-columns: 1fr auto auto; min-height: 86px; padding: 14px 16px; text-align: left; }
.course-explorer__directory > div > button:hover { background: var(--interactive-hover); }
.course-explorer__directory > div > button > span:first-child { display: grid; gap: 3px; }
.course-explorer__directory > div > button strong { color: var(--text-primary); font-size: .9375rem; }
.course-explorer__directory > div > button small, .course-explorer__directory > div > button > span:nth-child(2) { color: var(--text-tertiary); font-size: .6875rem; }
.course-explorer__directory > div > button :deep(svg) { height: 15px; width: 15px; }

button, select, input { font-family: inherit; }
button { cursor: pointer; }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid color-mix(in srgb, var(--interactive-primary) 28%, transparent); outline-offset: 2px; }

@media (max-width: 1080px) {
  .course-explorer__masthead { align-items: stretch; grid-template-columns: 1fr; }
  .course-explorer__directory > div { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .course-explorer__masthead { gap: 20px; padding: 17px; }
  .course-explorer__finders { grid-template-columns: 1fr; }
  .course-explorer__toolbar { align-items: stretch; gap: 8px; padding: 7px; }
  .course-explorer__tabs { display: grid; flex: 1; grid-template-columns: 1fr 1fr; }
  .course-explorer__tabs button { justify-content: center; padding: 0 8px; }
  .course-explorer__progress-toggle { font-size: 0; padding: 0 3px; }
  .course-explorer__directory > header { align-items: flex-start; gap: 12px; }
  .course-explorer__directory > div { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 430px) {
  .course-explorer__intro h2 { font-size: 1.25rem; }
  .course-explorer__directory > div { grid-template-columns: 1fr; }
  .course-explorer__directory > header > strong { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .course-explorer__progress-toggle > span, .course-explorer__progress-toggle i { transition: none; }
}
</style>
