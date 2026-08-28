<!-- front-end/components/scheduler/SchedulerSidePanel.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'
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
  previewSectionEnabled: boolean
  canShowHistory?: boolean
  getHistory?: (
    semester: string,
    courseCode: string,
    options: { sectionId?: string; from: string; to: string; resolution?: 'auto'; signal?: AbortSignal },
  ) => Promise<import('~/utils/scheduler').SchedulerPopularityHistoryResponse>
  candidateMode?: boolean
  candidateCodes?: string[]
  creditsOverride?: number | string
}>()

const emit = defineEmits<{
  (e: 'toggle-course', code: string, currentEnabled: boolean): void
  (e: 'toggle-bundle', code: string, bundleId: number, layer: number, currentEnabled: boolean): void
  (e: 'toggle-layer', code: string, layer: number, enabled: boolean): void
  (e: 'open-cart'): void
  (e: 'toggle-filter'): void
  (e: 'clear-bans'): void
  (e: 'update:display-option', key: DisplayOption, value: boolean): void
  (e: 'preview-bundle', code: string, layer: number, bundleId: number): void
  (e: 'clear-preview'): void
  (e: 'update:preview-section-enabled', value: boolean): void
  (e: 'show-history', code: string): void
}>()

const { t } = useI18n()
const displayOptionKeys: DisplayOption[] = ['name', 'section', 'location', 'instructor', 'duration']

// Bottom action bar state (replicates the original planner's compact bottom bar)
const showMenu = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const filterActionWrapRef = ref<HTMLElement | null>(null)
const filterHovered = ref(false)
const filterFocusWithin = ref(false)
const filterPinned = ref(false)
const filterTipId = `scheduler-filter-tip-${useId()}`
const filterTipTitleId = `${filterTipId}-title`
const showFilterTip = computed(() => filterHovered.value || filterFocusWithin.value || filterPinned.value)
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

function closeFilterTip() {
  filterHovered.value = false
  filterFocusWithin.value = false
  filterPinned.value = false
}

function onFilterActionClick() {
  filterPinned.value = !filterPinned.value
  emit('toggle-filter')
}

function onFilterFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (!next || !filterActionWrapRef.value?.contains(next)) {
    filterFocusWithin.value = false
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (showMenu.value && menuRef.value && !menuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
  if (filterPinned.value && filterActionWrapRef.value && !filterActionWrapRef.value.contains(event.target as Node)) {
    closeFilterTip()
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

const currentSelectionMap = computed(() => {
  const map: Record<string, string[]> = {}
  for (const sel of props.currentPlan) {
    const course = props.courseList[sel.courseIndex]
    if (course) {
      map[course.course_code] ||= []
      map[course.course_code].push(`${sel.layer}:${sel.bundleId}`)
    }
  }
  return map
})

const totalCredits = computed(() =>
  props.creditsOverride
  ?? props.courseList.filter(c => c.enabled).reduce((sum, c) => sum + (c.term_load_credit ?? c.credit), 0)
)

const candidateCodeSet = computed(() => new Set(props.candidateCodes || []))

function updateDisplayOption(key: DisplayOption, event: Event) {
  emit('update:display-option', key, (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="side-panel">
    <div class="side-panel__header">
      <div class="side-panel__title">{{ t('scheduler.selectedCourses') }} · {{ courseList.length }}</div>
      <div class="side-panel__credits">{{ t('scheduler.termLoadCredits', { count: totalCredits }) }}</div>
    </div>

    <div class="side-panel__list">
      <div v-if="candidateMode" class="side-panel__context">
        <strong>{{ t('scheduler.optimizer.candidatePoolTitle') }}</strong>
        <span>{{ t('scheduler.optimizer.candidatePoolHint') }}</span>
      </div>
      <SchedulerCourseCard
        v-for="course in courseList"
        :key="course.course_code"
        :course="course"
        :semester-id="semesterId"
        :current-selection-keys="currentSelectionMap[course.course_code]"
        :popularity="getSchedulerCoursePopularity(popularityByCourse, course.course_code)"
        :show-popularity="showPopularity"
        :mutations-disabled="mutationsDisabled"
        :can-show-history="canShowHistory"
        :get-history="getHistory"
        :selected="candidateMode ? candidateCodeSet.has(course.course_code) : undefined"
        @toggle-course="(...args) => emit('toggle-course', ...args)"
        @toggle-bundle="(...args) => emit('toggle-bundle', ...args)"
        @toggle-layer="(...args) => emit('toggle-layer', ...args)"
        @preview-bundle="(...args) => emit('preview-bundle', ...args)"
        @clear-preview="emit('clear-preview')"
        @show-history="(...args) => emit('show-history', ...args)"
      />
      <div v-if="courseList.length === 0" class="side-panel__empty">
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
        ref="filterActionWrapRef"
        class="side-panel__action-wrap"
        @mouseenter="filterHovered = true"
        @mouseleave="filterHovered = false"
        @focusin="filterFocusWithin = true"
        @focusout="onFilterFocusOut"
        @keydown.esc.stop.prevent="closeFilterTip"
      >
        <button
          type="button"
          class="side-panel__action"
          :class="{ 'side-panel__action--active': filterMode }"
          :aria-pressed="filterMode"
          :aria-expanded="showFilterTip"
          :aria-controls="filterTipId"
          @click="onFilterActionClick"
        >
          <span class="side-panel__action-icon" aria-hidden="true"><Icon name="lucide:sliders-horizontal" /></span>
          <span class="side-panel__action-label">{{ t('scheduler.filter') }}</span>
        </button>
        <Transition name="tip">
          <div
            v-if="showFilterTip"
            :id="filterTipId"
            class="side-panel__tip"
            :class="{ 'side-panel__tip--active': filterMode }"
            role="region"
            :aria-labelledby="filterTipTitleId"
          >
            <div :id="filterTipTitleId" class="side-panel__tip-title">
              {{ t('scheduler.filterTipTitle') }}
              <span
                class="side-panel__tip-state"
                :class="{ 'side-panel__tip-state--inactive': !filterMode }"
              >{{ filterMode ? t('scheduler.filterTipActive') : t('scheduler.filterTipInactive') }}</span>
            </div>
            <p>{{ t('scheduler.filterTipDescription') }}</p>
            <button
              type="button"
              class="side-panel__clear-all"
              :disabled="mutationsDisabled"
              @click="emit('clear-bans')"
            >
              <span class="side-panel__clear-all-icon" aria-hidden="true"><Icon name="lucide:eraser" /></span>
              <span>{{ t('scheduler.clearAll') }}</span>
            </button>
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
      <label
        class="side-panel__menu-item side-panel__menu-item--preview"
        :class="{ active: previewSectionEnabled }"
      >
        <input
          type="checkbox"
          :checked="previewSectionEnabled"
          @change="emit('update:preview-section-enabled', $event.target.checked)"
        >
        <span>{{ t('scheduler.previewSectionTimeSlots') }}</span>
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

  &__title {
    min-width: 0;
    font-size: 0.84rem;
    font-weight: 750;
    color: var(--text-primary);
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

  &__context {
    display: grid;
    gap: 3px;
    margin-bottom: 10px;
    padding: 10px 11px;
    border: 1px solid color-mix(in srgb, var(--interactive-primary) 24%, var(--border-secondary));
    border-radius: 11px;
    background: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-primary));

    strong {
      color: var(--text-primary);
      font-size: 0.9rem;
      line-height: 1.35;
    }

    span {
      color: var(--text-secondary);
      font-size: 0.78rem;
      line-height: 1.45;
    }
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
    color: var(--text-muted);
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

    // The preview toggle is its own setting, visually separated from the grid
    // of fine-grained display toggles above it.
    &--preview {
      margin-top: 6px;
      padding-top: 8px;
      border-top: 1px solid var(--border-secondary);
    }
  }

  &__tip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    z-index: 30;
    width: 244px;
    padding: 10px 12px;
    border: 2px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-medium);
    color: var(--text-secondary);
    font-size: 0.76rem;
    line-height: 1.5;
    // The tooltip hosts an interactive clear-all button, so the card itself
    // must capture pointer events; it floats in empty panel space above the
    // button, so hovering it never blocks an unrelated control.
    pointer-events: auto;

    &--active {
      border-color: var(--interactive-primary);
    }
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

    &--inactive {
      color: var(--text-secondary);
    }
  }

  &__clear-all {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    padding: 5px 10px;
    min-height: 0;
    border: 1px solid var(--border-secondary);
    border-radius: 8px;
    background: var(--surface-secondary);
    color: var(--interactive-active-text);
    font-size: 0.76rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;

    &:hover:not(:disabled) {
      background: var(--interactive-primary);
      border-color: var(--interactive-primary);
      // White on the solid blue interactive background in both themes.
      color: var(--text-on-interactive);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &-icon {
      display: inline-flex;
      line-height: 1;
      font-size: 14px;
    }
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
    background: var(--btn-primary-bg);
    color: var(--text-on-interactive);
    cursor: pointer;
    font-size: 0.84rem;
    font-weight: 700;

    &:hover {
      background: var(--btn-primary-bg-hover);
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

    // Transparent hover bridge across the 8px gap between the button and its
    // tooltip so moving the pointer up to the tooltip's clear-all button does
    // not leave the wrap (which would otherwise close the tip before the click).
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: -8px;
      height: 8px;
    }
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
      background: var(--btn-primary-bg);
      color: var(--text-on-interactive);

      &:hover {
        background: var(--btn-primary-bg-hover);
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

    &__tip {
      // Span the three compact action columns without being clipped by the
      // narrow mobile side panel.
      width: calc(300% + 1rem);
      max-width: calc(100vw - 32px);
    }
  }
}
</style>
