<!-- front-end/components/scheduler/SchedulerCartPanel.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse, SchedulerSubject, SearchResult, SearchResponse } from '~/utils/scheduler'

const props = defineProps<{
  semesterId: string
  courseList: CartCourse[]
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', code: string): void
  (e: 'remove', code: string): void
}>()

const { t } = useI18n()
const { getSubjects, searchCourses } = useScheduler()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const subjectFilters = ref<SchedulerSubject[]>([])
const totalResults = ref(0)
const currentPage = ref(1)
const pageSize = 8
const searching = ref(false)
const addingCodes = ref<Set<string>>(new Set())
const removingCodes = ref<Set<string>>(new Set())
const showCartDrawer = ref(false)
const errorMessage = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => [props.visible, props.semesterId] as const,
  ([visible]) => {
    if (visible) loadSubjectFilters()
  },
  { immediate: true },
)

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => doSearch(1), 300)
})

async function loadSubjectFilters() {
  try {
    subjectFilters.value = await getSubjects(props.semesterId)
  } catch {
    subjectFilters.value = []
  }
}

async function doSearch(page: number) {
  errorMessage.value = ''
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    totalResults.value = 0
    return
  }
  searching.value = true
  currentPage.value = page
  try {
    const result: SearchResponse = await searchCourses(searchQuery.value, props.semesterId, page, pageSize)
    searchResults.value = result.items
    totalResults.value = result.total
  } catch {
    searchResults.value = []
    totalResults.value = 0
    errorMessage.value = t('scheduler.searchFailed')
  } finally {
    searching.value = false
  }
}

function inCart(code: string): boolean {
  return props.courseList.some(c => c.course_code === code)
}

async function handleAdd(code: string) {
  addingCodes.value.add(code)
  try {
    emit('add', code)
  } finally {
    addingCodes.value.delete(code)
  }
}

async function handleRemove(code: string) {
  removingCodes.value.add(code)
  try {
    emit('remove', code)
  } finally {
    removingCodes.value.delete(code)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="cart-panel" @click.self="emit('close')">
        <div class="cart-panel__content">
          <div class="cart-panel__header">
            <div>
              <h2>{{ t('scheduler.cart') }}</h2>
              <p>{{ t('scheduler.cartSubtitle') }}</p>
            </div>
            <button class="cart-panel__close" type="button" :aria-label="t('scheduler.close')" @click="emit('close')">&times;</button>
          </div>

          <div class="cart-panel__search">
            <input v-model="searchQuery" type="text" :placeholder="t('scheduler.searchPlaceholder')" class="cart-panel__input" />
          </div>

          <div class="cart-panel__subjects">
            <button
              v-for="item in subjectFilters"
              :key="item.subject"
              type="button"
              class="cart-panel__subject-btn"
              :class="{ active: searchQuery === item.subject }"
              @click="searchQuery = item.subject"
            >{{ item.subject }}</button>
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
                    <span class="cart-panel__result-credits">{{ t('scheduler.creditsShort', { count: item.credit }) }}</span>
                  </div>
                  <span class="cart-panel__result-title">{{ item.course_title }}</span>
                </div>
                <div class="cart-panel__result-actions">
                  <button v-if="!inCart(item.course_code)" type="button" class="cart-panel__add-btn" :disabled="addingCodes.has(item.course_code)" @click="handleAdd(item.course_code)">+</button>
                  <button v-else type="button" class="cart-panel__remove-btn" :disabled="removingCodes.has(item.course_code)" @click="handleRemove(item.course_code)">&#x2212;</button>
                </div>
              </div>
            </div>

            <div v-if="totalResults > pageSize" class="cart-panel__pagination">
              <button type="button" :disabled="currentPage <= 1" @click="doSearch(1)">&#171;</button>
              <button type="button" :disabled="currentPage <= 1" @click="doSearch(currentPage - 1)">&#8249;</button>
              <span>{{ currentPage }} / {{ Math.ceil(totalResults / pageSize) }}</span>
              <button type="button" :disabled="currentPage >= Math.ceil(totalResults / pageSize)" @click="doSearch(currentPage + 1)">&#8250;</button>
              <button type="button" :disabled="currentPage >= Math.ceil(totalResults / pageSize)" @click="doSearch(Math.ceil(totalResults / pageSize))">&#187;</button>
            </div>
          </div>

          <div class="cart-panel__footer">
            <button type="button" class="cart-panel__drawer-btn" @click="showCartDrawer = !showCartDrawer">{{ t('scheduler.cart') }} ({{ courseList.length }})</button>
          </div>

          <div v-if="showCartDrawer" class="cart-panel__drawer">
            <div v-for="course in courseList" :key="course.course_code" class="cart-panel__drawer-item">
              <span>{{ course.course_code }} - {{ course.course_title }}</span>
              <button type="button" @click="handleRemove(course.course_code)">{{ t('scheduler.remove') }}</button>
            </div>
            <div v-if="courseList.length === 0" class="cart-panel__drawer-empty">{{ t('scheduler.emptyCart') }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
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
    width: min(92vw, 680px);
    max-height: 85vh;
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

  &__search { padding: 14px 22px 10px; }

  &__input {
    width: 100%;
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
    gap: 8px;
    padding: 0 22px 14px;
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
    min-height: 260px;
  }

  &__loading,
  &__empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 44px 24px;
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

  &__error { text-align: center; color: var(--semantic-error); padding: 2rem; }

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
    gap: 8px;
    min-width: 0;
  }

  &__result-code { font-weight: 700; font-size: 0.88rem; color: var(--text-primary); flex-shrink: 0; }
  &__result-credits {
    padding: 2px 7px;
    border-radius: 999px;
    background: var(--surface-secondary);
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  &__result-title { font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &__result-actions { flex-shrink: 0; margin-left: 0.5rem; }

  &__add-btn, &__remove-btn {
    inline-size: 40px;
    block-size: 40px;
    min-inline-size: 40px;
    min-block-size: 40px;
    aspect-ratio: 1;
    box-sizing: border-box;
    padding: 0;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex: 0 0 auto;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
  &__add-btn { background: var(--semantic-success); }
  &__remove-btn { background: var(--semantic-error); }

  &__pagination {
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 12px; font-size: 0.85rem; color: var(--text-secondary);
    button {
      min-width: 32px;
      min-height: 32px;
      border: 1px solid var(--border-secondary);
      border-radius: 8px;
      background: var(--surface-primary); cursor: pointer; color: var(--text-primary);
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
  }

  &__footer { padding: 14px 22px; border-top: 1px solid var(--border-secondary); }

  &__drawer-btn {
    width: 100%;
    min-height: 42px;
    padding: 0 14px;
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    background: var(--surface-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  &__drawer {
    max-height: 200px; overflow-y: auto; border-top: 1px solid var(--border-secondary); padding: 10px 22px;
  }

  &__drawer-item {
    display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0;
    font-size: 0.8rem; color: var(--text-primary);
    button { background: none; border: none; color: var(--semantic-error); cursor: pointer; font-size: 0.75rem; }
  }

  &__drawer-empty { text-align: center; color: var(--text-tertiary); padding: 1rem; font-size: 0.8rem; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 680px) {
  .cart-panel {
    align-items: stretch;
    justify-content: flex-end;

    &__content {
      width: 100%;
      max-height: 88vh;
      border-radius: 16px 16px 0 0;
    }

    &__header,
    &__search,
    &__subjects,
    &__results,
    &__footer,
    &__drawer {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
}
</style>
