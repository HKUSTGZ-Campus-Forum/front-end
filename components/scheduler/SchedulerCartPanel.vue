<!-- front-end/components/scheduler/SchedulerCartPanel.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CartCourse, SearchResult, SearchResponse } from '~/utils/scheduler'
import { FREQUENT_SUBJECTS } from '~/utils/scheduler'

const props = defineProps<{
  semesterId: string
  courseList: CartCourse[]
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', code: string): void
  (e: 'remove', code: string): void
  (e: 'refresh'): void
}>()

const { searchCourses } = useScheduler()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const totalResults = ref(0)
const currentPage = ref(1)
const pageSize = 8
const searching = ref(false)
const addingCodes = ref<Set<string>>(new Set())
const removingCodes = ref<Set<string>>(new Set())
const showCartDrawer = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => doSearch(1), 300)
})

async function doSearch(page: number) {
  if (!searchQuery.value.trim()) return
  searching.value = true
  currentPage.value = page
  try {
    const result: SearchResponse = await searchCourses(searchQuery.value, props.semesterId, page, pageSize)
    searchResults.value = result.items
    totalResults.value = result.total
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
    await emit('add', code)
    await emit('refresh')
  } finally {
    addingCodes.value.delete(code)
  }
}

async function handleRemove(code: string) {
  removingCodes.value.add(code)
  try {
    await emit('remove', code)
    await emit('refresh')
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
            <h2>Course Cart</h2>
            <button class="cart-panel__close" @click="emit('close')">&times;</button>
          </div>

          <div class="cart-panel__search">
            <input v-model="searchQuery" type="text" placeholder="Search by code or title..." class="cart-panel__input" />
          </div>

          <div class="cart-panel__subjects">
            <button
              v-for="subj in FREQUENT_SUBJECTS"
              :key="subj"
              class="cart-panel__subject-btn"
              :class="{ active: searchQuery === subj }"
              @click="searchQuery = subj"
            >{{ subj }}</button>
          </div>

          <div class="cart-panel__results">
            <div v-if="searching" class="cart-panel__loading">Searching...</div>
            <div v-else-if="searchResults.length === 0 && searchQuery" class="cart-panel__empty">No courses found</div>
            <div v-else>
              <div v-for="item in searchResults" :key="item.course_code" class="cart-panel__result">
                <div class="cart-panel__result-info">
                  <span class="cart-panel__result-code">{{ item.course_code }}</span>
                  <span class="cart-panel__result-credits">{{ item.credit }} cr</span>
                  <span class="cart-panel__result-title">{{ item.course_title }}</span>
                </div>
                <div class="cart-panel__result-actions">
                  <button v-if="!inCart(item.course_code)" class="cart-panel__add-btn" :disabled="addingCodes.has(item.course_code)" @click="handleAdd(item.course_code)">+</button>
                  <button v-else class="cart-panel__remove-btn" :disabled="removingCodes.has(item.course_code)" @click="handleRemove(item.course_code)">&#x2212;</button>
                </div>
              </div>
            </div>

            <div v-if="totalResults > pageSize" class="cart-panel__pagination">
              <button :disabled="currentPage <= 1" @click="doSearch(1)">&#171;</button>
              <button :disabled="currentPage <= 1" @click="doSearch(currentPage - 1)">&#8249;</button>
              <span>{{ currentPage }} / {{ Math.ceil(totalResults / pageSize) }}</span>
              <button :disabled="currentPage >= Math.ceil(totalResults / pageSize)" @click="doSearch(currentPage + 1)">&#8250;</button>
              <button :disabled="currentPage >= Math.ceil(totalResults / pageSize)" @click="doSearch(Math.ceil(totalResults / pageSize))">&#187;</button>
            </div>
          </div>

          <div class="cart-panel__footer">
            <button class="cart-panel__drawer-btn" @click="showCartDrawer = !showCartDrawer">Cart ({{ courseList.length }})</button>
          </div>

          <div v-if="showCartDrawer" class="cart-panel__drawer">
            <div v-for="course in courseList" :key="course.course_code" class="cart-panel__drawer-item">
              <span>{{ course.course_code }} - {{ course.course_title }}</span>
              <button @click="handleRemove(course.course_code)">Remove</button>
            </div>
            <div v-if="courseList.length === 0" class="cart-panel__drawer-empty">Cart is empty</div>
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
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);

  &__content {
    width: 90vw;
    max-width: 640px;
    max-height: 85vh;
    background: var(--surface-primary);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-primary);
    h2 { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  }

  &__close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    &:hover { color: var(--text-primary); }
  }

  &__search { padding: 0.75rem 1.25rem; }

  &__input {
    width: 100%;
    padding: 0.6rem 1rem;
    border: 1px solid var(--border-primary);
    border-radius: 10px;
    font-size: 0.9rem;
    background: var(--surface-secondary);
    color: var(--text-primary);
    outline: none;
    &:focus { border-color: #2563eb; }
  }

  &__subjects {
    display: flex;
    gap: 0.4rem;
    padding: 0 1.25rem 0.75rem;
    flex-wrap: wrap;
  }

  &__subject-btn {
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: transparent;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--text-secondary);
    &.active, &:hover { background: rgba(38, 164, 255, 0.1); border-color: rgba(38, 164, 255, 0.3); color: #2563eb; }
  }

  &__results {
    flex: 1;
    overflow-y: auto;
    padding: 0 1.25rem;
    min-height: 200px;
  }

  &__loading, &__empty { text-align: center; color: var(--text-tertiary); padding: 2rem; }

  &__result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border-primary);
    &:last-child { border-bottom: none; }
  }

  &__result-info { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
  &__result-code { font-weight: 600; font-size: 0.85rem; color: var(--text-primary); flex-shrink: 0; }
  &__result-credits { font-size: 0.75rem; color: var(--text-tertiary); flex-shrink: 0; }
  &__result-title { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &__result-actions { flex-shrink: 0; margin-left: 0.5rem; }

  &__add-btn, &__remove-btn {
    width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer;
    font-size: 1.1rem; display: flex; align-items: center; justify-content: center; color: white;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
  &__add-btn { background: #22c55e; &:hover { background: #16a34a; } }
  &__remove-btn { background: #ef4444; &:hover { background: #dc2626; } }

  &__pagination {
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.75rem; font-size: 0.85rem; color: var(--text-secondary);
    button {
      padding: 0.25rem 0.5rem; border: 1px solid var(--border-primary); border-radius: 4px;
      background: var(--surface-primary); cursor: pointer; color: var(--text-primary);
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
  }

  &__footer { padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-primary); }

  &__drawer-btn {
    width: 100%; padding: 0.5rem; border: 1px solid var(--border-primary); border-radius: 8px;
    background: var(--surface-secondary); cursor: pointer; font-size: 0.85rem; color: var(--text-primary);
  }

  &__drawer {
    max-height: 200px; overflow-y: auto; border-top: 1px solid var(--border-primary); padding: 0.5rem 1.25rem;
  }

  &__drawer-item {
    display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0;
    font-size: 0.8rem; color: var(--text-primary);
    button { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.75rem; }
  }

  &__drawer-empty { text-align: center; color: var(--text-tertiary); padding: 1rem; font-size: 0.8rem; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
