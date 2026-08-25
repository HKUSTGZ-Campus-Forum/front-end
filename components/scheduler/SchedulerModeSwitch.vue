<script setup lang="ts">
type SchedulerMode = 'fixed' | 'ranked'

const props = defineProps<{
  modelValue: SchedulerMode
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: SchedulerMode): void
}>()

const { t } = useI18n()
const root = ref<HTMLElement | null>(null)

const modes: Array<{
  value: SchedulerMode
  icon: string
  labelKey: string
  hintKey: string
}> = [
  {
    value: 'fixed',
    icon: 'lucide:calendar-check-2',
    labelKey: 'scheduler.optimizer.fixedMode',
    hintKey: 'scheduler.optimizer.fixedModeHint',
  },
  {
    value: 'ranked',
    icon: 'lucide:sparkles',
    labelKey: 'scheduler.optimizer.rankedMode',
    hintKey: 'scheduler.optimizer.rankedModeHint',
  },
]

function selectMode(mode: SchedulerMode) {
  if (mode !== props.modelValue) emit('update:modelValue', mode)
}

function onKeydown(event: KeyboardEvent) {
  const currentIndex = modes.findIndex(mode => mode.value === props.modelValue)
  let nextIndex = currentIndex

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1)
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(modes.length - 1, currentIndex + 1)
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = modes.length - 1
  else return

  event.preventDefault()
  const nextMode = modes[nextIndex]
  if (!nextMode) return
  selectMode(nextMode.value)
  requestAnimationFrame(() => {
    root.value?.querySelector<HTMLElement>(`[data-scheduler-mode="${nextMode.value}"]`)?.focus()
  })
}
</script>

<template>
  <div
    ref="root"
    class="mode-switch"
    role="tablist"
    :aria-label="t('scheduler.optimizer.modeLabel')"
    @keydown="onKeydown"
  >
    <button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      class="mode-switch__tab"
      :class="{ 'mode-switch__tab--active': modelValue === mode.value }"
      role="tab"
      :id="`scheduler-mode-${mode.value}`"
      aria-controls="scheduler-planner-workspace"
      :aria-selected="modelValue === mode.value"
      :tabindex="modelValue === mode.value ? 0 : -1"
      :data-scheduler-mode="mode.value"
      @click="selectMode(mode.value)"
    >
      <Icon :name="mode.icon" class="mode-switch__icon" aria-hidden="true" />
      <span class="mode-switch__copy">
        <strong>{{ t(mode.labelKey) }}</strong>
        <small>{{ t(mode.hintKey) }}</small>
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  width: min(100%, 520px);
  padding: 4px;
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  background: var(--surface-secondary);
}

.mode-switch__tab {
  min-width: 0;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    border-color: var(--scheduler-chip-border-hover);
    background: var(--scheduler-chip-bg-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 24%, transparent);
    outline-offset: 1px;
  }

  &--active {
    border-color: var(--scheduler-chip-border-active);
    background: var(--scheduler-tab-active-bg);
    color: var(--scheduler-tab-active-text);
    box-shadow: var(--shadow-small);
  }
}

.mode-switch__icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
}

.mode-switch__copy {
  min-width: 0;
  display: grid;
  gap: 1px;

  strong {
    overflow: hidden;
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    overflow: hidden;
    color: currentColor;
    font-size: 0.69rem;
    line-height: 1.25;
    opacity: 0.78;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 560px) {
  .mode-switch__tab {
    min-height: 44px;
    justify-content: center;
    padding: 7px 9px;
  }

  .mode-switch__copy small {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-switch__tab {
    transition: none;
  }
}
</style>
