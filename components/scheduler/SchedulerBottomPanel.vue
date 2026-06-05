<!-- front-end/components/scheduler/SchedulerBottomPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
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

function onSliderClick(e: MouseEvent) {
  if (props.totalPlans === 0) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const newIndex = Math.max(1, Math.min(props.totalPlans, Math.round(percent * (props.totalPlans - 1)) + 1))
  emit('update:index', newIndex)
}
</script>

<template>
  <div class="bottom-panel">
    <div class="bottom-panel__controls">
      <button type="button" :aria-label="t('scheduler.firstPlan')" :disabled="currentIndex <= 1" @click="goToStart">&#9198;</button>
      <button type="button" :aria-label="t('scheduler.previousPlan')" :disabled="currentIndex <= 1" @click="goPrev">&#9664;</button>
      <span class="bottom-panel__counter">{{ totalPlans === 0 ? 0 : currentIndex }} / {{ totalPlans }}</span>
      <button type="button" :aria-label="t('scheduler.nextPlan')" :disabled="currentIndex >= totalPlans" @click="goNext">&#9654;</button>
      <button type="button" :aria-label="t('scheduler.lastPlan')" :disabled="currentIndex >= totalPlans" @click="goToEnd">&#9197;</button>
    </div>
    <div class="bottom-panel__slider" @click="onSliderClick">
      <div class="bottom-panel__track">
        <div class="bottom-panel__thumb" :style="{ left: `${sliderPercent}%` }" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bottom-panel {
  min-height: 86px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 12px 16px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  border-top: 0;
  border-radius: 0 0 12px 12px;

  &__controls {
    display: flex;
    align-items: center;
    gap: 8px;

    button {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border-secondary);
      background: var(--surface-primary);
      cursor: pointer;
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary);
      transition: background 0.15s, border-color 0.15s, color 0.15s;

      &:hover:not(:disabled) {
        border-color: var(--interactive-secondary);
        color: var(--interactive-active);
      }

      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
  }

  &__counter {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary);
    min-width: 62px;
    text-align: center;
  }

  &__slider {
    width: 100%;
    max-width: 440px;
    height: 22px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  &__track {
    width: 100%;
    height: 5px;
    background: var(--border-secondary);
    border-radius: 999px;
    position: relative;
  }

  &__thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: var(--interactive-primary);
    transition: left 0.1s ease;
    box-shadow: 0 2px 6px rgba(38, 164, 255, 0.35);
  }
}

@media (max-width: 520px) {
  .bottom-panel {
    min-height: 80px;
    padding: 10px 8px;

    &__controls {
      gap: 6px;

      button {
        width: 34px;
        height: 34px;
      }
    }
  }
}
</style>
