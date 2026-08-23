<!-- front-end/components/scheduler/SchedulerPopularitySummary.vue -->
<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SchedulerPopularityCounts } from '~/utils/scheduler'

const props = defineProps<{
  counts: SchedulerPopularityCounts
}>()

const { t } = useI18n()
const triggerRef = ref<HTMLButtonElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const hovered = ref(false)
const focused = ref(false)
const tooltipId = `scheduler-popularity-${useId()}`
const position = ref({ top: 0, left: 0, arrowLeft: 24, placement: 'top' as 'top' | 'bottom' })
const visible = computed(() => hovered.value || focused.value)
const displayCount = computed(() => props.counts.cart_count_suppressed
  ? t('scheduler.popularityFew')
  : String(props.counts.cart_count ?? 0))
const accessibleLabel = computed(() => t('scheduler.popularityAriaLabel', {
  count: displayCount.value,
}))

function updatePosition() {
  if (!triggerRef.value || !tooltipRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const edge = 8
  const gap = 9
  const center = triggerRect.left + triggerRect.width / 2
  const placement = triggerRect.top >= tooltipRect.height + gap + edge ? 'top' : 'bottom'
  const top = placement === 'top'
    ? triggerRect.top - tooltipRect.height - gap
    : triggerRect.bottom + gap
  const left = Math.min(
    window.innerWidth - tooltipRect.width - edge,
    Math.max(edge, center - tooltipRect.width / 2),
  )
  const arrowLeft = Math.min(tooltipRect.width - 18, Math.max(18, center - left))

  position.value = { top, left, arrowLeft, placement }
}

function showFromHover() {
  hovered.value = true
}

function hideFromHover() {
  hovered.value = false
}

function showFromFocus() {
  focused.value = true
}

function hideFromFocus() {
  focused.value = false
}

function close() {
  hovered.value = false
  focused.value = false
  triggerRef.value?.blur()
}

watch(visible, async (shown) => {
  if (!shown) {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
    return
  }
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
  await nextTick()
  updatePosition()
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    class="popularity-summary"
    :aria-label="accessibleLabel"
    :aria-describedby="visible ? tooltipId : undefined"
    @mouseenter="showFromHover"
    @mouseleave="hideFromHover"
    @focus="showFromFocus"
    @blur="hideFromFocus"
    @click.stop
    @keydown.escape.stop="close"
  >
    <span class="popularity-summary__metric">
      <span class="popularity-summary__label">{{ t('scheduler.popularityCartLabel') }}</span>
      <span class="popularity-summary__value">{{ displayCount }}</span>
    </span>
  </button>

  <Teleport to="body">
    <Transition name="popularity-tip">
      <div
        v-if="visible"
        :id="tooltipId"
        ref="tooltipRef"
        class="popularity-tooltip"
        :class="`popularity-tooltip--${position.placement}`"
        role="tooltip"
        :style="{
          top: `${position.top}px`,
          left: `${position.left}px`,
          '--popularity-arrow-left': `${position.arrowLeft}px`,
        }"
      >
        <span class="popularity-tooltip__icon" aria-hidden="true">
          <Icon name="lucide:users-round" />
        </span>
        <span class="popularity-tooltip__content">
          <strong>{{ t('scheduler.popularityTooltipTitle') }}</strong>
          <span>{{ t('scheduler.popularityExplanation') }}</span>
        </span>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.popularity-summary {
  display: inline-flex;
  align-items: center;
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  cursor: help;

  &__metric {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-height: 20px;
    padding: 2px 6px;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-secondary);
    transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
  }

  &__label {
    color: var(--text-secondary);
  }

  &__value {
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  &:hover &__metric {
    border-color: color-mix(in srgb, var(--interactive-primary) 42%, var(--border-secondary));
    background: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-primary));
  }

  &:focus-visible {
    outline: none;

    .popularity-summary__metric {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--border-focus) 24%, transparent);
    }
  }
}

.popularity-tooltip {
  --popularity-arrow-left: 24px;
  position: fixed;
  z-index: 1310;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: max-content;
  max-width: min(300px, calc(100vw - 16px));
  padding: 11px 12px;
  border-radius: 12px;
  background: var(--surface-elevated);
  box-shadow: var(--shadow-medium);
  color: var(--text-primary);
  pointer-events: none;

  &::after {
    position: absolute;
    left: var(--popularity-arrow-left);
    width: 9px;
    height: 9px;
    background: var(--surface-elevated);
    content: '';
    transform: translateX(-50%) rotate(45deg);
  }

  &--top::after {
    bottom: -4px;
  }

  &--bottom::after {
    top: -4px;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-secondary));
    color: var(--interactive-primary);
    font-size: 15px;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    strong {
      color: var(--text-primary);
      font-size: 0.8rem;
      line-height: 1.35;
    }

    > span {
      max-width: 34ch;
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.5;
      white-space: normal;
      text-wrap: pretty;
    }
  }
}

.popularity-tip-enter-active,
.popularity-tip-leave-active {
  transition: opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.popularity-tip-enter-from,
.popularity-tip-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

@media (max-width: 520px) {
  .popularity-tooltip {
    &__content {
      strong {
        font-size: 0.875rem;
      }

      > span {
        font-size: 0.875rem;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .popularity-summary__metric,
  .popularity-tip-enter-active,
  .popularity-tip-leave-active {
    transition: none;
  }
}
</style>
