<!-- front-end/components/scheduler/SchedulerSidePanel.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse, SchedulerPopularityByCourse } from '~/utils/scheduler'
import { getSchedulerCoursePopularity } from '~/utils/scheduler'

type DisplayOption = 'name' | 'section' | 'location' | 'instructor' | 'duration'

const props = defineProps<{
  courseList: CartCourse[]
  currentPlan: { courseIndex: number; bundleId: number; layer: number }[]
  displayOptions: Record<DisplayOption, boolean>
  popularityByCourse: SchedulerPopularityByCourse
  showPopularity: boolean
  semesterId: string
  filterMode: boolean
  mutationsDisabled: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-course', code: string, currentEnabled: boolean): void
  (e: 'toggle-bundle', code: string, bundleId: number, layer: number, currentEnabled: boolean): void
  (e: 'toggle-layer', code: string, layer: number, enabled: boolean): void
  (e: 'open-cart'): void
  (e: 'toggle-filter'): void
  (e: 'update:display-option', key: DisplayOption, value: boolean): void
}>()

const activeTab = ref<'main' | 'klms'>('main')
const { t } = useI18n()
const displayOptionKeys: DisplayOption[] = ['name', 'section', 'location', 'instructor', 'duration']

// Bottom action bar state (replicates the original planner's compact bottom bar)
const showMenu = ref(false)
const showFilterTip = ref(false)
const menuRef = ref<HTMLElement | null>(null)
let menuLastClose = 0

function closeMenu() {
  showMenu.value = false
  menuLastClose = Date.now()
}

function toggleMenu() {
  // The menu just closed; ignore clicks within 200ms to avoid accidental toggling
  if (Date.now() - menuLastClose < 200 && !showMenu.value) return
  showMenu.value = !showMenu.value
}

function onDocumentMouseDown(event: MouseEvent) {
  if (showMenu.value && menuRef.value && !menuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentMouseDown))
onUnmounted(() => document.removeEventListener('mousedown', onDocumentMouseDown))

const filteredCourses = computed(() => {
  if (activeTab.value === 'klms') return props.courseList.filter(c => c.klms_course)
  return props.courseList.filter(c => !c.klms_course)
})

const currentSelectionMap = computed(() => {
  const map: Record<string, Record<number, number>> = {}
  for (const sel of props.currentPlan) {
    const course = props.courseList[sel.courseIndex]
    if (course) {
      map[course.course_code] ||= {}
      map[course.course_code][sel.layer] = sel.bundleId
    }
  }
  return map
})

const totalCredits = computed(() =>
  props.courseList.filter(c => c.enabled).reduce((sum, c) => sum + c.credit, 0)
)

function updateDisplayOption(key: DisplayOption, event: Event) {
  emit('update:display-option', key, (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="side-panel">
    <div class="side-panel__header">
      <div class="side-panel__tabs">
        <button type="button" :class="{ active: activeTab === 'main' }" @click="activeTab = 'main'">{{ t('scheduler.main') }}</button>
        <button type="button" :class="{ active: activeTab === 'klms' }" @click="activeTab = 'klms'">{{ t('scheduler.klms') }}</button>
      </div>
      <div class="side-panel__credits">{{ t('scheduler.credits', { count: totalCredits }) }}</div>
    </div>

    <div class="side-panel__list">
      <SchedulerCourseCard
        v-for="course in filteredCourses"
        :key="course.course_code"
        :course="course"
        :semester-id="semesterId"
        :current-selection="currentSelectionMap[course.course_code]"
        :popularity="getSchedulerCoursePopularity(popularityByCourse, course.course_code)"
        :show-popularity="showPopularity"
        :mutations-disabled="mutationsDisabled"
        @toggle-course="(...args) => emit('toggle-course', ...args)"
        @toggle-bundle="(...args) => emit('toggle-bundle', ...args)"
        @toggle-layer="(...args) => emit('toggle-layer', ...args)"
      />
      <div v-if="filteredCourses.length === 0" class="side-panel__empty">
        <div class="side-panel__empty-title">{{ t('scheduler.emptyCart') }}</div>
        <p>{{ t('scheduler.emptyCartDescription') }}</p>
        <button type="button" class="side-panel__empty-btn" :disabled="mutationsDisabled" @click="emit('open-cart')">
          {{ t('scheduler.addCourse') }}
        </button>
      </div>
    </div>

    <!-- Compact bottom action bar (Filter / Menu / Cart), leaves the list as the dominant area -->
    <div class="side-panel__actions">
      <div
        class="side-panel__action-wrap"
        @mouseenter="showFilterTip = true"
        @mouseleave="showFilterTip = false"
      >
        <button
          type="button"
          class="side-panel__action"
          :class="{ 'side-panel__action--active': filterMode }"
          :aria-pressed="filterMode"
          @click="emit('toggle-filter')"
        >
          <span class="side-panel__action-icon" aria-hidden="true"><Icon name="lucide:sliders-horizontal" /></span>
          <span class="side-panel__action-label">{{ t('scheduler.filter') }}</span>
        </button>
        <Transition name="tip">
          <div v-if="showFilterTip" class="side-panel__tip" role="tooltip">
            <div class="side-panel__tip-title">
              {{ t('scheduler.filterTipTitle') }}
              <span class="side-panel__tip-state">{{ filterMode ? t('scheduler.filterTipActive') : t('scheduler.filterTipInactive') }}</span>
            </div>
            <p>{{ t('scheduler.filterTipDescription') }}</p>
          </div>
        </Transition>
      </div>

      <button
        type="button"
        class="side-panel__action"
        :class="{ 'side-panel__action--active': showMenu }"
        :aria-expanded="showMenu"
        @click="toggleMenu"
      >
        <span class="side-panel__action-icon" aria-hidden="true"><Icon name="lucide:menu" /></span>
        <span class="side-panel__action-label">{{ t('scheduler.menu') }}</span>
      </button>

      <button
        type="button"
        class="side-panel__action side-panel__action--primary"
        :disabled="mutationsDisabled"
        @click="emit('open-cart')"
      >
        <span class="side-panel__action-icon" aria-hidden="true"><Icon name="lucide:shopping-cart" /></span>
        <span class="side-panel__action-label">{{ t('scheduler.cart') }}</span>
      </button>
    </div>

    <!-- Display options menu -->
    <div ref="menuRef" class="side-panel__menu" :class="{ 'side-panel__menu--open': showMenu }">
      <div class="side-panel__menu-head">
        <span>{{ t('scheduler.display') }}</span>
        <span class="side-panel__menu-count">
          {{ displayOptionKeys.filter((key) => displayOptions[key]).length }}/{{ displayOptionKeys.length }}
        </span>
      </div>
      <label v-for="key in displayOptionKeys" :key="key" class="side-panel__menu-item" :class="{ active: displayOptions[key] }">
        <input
          type="checkbox"
          :checked="displayOptions[key]"
          @change="updateDisplayOption(key, $event)"
        >
        <span>{{ t(`scheduler.display${key.charAt(0).toUpperCase()}${key.slice(1)}`) }}</span>
      </label>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.side-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid var(--border-secondary);
    background: var(--surface-secondary);
  }

  &__tabs {
    display: flex;
    gap: 4px;
    padding: 3px;
    border: 1px solid var(--border-secondary);
    border-radius: 11px;
    background: var(--surface-primary);

    button {
      min-height: 34px;
      padding: 0 12px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      transition: background 0.16s ease, color 0.16s ease;

      &.active {
        background: var(--scheduler-tab-active-bg);
        color: var(--scheduler-tab-active-text);
      }

      &:not(.active):hover {
        background: color-mix(in srgb, var(--surface-secondary) 70%, transparent);
      }
    }
  }

  &__credits {
    flex-shrink: 0;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    background: var(--surface-secondary);
  }

  &__menu {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 64px;
    z-index: 30;
    padding: 8px;
    border: 1px solid var(--border-secondary);
    border-radius: 14px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-medium);
    opacity: 0;
    visibility: hidden;
    transform: translateY(8px);
    transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;

    &--open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }

  &__menu-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px 8px;
    color: var(--text-primary);
    font-size: 0.82rem;
    font-weight: 700;
  }

  &__menu-count {
    color: var(--text-tertiary);
    font-size: 0.74rem;
    font-weight: 700;
  }

  &__menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 8px;
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }

    &.active {
      color: var(--interactive-active-text);
    }

    input {
      accent-color: var(--interactive-primary);
    }
  }

  &__tip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    z-index: 30;
    width: 244px;
    padding: 10px 12px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-medium);
    color: var(--text-secondary);
    font-size: 0.76rem;
    line-height: 1.5;
    pointer-events: none;
  }

  &__tip-title {
    margin-bottom: 4px;
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 700;
  }

  &__tip-state {
    color: var(--interactive-active-text);
    font-weight: 700;
  }

  &__empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 38px 18px;
    border: 1px dashed var(--border-primary);
    border-radius: 14px;
    background: var(--surface-primary);
    font-size: 0.86rem;

    p {
      max-width: 240px;
      margin: 8px auto 0;
      line-height: 1.55;
    }
  }

  &__empty-title {
    color: var(--text-primary);
    font-size: 0.98rem;
    font-weight: 700;
  }

  &__empty-btn {
    min-height: 36px;
    margin-top: 16px;
    padding: 0 16px;
    border: 0;
    border-radius: 999px;
    background: var(--interactive-primary);
    color: var(--text-inverse);
    cursor: pointer;
    font-size: 0.84rem;
    font-weight: 700;

    &:hover {
      background: var(--interactive-hover);
    }
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 10px 12px 12px;
    border-top: 1px solid var(--border-secondary);
    background: var(--surface-primary);
  }

  &__action-wrap {
    position: relative;
    min-width: 0;
    display: flex;
  }

  &__action {
    flex: 1;
    min-width: 0;
    width: 100%;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 10px;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-primary);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    transition: background 0.15s, border-color 0.15s, color 0.15s;

    &:hover {
      background: var(--surface-secondary);
    }

    &--active {
      border-color: color-mix(in srgb, var(--interactive-primary) 40%, var(--border-secondary));
      background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
      color: var(--interactive-active);
    }

    &--primary {
      border-color: var(--interactive-primary);
      background: var(--interactive-primary);
      color: var(--text-inverse);

      &:hover {
        background: var(--interactive-hover);
        border-color: var(--interactive-hover);
      }
    }
  }

  &__action-icon {
    font-size: 0.95rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &__action-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.tip-enter-active,
.tip-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 1024px) {
  .side-panel {
    min-height: 420px;
    height: auto;

    &__list {
      max-height: 520px;
    }
  }
}

@media (max-width: 520px) {
  .side-panel {
    &__header {
      align-items: stretch;
      flex-direction: column;
    }

    &__credits {
      padding-left: 4px;
    }
  }
}
</style>
