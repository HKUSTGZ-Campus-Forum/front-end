<!-- front-end/components/scheduler/SchedulerPopularitySummary.vue -->
<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  SchedulerPopularityCounts,
  SchedulerPopularityHistoryResponse,
} from '~/utils/scheduler'
import {
  buildPopularityHistorySeries,
  getPopularityHistoryWindow,
} from '~/utils/scheduler'

const props = defineProps<{
  counts: SchedulerPopularityCounts
  courseCode?: string
  semesterId?: string
  canShowHistory?: boolean
  getHistory?: (
    semester: string,
    courseCode: string,
    options: { sectionId?: string; from: string; to: string; resolution?: 'auto'; signal?: AbortSignal },
  ) => Promise<SchedulerPopularityHistoryResponse>
  onShowFullHistory?: () => void
}>()

const { t, locale } = useI18n()
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

// --- Mini history trend, fetched lazily on first hover when permitted ---
const historyResponse = ref<SchedulerPopularityHistoryResponse | null>(null)
const historyLoading = ref(false)
const historyError = ref<'none' | 'auth' | 'error'>('none')
const historyFetched = ref(false)
let historyAbort: AbortController | null = null

async function loadHistory() {
  if (
    historyFetched.value
    || !props.canShowHistory
    || !props.courseCode
    || !props.semesterId
    || !props.getHistory
  ) return
  historyFetched.value = true
  historyLoading.value = true
  historyError.value = 'none'
  const { from, to } = getPopularityHistoryWindow('7d', new Date())
  historyAbort = new AbortController()
  try {
    historyResponse.value = await props.getHistory(props.semesterId, props.courseCode, {
      from,
      to,
      resolution: 'auto',
      signal: historyAbort.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Authentication')) {
      historyError.value = 'auth'
    } else if (!(error instanceof DOMException && error.name === 'AbortError')) {
      historyError.value = 'error'
    }
  } finally {
    historyLoading.value = false
  }
}

const chartSeries = computed(() => historyResponse.value
  ? buildPopularityHistorySeries(historyResponse.value)
  : { looking: [], scheduling: [] })

const hasChartData = computed(() =>
  chartSeries.value.looking.some(p => p.y !== null)
  || chartSeries.value.scheduling.some(p => p.y !== null))

let hideTimer: ReturnType<typeof setTimeout> | null = null

function showFromHover() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  hovered.value = true
  void loadHistory()
}

// The tooltip is teleported to <body>, so moving from the badge up to it is NOT
// captured by the badge's mouseleave. Keep a short grace period after leaving
// the badge so the pointer can bridge into the (hoverable) tooltip before it
// unmounts, and let the tooltip itself keep it open while hovered.
function hideFromHover() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (!tooltipHovered.value) hovered.value = false
  }, 140)
}

function showFromFocus() {
  focused.value = true
  void loadHistory()
}

function hideFromFocus() {
  focused.value = false
}

const tooltipHovered = ref(false)

function onTooltipEnter() {
  tooltipHovered.value = true
  hovered.value = true
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function onTooltipLeave() {
  tooltipHovered.value = false
  hideFromHover()
}

function openFullHistory() {
  props.onShowFullHistory?.()
  close()
}

function close() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
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
  historyAbort?.abort()
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
})

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
      <Icon name="lucide:flame" class="popularity-summary__flame" aria-hidden="true" />
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
        @mouseenter="onTooltipEnter"
        @mouseleave="onTooltipLeave"
        :style="{
          top: `${position.top}px`,
          left: `${position.left}px`,
          '--popularity-arrow-left': `${position.arrowLeft}px`,
        }"
      >
        <div class="popularity-tooltip__head">
          <span class="popularity-tooltip__icon" aria-hidden="true">
            <Icon name="lucide:users-round" />
          </span>
          <span class="popularity-tooltip__content">
            <strong>{{ t('scheduler.popularityTooltipTitle') }}</strong>
            <span>{{ t('scheduler.popularityExplanation') }}</span>
          </span>
        </div>

        <!-- Mini history trend for this course when permitted -->
        <div v-if="canShowHistory" class="popularity-mini">
          <ClientOnly>
            <div v-if="historyLoading" class="popularity-mini__state">
              {{ t('scheduler.loading') }}
            </div>
            <div v-else-if="historyError === 'auth'" class="popularity-mini__state">
              {{ t('scheduler.popularityVerifiedOnly') }}
            </div>
            <div v-else-if="historyError === 'error'" class="popularity-mini__state">
              {{ t('scheduler.popularityHistoryUnavailable') }}
            </div>
            <div v-else-if="historyResponse && !hasChartData" class="popularity-mini__state">
              {{ t('scheduler.popularityHistoryUnavailable') }}
            </div>
            <div v-else-if="historyResponse && hasChartData" class="popularity-mini__chart">
              <div class="popularity-mini__legend">
                <span class="popularity-mini__key popularity-mini__key--looking">
                  {{ t('scheduler.popularityHistoryLooking') }}
                </span>
                <span class="popularity-mini__key popularity-mini__key--scheduling">
                  {{ t('scheduler.popularityHistoryPlanning') }}
                </span>
              </div>
              <SchedulerPopularityHistoryChart
                :series="chartSeries"
                :looking-label="t('scheduler.popularityHistoryLooking')"
                :scheduling-label="t('scheduler.popularityHistoryPlanning')"
                :accounts-label="t('scheduler.popularityHistoryAccountsAxis')"
                :scheduled-time-label="t('scheduler.popularityHistoryScheduledTime')"
                :observed-time-label="t('scheduler.popularityHistoryObservedTime')"
                :partial-label="t('scheduler.popularityHistoryPartialMarker')"
                :missing-label="t('scheduler.popularityHistoryMissingValue')"
                :locale="locale"
                :reduced-motion="false"
                :height="140"
                :compact="true"
              />
              <button
                type="button"
                class="popularity-mini__expand"
                @click.stop="openFullHistory"
              >
                {{ t('scheduler.popularityHistoryExpand') }}
              </button>
            </div>
          </ClientOnly>
        </div>
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

  &__flame {
    display: inline-flex;
    align-items: center;
    font-size: 13px;
    line-height: 1;
    color: var(--semantic-warning);
  }

  &__value {
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    line-height: 1;
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
  flex-direction: column;
  gap: 9px;
  width: max-content;
  max-width: min(320px, calc(100vw - 16px));
  padding: 11px 12px;
  border-radius: 12px;
  background: var(--surface-elevated);
  box-shadow: var(--shadow-medium);
  color: var(--text-primary);
  // The tooltip hosts an interactive "view full trend" action, so the whole
  // card captures pointer events; it floats transiently above the page, so it
  // only briefly intercepts the small area it covers.
  pointer-events: auto;

  &__head {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  &::after {
    position: absolute;
    left: var(--popularity-arrow-left);
    width: 9px;
    height: 9px;
    background: var(--surface-elevated);
    content: '';
    transform: translateX(-50%) rotate(45deg);
    z-index: -1;
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

.popularity-mini {
  width: 100%;
  border-top: 1px solid var(--border-secondary);
  padding-top: 8px;

  &__state {
    font-size: 0.74rem;
    color: var(--text-secondary);
    padding: 6px 0;
  }

  &__chart {
    width: 100%;
    overflow: hidden;

    :deep(.apexcharts-canvas) {
      margin: 0 auto;
    }
  }

  &__legend {
    display: flex;
    gap: 14px;
    margin-bottom: 4px;
  }

  &__key {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.7rem;
    color: var(--text-secondary);

    &::before {
      content: '';
      width: 10px;
      height: 0;
      border-top: 2px solid currentColor;
    }

    &--looking {
      &::before {
        border-top-style: dashed;
        border-top-color: #2563eb;
        color: #2563eb;
      }
    }

    &--scheduling {
      &::before {
        border-top-style: solid;
        border-top-color: #16a34a;
        color: #16a34a;
      }
    }
  }

  &__expand {
    display: inline-flex;
    align-items: center;
    margin-top: 6px;
    padding: 4px 10px;
    min-height: 0;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-secondary);
    color: var(--interactive-active-text);
    font-size: 0.74rem;
    font-weight: 700;
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast);

    &:hover {
      background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--interactive-primary) 45%, var(--border-secondary));
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
