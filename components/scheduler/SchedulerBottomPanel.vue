<!-- front-end/components/scheduler/SchedulerBottomPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentIndex: number
  totalPlans: number
}>()

const emit = defineEmits<{
  (e: 'update:index', value: number): void
}>()

const sliderPercent = computed(() => {
  if (props.totalPlans <= 1) return 0
  return ((props.currentIndex - 1) / (props.totalPlans - 1)) * 100
})

function goToStart() { emit('update:index', 1) }
function goToEnd() { emit('update:index', props.totalPlans) }
function goPrev() { emit('update:index', Math.max(1, props.currentIndex - 1)) }
function goNext() { emit('update:index', Math.min(props.totalPlans, props.currentIndex + 1)) }

function onSliderClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const newIndex = Math.max(1, Math.min(props.totalPlans, Math.round(percent * (props.totalPlans - 1)) + 1))
  emit('update:index', newIndex)
}
</script>

<template>
  <div class="bottom-panel">
    <div class="bottom-panel__controls">
      <button :disabled="currentIndex <= 1" @click="goToStart">&#9198;</button>
      <button :disabled="currentIndex <= 1" @click="goPrev">&#9664;</button>
      <span class="bottom-panel__counter">{{ currentIndex }} / {{ totalPlans }}</span>
      <button :disabled="currentIndex >= totalPlans" @click="goNext">&#9654;</button>
      <button :disabled="currentIndex >= totalPlans" @click="goToEnd">&#9197;</button>
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
  height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--surface-secondary);
  border-top: 1px solid var(--border-primary);

  &__controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    button {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-primary);
      background: var(--surface-primary); cursor: pointer; font-size: 0.85rem;
      display: flex; align-items: center; justify-content: center; color: var(--text-primary);
      transition: background 0.15s;
      &:hover:not(:disabled) { background: var(--surface-secondary); }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
  }

  &__counter {
    font-size: 0.85rem; font-weight: 600; color: var(--text-primary); min-width: 60px; text-align: center;
  }

  &__slider {
    width: 100%; max-width: 400px; height: 24px; display: flex; align-items: center; cursor: pointer;
  }

  &__track {
    width: 100%; height: 4px; background: var(--border-primary); border-radius: 2px; position: relative;
  }

  &__thumb {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 16px; height: 16px; border-radius: 50%; background: #2563eb;
    transition: left 0.1s ease; box-shadow: 0 1px 4px rgba(37, 99, 235, 0.4);
  }
}
</style>
