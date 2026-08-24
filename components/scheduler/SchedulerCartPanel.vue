<!-- front-end/components/scheduler/SchedulerCartPanel.vue -->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse, SearchResult, SearchResponse } from '~/utils/scheduler'
import { createLatestRequestTracker, runPendingSchedulerAction } from '~/utils/schedulerAsync'

type ActionStatus = 'idle' | 'loading' | 'success' | 'fail'

interface ActionState {
  status: ActionStatus
}

// Curated quick-pick subject chips (two rows). Loading every subject defeats
// the purpose of one-click selection, so only these common prefixes are shown.
const COMMON_SUBJECT_ROWS = [
  ['UFUG', 'UCUG', 'DLED'],
  ['AIAA', 'AMAT', 'DSAA', 'FTEC', 'MICS', 'ROAS', 'SMMG'],
]

const props = defineProps<{
  semesterId: string
  courseList: CartCourse[]
  visible: boolean
  addCourse: (code: string) => Promise<void>
  removeCourse: (code: string) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const { searchCourses } = useScheduler()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const totalResults = ref(0)
const currentPage = ref(1)
const pageSize = 8
const searching = ref(false)
const pendingCodes = ref<Set<string>>(new Set())
const showCartDrawer = ref(false)
const errorMessage = ref('')
const actionStates = ref<Record<string, ActionState>>({})
const statusTimers = new Map<string, ReturnType<typeof setTimeout>>()

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const searchRequests = createLatestRequestTracker()

function creditColorVar(credit: number, countsTowardTermLoad = true): string {
  if (!countsTowardTermLoad) return 'var(--credit-excluded)'
  const level = Math.min(6, Math.max(1, credit))
  return `var(--credit-level-${level})`
}

function setActionStatus(code: string, status: ActionStatus) {
  if (status === 'idle') {
    actionStates.value = { ...actionStates.value }
    delete actionStates.value[code]
  } else {
    actionStates.value = { ...actionStates.value, [code]: { status } }
  }
}

function getActionStatus(code: string): ActionStatus {
  return actionStates.value[code]?.status ?? 'idle'
}

function statusTimer(code: string, ms: number, next: ActionStatus) {
  const existing = statusTimers.get(code)
  if (existing) clearTimeout(existing)
  statusTimers.set(code, setTimeout(() => {
    statusTimers.delete(code)
    setActionStatus(code, next)
  }, ms))
}

async function runAction(code: string, action: () => Promise<void>) {
  setActionStatus(code, 'loading')
  try {
    await action()
    setActionStatus(code, 'success')
    statusTimer(code, 1200, 'idle')
  } catch {
    setActionStatus(code, 'fail')
    statusTimer(code, 1800, 'idle')
  }
}

watch([searchQuery, () => props.semesterId, () => props.visible], ([query, _semesterId, visible]) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = null
  searchRequests.invalidate()
  searching.value = false
  errorMessage.value = ''
  currentPage.value = 1
  searchResults.value = []
  totalResults.value = 0

  if (!visible || !query.trim()) {
    return
  }

  searching.value = true
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void doSearch(1)
  }, 300)
})

async function doSearch(page: number) {
  const query = searchQuery.value.trim()
  const semesterId = props.semesterId
  if (!props.visible || !query) {
    searchRequests.invalidate()
    searchResults.value = []
    totalResults.value = 0
    searching.value = false
    return
  }

  const request = searchRequests.begin()
  errorMessage.value = ''
  searching.value = true
  currentPage.value = page
  try {
    const result: SearchResponse = await searchCourses(
      query,
      semesterId,
      page,
      pageSize,
      request.signal,
    )
    if (!request.isCurrent() || !props.visible || searchQuery.value.trim() !== query || props.semesterId !== semesterId) return
    searchResults.value = result.items
    totalResults.value = result.total
  } catch {
    if (!request.isCurrent()) return
    searchResults.value = []
    totalResults.value = 0
    errorMessage.value = t('scheduler.searchFailed')
  } finally {
    if (request.isCurrent()) searching.value = false
  }
}

function inCart(code: string): boolean {
  return props.courseList.some(c => c.course_code === code)
}

async function handleAdd(code: string) {
  await runPendingSchedulerAction(pendingCodes.value, code, () => (
    runAction(code, () => props.addCourse(code))
  ))
}

async function handleRemove(code: string) {
  await runPendingSchedulerAction(pendingCodes.value, code, () => (
    runAction(code, () => props.removeCourse(code))
  ))
}

const totalCredits = computed(() => (
  props.courseList.reduce((sum, c) => sum + (c.term_load_credit ?? c.credit ?? 0), 0)
))

// Guard against closing via the click event's nearest-common-ancestor
// behaviour: if a pointer goes down inside the card and is released on the
// backdrop, the click event fires on the panel root, which @click.self would
// misread as "clicked the backdrop". Track where the pointer went down so we
// only close when the press also started outside the card.
const panelPointerDownInside = ref(false)

function handlePanelPointerDown() {
  panelPointerDownInside.value = true
}

function handlePanelClick() {
  if (panelPointerDownInside.value) {
    panelPointerDownInside.value = false
    return
  }
  emit('close')
}

const drawerPointerDownInside = ref(false)

function handleDrawerPointerDown() {
  drawerPointerDownInside.value = true
}

function handleDrawerClick() {
  if (drawerPointerDownInside.value) {
    drawerPointerDownInside.value = false
    return
  }
  showCartDrawer.value = false
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  searchRequests.invalidate()
  statusTimers.forEach(timer => clearTimeout(timer))
  statusTimers.clear()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="cart-panel" @pointerdown.self="panelPointerDownInside = false" @click.self="handlePanelClick">
        <div class="cart-panel__content" @pointerdown="handlePanelPointerDown">
          <div class="cart-panel__header">
            <div>
              <h2>{{ t('scheduler.cart') }}</h2>
              <p>{{ t('scheduler.cartSubtitle') }}</p>
            </div>
            <button class="cart-panel__close" type="button" :aria-label="t('scheduler.close')" @click="emit('close')">&times;</button>
          </div>

          <div class="cart-panel__search">
            <span class="cart-panel__search-icon" aria-hidden="true"><Icon name="lucide:search" /></span>
            <input v-model="searchQuery" type="text" :placeholder="t('scheduler.searchPlaceholder')" class="cart-panel__input" />
            <Icon v-if="searching" name="lucide:loader-circle" class="cart-panel__search-spinner" aria-hidden="true" />
          </div>

          <div class="cart-panel__subjects">
            <div v-for="(row, rowIndex) in COMMON_SUBJECT_ROWS" :key="rowIndex" class="cart-panel__subjects-row">
              <button
                v-for="subject in row"
                :key="subject"
                type="button"
                class="cart-panel__subject-btn"
                :class="{ active: searchQuery === subject }"
                @click="searchQuery = subject"
              >{{ subject }}</button>
            </div>
          </div>

          <div class="cart-panel__results">
            <div v-if="searching" class="cart-panel__loading">{{ t('scheduler.searching') }}</div>
            <div v-else-if="errorMessage" class="cart-panel__error">{{ errorMessage }}</div>
            <div v-else-if="searchResults.length === 0 && searchQuery" class="cart-panel__empty">
              <div class="cart-panel__empty-title">{{ t('scheduler.noResults') }}</div>
              <p>{{ t('scheduler.noResultsDescription') }}</p>
            </div>
            <div v-else-if="searchResults.length === 0" class="cart-panel__empty">
              <div class="cart-panel__empty-title">{{ t('scheduler.cartSearchEmptyTitle') }}</div>
              <p>{{ t('scheduler.cartSearchEmptyDescription') }}</p>
            </div>
            <div v-else>
              <div v-for="item in searchResults" :key="item.course_code" class="cart-panel__result">
                <div class="cart-panel__result-info">
                  <div class="cart-panel__result-main">
                    <span class="cart-panel__result-code">{{ item.course_code }}</span>
                    <span class="cart-panel__result-credits" :style="{ color: creditColorVar(item.credit, item.counts_toward_term_load) }">· {{ t('scheduler.credits', { count: item.credit }) }}<span v-if="item.counts_toward_term_load === false"> {{ t('scheduler.notCountedShort') }}</span></span>
                    <SchedulerCourseInfoPopover
                      :course-code="item.course_code"
                      :course-title="item.course_title"
                      :credit="item.credit"
                      :counts-toward-term-load="item.counts_toward_term_load"
                      :semester-id="semesterId"
                      align="left"
                    />
                  </div>
                  <span class="cart-panel__result-title">{{ item.course_title }}</span>
                </div>
                <div class="cart-panel__result-actions">
                  <span v-if="getActionStatus(item.course_code) === 'loading'" class="cart-panel__status-slot">
                    <Icon name="lucide:loader-circle" mode="svg" class="cart-panel__status-icon cart-panel__status-icon--loading" aria-hidden="true" />
                  </span>
                  <span v-else-if="getActionStatus(item.course_code) === 'success'" class="cart-panel__status-slot">
                    <Icon name="lucide:circle-check" mode="svg" class="cart-panel__status-icon cart-panel__status-icon--success" aria-hidden="true" />
                  </span>
                  <span v-else-if="getActionStatus(item.course_code) === 'fail'" class="cart-panel__status-fail">
                    <Icon name="lucide:circle-x" class="cart-panel__status-icon cart-panel__status-icon--fail" aria-hidden="true" />
                    <span class="cart-panel__status-fail-text">{{ t('scheduler.cartFailed') }}</span>
                  </span>
                  <button v-else-if="!inCart(item.course_code)" type="button" class="cart-panel__add-btn" :aria-label="t('scheduler.add')" :disabled="pendingCodes.has(item.course_code)" @click="handleAdd(item.course_code)">
                    <Icon name="lucide:circle-plus" aria-hidden="true" />
                  </button>
                  <button v-else type="button" class="cart-panel__remove-btn" :aria-label="t('scheduler.remove')" :disabled="pendingCodes.has(item.course_code)" @click="handleRemove(item.course_code)">
                    <Icon name="lucide:circle-minus" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="cart-panel__footer">
            <div class="cart-panel__pagination" :class="{ 'cart-panel__pagination--empty': !(totalResults > pageSize) }">
              <template v-if="totalResults > pageSize">
                <button type="button" :disabled="currentPage <= 1" :aria-label="t('scheduler.firstPlan')" @click="doSearch(1)">
                  <Icon name="lucide:chevrons-left" class="cart-panel__pagination-icon" />
                </button>
                <button type="button" :disabled="currentPage <= 1" :aria-label="t('scheduler.previousPlan')" @click="doSearch(currentPage - 1)">
                  <Icon name="lucide:chevron-left" class="cart-panel__pagination-icon" />
                </button>
                <span>{{ currentPage }} / {{ Math.ceil(totalResults / pageSize) }} · {{ t('scheduler.resultsCount', { total: totalResults }) }}</span>
                <button type="button" :disabled="currentPage >= Math.ceil(totalResults / pageSize)" :aria-label="t('scheduler.nextPlan')" @click="doSearch(currentPage + 1)">
                  <Icon name="lucide:chevron-right" class="cart-panel__pagination-icon" />
                </button>
                <button type="button" :disabled="currentPage >= Math.ceil(totalResults / pageSize)" :aria-label="t('scheduler.lastPlan')" @click="doSearch(Math.ceil(totalResults / pageSize))">
                  <Icon name="lucide:chevrons-right" class="cart-panel__pagination-icon" />
                </button>
              </template>
            </div>
            <button type="button" class="cart-panel__drawer-btn" @click="showCartDrawer = true">
              <Icon name="lucide:shopping-cart" class="cart-panel__drawer-btn-icon" aria-hidden="true" />
              {{ t('scheduler.cart') }} ({{ courseList.length }})
            </button>
          </div>

          <div v-if="showCartDrawer" class="cart-panel__drawer-overlay" @pointerdown.self="drawerPointerDownInside = false" @click.self="handleDrawerClick">
            <div class="cart-panel__drawer-card" @pointerdown="handleDrawerPointerDown">
              <div class="cart-panel__drawer-header">
                <h3>{{ t('scheduler.cart') }}</h3>
                <button type="button" class="cart-panel__drawer-close" :aria-label="t('scheduler.close')" @click="showCartDrawer = false">
                  <Icon name="lucide:x" aria-hidden="true" />
                </button>
              </div>
              <div class="cart-panel__drawer-list">
                <div v-if="courseList.length === 0" class="cart-panel__drawer-empty">{{ t('scheduler.emptyCart') }}</div>
                <div v-else v-for="course in courseList" :key="course.course_code" class="cart-panel__drawer-item">
                  <div class="cart-panel__drawer-info">
                    <div class="cart-panel__drawer-meta">
                      <span class="cart-panel__drawer-code">{{ course.course_code }}</span>
                      <span class="cart-panel__drawer-credits" :style="{ color: creditColorVar(course.credit, course.counts_toward_term_load) }">· {{ t('scheduler.credits', { count: course.credit }) }}<span v-if="course.counts_toward_term_load === false"> {{ t('scheduler.notCountedShort') }}</span></span>
                      <SchedulerCourseInfoPopover
                        :course-code="course.course_code"
                        :course-title="course.course_title"
                        :credit="course.credit"
                        :counts-toward-term-load="course.counts_toward_term_load"
                        :semester-id="semesterId"
                        align="left"
                      />
                    </div>
                    <span class="cart-panel__drawer-title">{{ course.course_title }}</span>
                  </div>
                  <button type="button" class="cart-panel__drawer-remove" :aria-label="t('scheduler.remove')" :disabled="pendingCodes.has(course.course_code)" @click="handleRemove(course.course_code)">
                    <Icon v-if="pendingCodes.has(course.course_code)" name="lucide:loader-circle" mode="svg" class="cart-panel__drawer-remove-spinner" aria-hidden="true" />
                    <Icon v-else name="lucide:trash-2" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div class="cart-panel__drawer-footer">
                <span class="cart-panel__drawer-total-label">{{ t('scheduler.totalCredits') }}</span>
                <strong class="cart-panel__drawer-total-value">{{ totalCredits }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@keyframes cart-spin { to { transform: rotate(360deg); } }

.cart-panel {
  position: fixed;
  inset: 0;
  z-index: 1120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--modal-backdrop);
  backdrop-filter: blur(4px);

  &__content {
    position: relative;
    width: min(92vw, 680px);
    height: min(85vh,960px);
    background: var(--surface-primary);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border-secondary);
    box-shadow: var(--modal-shadow);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 22px;
    border-bottom: 1px solid var(--border-secondary);

    h2 {
      font-size: 1.12rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    p {
      margin: 5px 0 0;
      color: var(--text-secondary);
      font-size: 0.84rem;
      line-height: 1.45;
    }
  }

  &__close {
    background: none;
    border: 1px solid transparent;
    border-radius: 999px;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    &:hover {
      border-color: var(--border-secondary);
      background: var(--surface-secondary);
      color: var(--text-primary);
    }
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 22px 10px;
  }

  &__search-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  &__search-spinner {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--interactive-primary);
    animation: cart-spin 0.8s linear infinite;
  }

  &__input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    font-size: 0.9rem;
    background: var(--surface-secondary);
    color: var(--text-primary);
    outline: none;
    &:focus { border-color: var(--interactive-primary); }
  }

  &__subjects {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 22px 14px;
  }

  &__subjects-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__subject-btn {
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: transparent;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--text-secondary);
    &.active,
    &:hover {
      background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--interactive-primary) 30%, transparent);
      color: var(--interactive-active);
    }
  }

  &__results {
    flex: 1;
    overflow-y: auto;
    padding: 0 22px;
    min-height: 0;
  }

  &__loading,
  &__empty {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--text-secondary);
    padding: 44px 24px;
    box-sizing: border-box;
  }

  &__empty-title {
    color: var(--text-primary);
    font-weight: 700;
  }

  &__empty p {
    max-width: 360px;
    margin: 8px auto 0;
    font-size: 0.86rem;
    line-height: 1.6;
  }

  &__error {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--semantic-error);
    padding: 2rem;
    box-sizing: border-box;
  }

  &__result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-secondary);
    &:last-child { border-bottom: none; }
  }

  &__result-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  &__result-main {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  &__result-code { font-size: 0.75rem; color: var(--text-secondary); flex-shrink: 0; }
  &__result-credits {
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  &__result-title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &__result-actions { flex-shrink: 0; margin-left: 0.5rem; display: inline-flex; align-items: center; }

  &__status-slot {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &__status-icon { width: 22px; height: 22px; flex-shrink: 0; }
  &__status-icon--loading { color: var(--interactive-primary); animation: cart-spin 0.8s linear infinite; }
  &__status-icon--success { color: var(--semantic-success); }
  &__status-icon--fail { color: var(--semantic-error); }

  &__status-fail {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 200px;
  }

  &__status-fail-text {
    font-size: 0.74rem;
    color: var(--semantic-error);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__add-btn, &__remove-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
    padding: 0;
    box-sizing: border-box;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    font-size: 22px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    transition: background 0.15s, color 0.15s;
    &:hover:not(:disabled) {
      background: color-mix(in srgb, currentColor 10%, transparent);
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
  &__add-btn { color: var(--interactive-primary); }
  &__remove-btn { color: var(--semantic-error); }

  &__pagination {
    flex: 1;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    font-size: 0.85rem; color: var(--text-secondary);
    button {
      width: 32px;
      height: 32px;
      min-width: 0;
      min-height: 0;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: color 0.15s;
      &:hover:not(:disabled) { color: var(--interactive-active); }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
  }

  &__pagination-icon { font-size: 22px; line-height: 1; }

  &__footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 22px;
    border-top: 1px solid var(--border-secondary);
  }

  &__drawer-btn {
    flex-shrink: 0;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid var(--border-primary);
    border-radius: 999px;
    background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--interactive-active-text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    &:hover {
      border-color: var(--interactive-primary);
      background: color-mix(in srgb, var(--interactive-primary) 14%, var(--surface-primary));
    }
  }

  &__drawer-btn-icon { width: 18px; height: 18px; }

  &__drawer-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: var(--drawer-backdrop);
  }

  &__drawer-card {
    width: min(92%, 560px);
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    max-height: calc(100% - 32px);
    background: var(--surface-primary);
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    box-shadow: 0 -8px 24px color-mix(in srgb, var(--interactive-primary) 12%, transparent);
    overflow: hidden;
  }

  &__drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-secondary);

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }
  }

  &__drawer-close {
    width: 30px;
    height: 30px;
    min-height: 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    color: var(--text-secondary);
    cursor: pointer;
    &:hover {
      background: color-mix(in srgb, var(--semantic-error) 10%, transparent);
      color: var(--semantic-error);
    }
  }

  &__drawer-list {
    overflow-y: auto;
    max-height: calc(60vh - 120px);
  }

  &__drawer-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 18px;
    border-bottom: 1px solid var(--border-secondary);
    transition: background 0.15s;
    &:last-child { border-bottom: none; }
    &:hover {
      background: color-mix(in srgb, var(--interactive-primary) 5%, var(--surface-primary));
    }
  }

  &__drawer-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  &__drawer-meta { display: flex; align-items: center; gap: 4px; }
  &__drawer-code { font-size: 0.74rem; color: var(--text-secondary); flex-shrink: 0; }
  &__drawer-credits { font-size: 0.74rem; font-weight: 700; flex-shrink: 0; }
  &__drawer-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__drawer-remove {
    width: 32px;
    height: 32px;
    min-height: 0;
    padding: 0;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    color: var(--semantic-error);
    cursor: pointer;
    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--semantic-error) 12%, transparent);
    }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  &__drawer-remove-spinner { animation: cart-spin 0.8s linear infinite; }

  &__drawer-empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem 1rem;
    font-size: 0.85rem;
  }

  &__drawer-footer {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid var(--border-secondary);
  }

  &__drawer-total-label { font-size: 0.82rem; color: var(--text-secondary); }
  &__drawer-total-value { font-size: 1rem; color: var(--interactive-active-text); }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 680px) {
  .cart-panel {
    align-items: stretch;
    justify-content: flex-end;

    &__content {
      width: 100%;
      height: min(88vh, 640px);
      border-radius: 16px 16px 0 0;
    }

    &__header,
    &__search,
    &__subjects,
    &__results,
    &__footer,
    &__drawer-card {
      padding-left: 0;
      padding-right: 0;
    }
  }
}
</style>
