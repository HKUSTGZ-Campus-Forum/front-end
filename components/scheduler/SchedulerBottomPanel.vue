<!-- front-end/components/scheduler/SchedulerBottomPanel.vue -->
<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  currentIndex: number
  totalPlans: number
}>()

const emit = defineEmits<{
  (e: 'update:index', value: number): void
}>()

const { t } = useI18n()

const sliderPercent = computed(() => {
  if (props.totalPlans <= 1) return 0
  return ((props.currentIndex - 1) / (props.totalPlans - 1)) * 100
})

function goToStart() { emit('update:index', 1) }
function goToEnd() { if (props.totalPlans > 0) emit('update:index', props.totalPlans) }
function goPrev() { emit('update:index', Math.max(1, props.currentIndex - 1)) }
function goNext() { if (props.totalPlans > 0) emit('update:index', Math.min(props.totalPlans, props.currentIndex + 1)) }

// Draggable slider: mousedown jumps to the clicked position, then tracks
// window mousemove/mouseup for free dragging (mirrors the original panel).
const sliderRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

function updateFromClientX(clientX: number) {
  if (props.totalPlans <= 0 || !sliderRef.value) return
  const rect = sliderRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const newIndex = Math.round(ratio * (props.totalPlans - 1)) + 1
  if (newIndex !== props.currentIndex) emit('update:index', newIndex)
}

function onSliderMouseDown(e: MouseEvent) {
  if (props.totalPlans <= 0) return
  e.preventDefault()
  isDragging.value = true
  updateFromClientX(e.clientX)
}

function onWindowMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  updateFromClientX(e.clientX)
}

function onWindowMouseUp() {
  isDragging.value = false
}

watch(isDragging, (dragging) => {
  if (dragging) {
    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
  } else {
    window.removeEventListener('mousemove', onWindowMouseMove)
    window.removeEventListener('mouseup', onWindowMouseUp)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})
</script>

<template>
  <div class="bottom-panel">
    <div class="bottom-panel__controls">
      <button
        type="button"
        :aria-label="t('scheduler.firstPlan')"
        @click="goToStart"
      >
        <Icon name="lucide:chevrons-left" class="bottom-panel__icon" />
      </button>
      <button
        type="button"
        :aria-label="t('scheduler.previousPlan')"
        @click="goPrev"
      >
        <Icon name="lucide:chevron-left" class="bottom-panel__icon" />
      </button>

      <span class="bottom-panel__counter">
        <span class="bottom-panel__counter-current">{{ totalPlans === 0 ? 0 : currentIndex }}</span>
        <span class="bottom-panel__counter-total">/ {{ totalPlans }}</span>
      </span>

      <button
        type="button"
        :aria-label="t('scheduler.nextPlan')"
        @click="goNext"
      >
        <Icon name="lucide:chevron-right" class="bottom-panel__icon" />
      </button>
      <button
        type="button"
        :aria-label="t('scheduler.lastPlan')"
        @click="goToEnd"
      >
        <Icon name="lucide:chevrons-right" class="bottom-panel__icon" />
      </button>
    </div>

    <div ref="sliderRef" class="bottom-panel__slider" @mousedown="onSliderMouseDown">
      <div class="bottom-panel__track">
        <div class="bottom-panel__progress" :style="{ width: `${sliderPercent}%` }" />
        <div
          class="bottom-panel__thumb"
          :class="{ 'bottom-panel__thumb--dragging': isDragging }"
          :style="{ left: `${sliderPercent}%` }"
        >
          <div v-if="isDragging" class="bottom-panel__tooltip">{{ currentIndex }}</div>
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
      color: var(--text-primary);
      font-size: 1.7rem;
      font-weight: 700;
      line-height: 1;
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
    color: var(--text-inverse);
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
        width: 36px;
        height: 36px;
      }
    }

    &__counter {
      min-width: 76px;
      margin: 0 2px;
    }
  }
}
</style>
