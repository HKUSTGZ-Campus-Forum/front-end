<script setup lang="ts">
import type {
  SchedulerOptimizerBreakdownItem,
  SchedulerOptimizerPlan,
} from '~/utils/schedulerOptimizer'

const props = defineProps<{
  visible: boolean
  plan: SchedulerOptimizerPlan | null
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { t } = useI18n()
const closeButton = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function dayLabel(day: number): string {
  return t(`scheduler.days.${dayKeys[day - 1] || 'mon'}`)
}

function minuteLabel(minutes: number): string {
  if (!Number.isFinite(minutes)) return String(minutes)
  const safeMinutes = Math.max(0, Math.min(1440, Math.trunc(minutes)))
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, '0')}:${String(safeMinutes % 60).padStart(2, '0')}`
}

function matchedDaysLabel(days: number[]): string {
  if (!Array.isArray(days) || days.length === 0) return t('scheduler.optimizer.breakdown.noMatchedDays')
  return days.map(dayLabel).join(t('scheduler.optimizer.daySeparator'))
}

function breakdownLabel(item: SchedulerOptimizerBreakdownItem): string {
  switch (item.kind) {
    case 'base':
      return t('scheduler.optimizer.breakdown.base')
    case 'per-credit':
      return t('scheduler.optimizer.breakdown.perCredit', {
        credits: item.totalCredits,
        delta: item.creditDelta,
      })
    case 'course-count':
      return t('scheduler.optimizer.breakdown.courseCount', { count: item.courseCount })
    case 'course-selection':
      return t('scheduler.optimizer.breakdown.courseSelection', {
        code: item.courseCode,
        title: item.courseTitle,
      })
    case 'section-selection':
      return t('scheduler.optimizer.breakdown.sectionSelection', {
        code: item.courseCode,
        section: item.sectionName || item.sectionId,
      })
    case 'early-start':
      return t('scheduler.optimizer.breakdown.earlyStart', {
        day: dayLabel(item.day),
        time: minuteLabel(item.startMinute),
        matched: matchedDaysLabel(item.matchedDays),
      })
    case 'time-window':
      return t('scheduler.optimizer.breakdown.timeWindow', {
        state: t(`scheduler.optimizer.timeState.${item.state}`),
        start: minuteLabel(item.startMinute),
        end: minuteLabel(item.endMinute),
        application: t(`scheduler.optimizer.applicationLabel.${item.application}`),
        quantity: item.quantity,
        matched: matchedDaysLabel(item.matchedDays),
      })
    default: {
      const fallback = item as unknown as { kind?: string; ruleId?: string }
      return [fallback.kind, fallback.ruleId].filter(Boolean).join(' · ') || t('scheduler.optimizer.breakdown.unknown')
    }
  }
}

function formattedAmount(item: SchedulerOptimizerBreakdownItem): string {
  if (item.kind === 'base') return item.amount
  const numericAmount = Number(item.amount)
  return Number.isFinite(numericAmount) && numericAmount > 0 ? `+${item.amount}` : item.amount
}

function amountClass(amount: string): string {
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount === 0) return 'is-neutral'
  return numericAmount > 0 ? 'is-positive' : 'is-negative'
}

function close() {
  emit('close')
}

function onWindowKeydown(event: KeyboardEvent) {
  if (!props.visible) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !panelRef.value) return

  const focusable = [...panelRef.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
  )].filter(element => !element.hidden && element.getClientRects().length > 0)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable.at(-1)!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panelRef.value.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.visible, async (visible) => {
  if (typeof window === 'undefined') return
  if (!visible) {
    window.removeEventListener('keydown', onWindowKeydown)
    previousFocus?.focus()
    previousFocus = null
    return
  }
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  window.addEventListener('keydown', onWindowKeydown)
  await nextTick()
  closeButton.value?.focus()
}, { immediate: true })

onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="score-breakdown">
      <div
        v-if="visible"
        class="score-breakdown"
        role="presentation"
        @mousedown.self="close"
      >
        <section
          ref="panelRef"
          class="score-breakdown__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="score-breakdown-title"
        >
          <header class="score-breakdown__header">
            <div>
              <p>{{ t('scheduler.optimizer.scoreEyebrow') }}</p>
              <h2 id="score-breakdown-title">{{ t('scheduler.optimizer.scoreBreakdownTitle') }}</h2>
            </div>
            <button
              ref="closeButton"
              type="button"
              :aria-label="t('scheduler.close')"
              @click="close"
            >
              <Icon name="lucide:x" aria-hidden="true" />
            </button>
          </header>

          <template v-if="plan">
            <div class="score-breakdown__hero">
              <div class="score-breakdown__total">
                <span>{{ t('scheduler.optimizer.totalScore') }}</span>
                <strong>{{ plan.score }}</strong>
              </div>
              <dl class="score-breakdown__stats">
                <div>
                  <dt>{{ t('scheduler.optimizer.rank') }}</dt>
                  <dd>#{{ plan.scoreRank }}</dd>
                </div>
                <div>
                  <dt>{{ t('scheduler.optimizer.resultCourseCount') }}</dt>
                  <dd>{{ plan.courseCount }}</dd>
                </div>
                <div>
                  <dt>{{ t('scheduler.optimizer.resultCredits') }}</dt>
                  <dd>{{ plan.totalCredits }}</dd>
                </div>
              </dl>
            </div>

            <div class="score-breakdown__list-heading">
              <div>
                <Icon name="lucide:list-checks" aria-hidden="true" />
                <h3>{{ t('scheduler.optimizer.appliedRules') }}</h3>
              </div>
              <span>{{ t('scheduler.optimizer.appliedRuleCount', { count: plan.breakdown.length }) }}</span>
            </div>

            <ol v-if="plan.breakdown.length" class="score-breakdown__list">
              <li v-for="item in plan.breakdown" :key="`${item.ruleId}-${item.kind}`">
                <div class="score-breakdown__rule-icon" aria-hidden="true">
                  <Icon
                    :name="item.kind === 'base'
                      ? 'lucide:flag'
                      : item.kind === 'per-credit'
                        ? 'lucide:graduation-cap'
                        : item.kind === 'course-count'
                          ? 'lucide:layers-3'
                          : item.kind === 'course-selection'
                            ? 'lucide:book-check'
                            : item.kind === 'section-selection'
                              ? 'lucide:badge-check'
                              : item.kind === 'early-start'
                                ? 'lucide:sunrise'
                                : 'lucide:clock-3'"
                  />
                </div>
                <div class="score-breakdown__rule-copy">
                  <strong>{{ breakdownLabel(item) }}</strong>
                  <small>{{ item.kind }} · {{ item.ruleId }}</small>
                </div>
                <span class="score-breakdown__amount" :class="amountClass(item.amount)">
                  {{ formattedAmount(item) }}
                </span>
              </li>
            </ol>
            <p v-else class="score-breakdown__empty">{{ t('scheduler.optimizer.noBreakdownItems') }}</p>
          </template>

          <div v-else class="score-breakdown__missing">
            <Icon name="lucide:circle-slash-2" aria-hidden="true" />
            <p>{{ t('scheduler.optimizer.noSelectedResult') }}</p>
          </div>

          <footer class="score-breakdown__footer">
            <button type="button" @click="close">{{ t('scheduler.optimizer.done') }}</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.score-breakdown {
  position: fixed;
  z-index: 1460;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--modal-backdrop);
}

.score-breakdown__panel {
  width: min(620px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  border: 1px solid var(--border-secondary);
  border-radius: 18px;
  background: var(--surface-primary);
  box-shadow: var(--modal-shadow);
}

.score-breakdown__header {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border-secondary);
  background: var(--surface-primary);

  p {
    margin: 0 0 4px;
    color: var(--interactive-active-text);
    font-size: 0.71rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    line-height: 1.3;
  }

  button {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-secondary);
    color: var(--text-secondary);
    cursor: pointer;

    &:hover {
      color: var(--text-primary);
    }
  }
}

.score-breakdown__hero {
  display: grid;
  grid-template-columns: minmax(150px, 0.75fr) minmax(0, 1.25fr);
  gap: 14px;
  padding: 20px 22px;
}

.score-breakdown__total {
  display: grid;
  align-content: center;
  justify-items: start;
  padding: 16px;
  border: 1px solid var(--scheduler-chip-border-active);
  border-radius: 14px;
  background: var(--scheduler-chip-bg-active);
  color: var(--scheduler-chip-text-active);

  span {
    font-size: 0.74rem;
    font-weight: 750;
  }

  strong {
    margin-top: 3px;
    font-size: 2rem;
    line-height: 1;
  }
}

.score-breakdown__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;

  div {
    min-width: 0;
    display: grid;
    align-content: center;
    gap: 5px;
    padding: 12px 10px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-secondary);
    text-align: center;
  }

  dt {
    color: var(--text-secondary);
    font-size: 0.68rem;
  }

  dd {
    margin: 0;
    overflow: hidden;
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 800;
    text-overflow: ellipsis;
  }
}

.score-breakdown__list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 22px 10px;

  > div {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);

    svg {
      width: 18px;
      height: 18px;
      color: var(--interactive-active-text);
    }
  }

  h3 {
    margin: 0;
    font-size: 0.88rem;
  }

  > span {
    color: var(--text-secondary);
    font-size: 0.7rem;
  }
}

.score-breakdown__list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0 22px 20px;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 11px 12px;
    border: 1px solid var(--border-secondary);
    border-radius: 11px;
    background: var(--surface-secondary);
  }
}

.score-breakdown__rule-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--scheduler-chip-border);
  border-radius: 10px;
  background: var(--scheduler-chip-bg);
  color: var(--scheduler-chip-text);

  svg {
    width: 17px;
    height: 17px;
  }
}

.score-breakdown__rule-copy {
  min-width: 0;
  display: grid;
  gap: 3px;

  strong {
    color: var(--text-primary);
    font-size: 0.78rem;
    font-weight: 750;
    line-height: 1.4;
  }

  small {
    overflow: hidden;
    color: var(--text-muted);
    font-size: 0.64rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.score-breakdown__amount {
  min-width: 64px;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 850;
  text-align: center;

  &.is-positive {
    background: color-mix(in srgb, var(--semantic-success) 13%, transparent);
    color: var(--semantic-success);
  }

  &.is-negative {
    background: color-mix(in srgb, var(--semantic-error) 11%, transparent);
    color: var(--semantic-error);
  }

  &.is-neutral {
    background: var(--surface-primary);
    color: var(--text-secondary);
  }
}

.score-breakdown__empty,
.score-breakdown__missing {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
}

.score-breakdown__empty {
  margin: 0 22px 20px;
  padding: 18px;
  border: 1px dashed var(--border-primary);
  border-radius: 11px;
}

.score-breakdown__missing {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 42px 22px;

  svg {
    width: 34px;
    height: 34px;
    color: var(--text-muted);
  }

  p {
    margin: 0;
  }
}

.score-breakdown__footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 22px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-secondary);
  background: var(--surface-primary);

  button {
    min-width: 112px;
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--btn-primary-bg);
    color: var(--text-on-interactive);
    cursor: pointer;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 800;

    &:hover {
      background: var(--btn-primary-bg-hover);
    }
  }
}

.score-breakdown button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--interactive-primary) 24%, transparent);
  outline-offset: 2px;
}

.score-breakdown-enter-active,
.score-breakdown-leave-active {
  transition: opacity 0.18s ease;

  .score-breakdown__panel {
    transition: transform 0.18s ease;
  }
}

.score-breakdown-enter-from,
.score-breakdown-leave-to {
  opacity: 0;

  .score-breakdown__panel {
    transform: translateY(12px) scale(0.985);
  }
}

@media (max-width: 560px) {
  .score-breakdown {
    align-items: flex-end;
    padding: 0;
  }

  .score-breakdown__panel {
    width: 100%;
    max-height: 92dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 18px 18px 0 0;
  }

  .score-breakdown__header,
  .score-breakdown__hero,
  .score-breakdown__footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .score-breakdown__hero {
    grid-template-columns: 1fr;
  }

  .score-breakdown__list-heading {
    padding-right: 16px;
    padding-left: 16px;
  }

  .score-breakdown__list {
    padding-right: 16px;
    padding-left: 16px;
  }

  .score-breakdown__stats div {
    padding: 10px 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .score-breakdown-enter-active,
  .score-breakdown-leave-active,
  .score-breakdown-enter-active .score-breakdown__panel,
  .score-breakdown-leave-active .score-breakdown__panel {
    transition: none;
  }
}
</style>
