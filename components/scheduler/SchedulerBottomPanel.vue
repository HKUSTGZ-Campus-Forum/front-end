<!-- front-end/components/scheduler/SchedulerBottomPanel.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { clampSchedulerPlanIndex } from '~/utils/schedulerPlanNavigation'

const props = defineProps<{
  currentIndex: number
  totalPlans: number
}>()

const emit = defineEmits<{
  (e: 'update:index', value: number): void
}>()

const { t } = useI18n()

const displayedIndex = computed(() => clampSchedulerPlanIndex(props.currentIndex, props.totalPlans))
const editableIndex = ref(String(displayedIndex.value))
const isEditingIndex = ref(false)

function restoreEditableIndex() {
  editableIndex.value = String(displayedIndex.value)
}

function onIndexInput(event: Event) {
  editableIndex.value = (event.target as HTMLInputElement).value
}

function onIndexFocus(event: FocusEvent) {
  isEditingIndex.value = true
  restoreEditableIndex()
  const input = event.target as HTMLInputElement
  input.select()
}

function commitIndexEdit() {
  const nextIndex = clampSchedulerPlanIndex(
    editableIndex.value,
    props.totalPlans,
    displayedIndex.value,
  )
  isEditingIndex.value = false
  editableIndex.value = String(nextIndex)
  if (nextIndex !== displayedIndex.value) emit('update:index', nextIndex)
}

function cancelIndexEdit() {
  isEditingIndex.value = false
  restoreEditableIndex()
}

watch(
  () => [props.currentIndex, props.totalPlans],
  () => {
    if (!isEditingIndex.value || props.totalPlans <= 0) restoreEditableIndex()
  },
  { flush: 'sync' },
)

const sliderPercent = computed(() => {
  if (props.totalPlans <= 1) return 0
  return ((displayedIndex.value - 1) / (props.totalPlans - 1)) * 100
})

function goToStart() { if (props.totalPlans > 0) emit('update:index', 1) }
function goToEnd() { if (props.totalPlans > 0) emit('update:index', props.totalPlans) }
function goPrev() { if (props.totalPlans > 0) emit('update:index', Math.max(1, displayedIndex.value - 1)) }
function goNext() { if (props.totalPlans > 0) emit('update:index', Math.min(props.totalPlans, displayedIndex.value + 1)) }

function onSliderKeyDown(event: KeyboardEvent) {
  if (props.totalPlans <= 0) return

  let action: (() => void) | undefined
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') action = goPrev
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') action = goNext
  if (event.key === 'Home') action = goToStart
  if (event.key === 'End') action = goToEnd
  if (action === undefined) return

  event.preventDefault()
  action()
}

// Pointer capture keeps mouse, pen, and touch dragging on one code path even
// when the pointer leaves the track.
const sliderRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

function updateFromClientX(clientX: number) {
  if (props.totalPlans <= 0 || !sliderRef.value) return
  const rect = sliderRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const newIndex = Math.round(ratio * (props.totalPlans - 1)) + 1
  if (newIndex !== displayedIndex.value) emit('update:index', newIndex)
}

function onSliderPointerDown(event: PointerEvent) {
  if (props.totalPlans <= 0) return
  event.preventDefault()
  isDragging.value = true
  sliderRef.value?.setPointerCapture(event.pointerId)
  updateFromClientX(event.clientX)
}

function onSliderPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  event.preventDefault()
  updateFromClientX(event.clientX)
}

function onSliderPointerEnd(event: PointerEvent) {
  if (sliderRef.value?.hasPointerCapture(event.pointerId)) {
    sliderRef.value.releasePointerCapture(event.pointerId)
  }
  isDragging.value = false
}
</script>

<template>
  <div class="bottom-panel">
    <div class="bottom-panel__controls">
      <button
        type="button"
        :aria-label="t('scheduler.firstPlan')"
        :disabled="totalPlans <= 0 || displayedIndex <= 1"
        @click="goToStart"
      >
        <Icon name="lucide:chevrons-left" class="bottom-panel__icon" />
      </button>
      <button
        type="button"
        :aria-label="t('scheduler.previousPlan')"
        :disabled="totalPlans <= 0 || displayedIndex <= 1"
        @click="goPrev"
      >
        <Icon name="lucide:chevron-left" class="bottom-panel__icon" />
      </button>

      <span class="bottom-panel__counter">
        <input
          data-testid="scheduler-plan-index-input"
          class="bottom-panel__counter-current"
          type="number"
          inputmode="numeric"
          step="1"
          :min="totalPlans > 0 ? 1 : 0"
          :max="Math.max(0, totalPlans)"
          :value="editableIndex"
          :disabled="totalPlans <= 0"
          :aria-label="t('scheduler.plan')"
          @input="onIndexInput"
          @focus="onIndexFocus"
          @blur="commitIndexEdit"
          @keydown.enter.prevent="commitIndexEdit"
          @keydown.esc.prevent="cancelIndexEdit"
        >
        <span class="bottom-panel__counter-total">/ {{ totalPlans }}</span>
      </span>

      <button
        type="button"
        :aria-label="t('scheduler.nextPlan')"
        :disabled="totalPlans <= 0 || displayedIndex >= totalPlans"
        @click="goNext"
      >
        <Icon name="lucide:chevron-right" class="bottom-panel__icon" />
      </button>
      <button
        type="button"
        :aria-label="t('scheduler.lastPlan')"
        :disabled="totalPlans <= 0 || displayedIndex >= totalPlans"
        @click="goToEnd"
      >
        <Icon name="lucide:chevrons-right" class="bottom-panel__icon" />
      </button>
    </div>

    <div
      ref="sliderRef"
      class="bottom-panel__slider"
      :class="{ 'bottom-panel__slider--disabled': totalPlans <= 0 }"
      role="slider"
      :tabindex="totalPlans > 0 ? 0 : -1"
      :aria-label="t('scheduler.plan')"
      :aria-valuemin="totalPlans > 0 ? 1 : 0"
      :aria-valuemax="Math.max(0, totalPlans)"
      :aria-valuenow="displayedIndex"
      :aria-disabled="totalPlans <= 0"
      @keydown="onSliderKeyDown"
      @pointerdown="onSliderPointerDown"
      @pointermove="onSliderPointerMove"
      @pointerup="onSliderPointerEnd"
      @pointercancel="onSliderPointerEnd"
    >
      <div class="bottom-panel__track">
        <div class="bottom-panel__progress" :style="{ width: `${sliderPercent}%` }" />
        <div
          class="bottom-panel__thumb"
          :class="{ 'bottom-panel__thumb--dragging': isDragging }"
          :style="{ left: `${sliderPercent}%` }"
        >
          <div v-if="isDragging" class="bottom-panel__tooltip">{{ displayedIndex }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bottom-panel {
  min-height: 86px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.6rem;
  padding: 10px 4px 14px;

  &__controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--timetable-grid);

    button {
      width: 40px;
      height: 40px;
      min-height: 0;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: color 0.15s;

      &:hover {
        color: var(--interactive-active);
      }

      &:disabled {
        color: var(--text-secondary);
        cursor: not-allowed;
        opacity: 0.55;
      }
    }
  }

  &__icon {
    flex-shrink: 0;
    font-size: 26px; // all four navigation icons the same size
    line-height: 1;
  }

  &__counter {
    display: flex;
    align-items: baseline;
    justify-content: center;
    min-width: 96px;
    margin: 0 6px;
    user-select: none;

    &-current {
      width: 58px;
      min-width: 0;
      padding: 3px 6px;
      border: 1px solid var(--border-secondary);
      border-radius: 8px;
      background: var(--surface-primary);
      color: var(--text-primary);
      font-size: 1.7rem;
      font-weight: 700;
      line-height: 1;
      text-align: center;
      appearance: textfield;

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        margin: 0;
        appearance: none;
      }

      &:focus-visible {
        border-color: var(--interactive-active);
        outline: 2px solid var(--interactive-active);
        outline-offset: 2px;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    &-total {
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 500;
      padding-left: 5px;
    }
  }

  &__slider {
    width: 100%;
    height: 24px;
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 0 12px;
    touch-action: none;

    &:focus-visible {
      border-radius: 999px;
      outline: 2px solid var(--interactive-active);
      outline-offset: 2px;
    }

    &--disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  }

  &__track {
    width: 100%;
    height: 6px;
    background: var(--timetable-grid);
    border-radius: 999px;
    position: relative;
  }

  &__progress {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: var(--btn-primary-bg);
    border-radius: 999px;
  }

  &__thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--btn-primary-bg);
    /* thumb 阴影刻意保留：尺寸/透明度为小圆形滑块定制，
       token 阴影系列（--shadow-*）无法表达，色相与交互色一致 */
    box-shadow: 0 2px 6px rgba(38, 164, 255, 0.35);
    transition: left 0.18s cubic-bezier(0.34, 1.2, 0.64, 1), transform 0.15s ease, box-shadow 0.15s ease;

    &--dragging {
      left: auto;
      transform: translate(-50%, -50%) scale(1.25);
      box-shadow: 0 4px 10px rgba(38, 164, 255, 0.45);
      transition: left 0.04s linear, transform 0.15s ease, box-shadow 0.15s ease;
    }
  }

  &__tooltip {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 26px;
    padding: 3px 7px;
    border-radius: 6px;
    background: var(--btn-primary-bg);
    color: var(--text-on-interactive);
    font-size: 0.78rem;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
  }
}

@media (max-width: 520px) {
  .bottom-panel {
    min-height: 80px;
    padding: 8px 2px 12px;

    &__controls {
      gap: 8px;

      button {
        width: 44px;
        height: 44px;
      }
    }

    &__counter {
      min-width: 76px;
      margin: 0 2px;
    }
  }
}
</style>
