<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  CartCourse,
  SchedulerPopularityHistoryRange,
  SchedulerPopularityHistoryResponse,
} from '~/utils/scheduler'
import {
  buildPopularityHistorySeries,
  getNextPopularityHistoryRefreshDelay,
  getPopularityHistoryDataState,
  getPopularityHistoryWindow,
  SchedulerPopularityHistoryAccessError,
} from '~/utils/scheduler'

const props = defineProps<{
  visible: boolean
  semesterId: string
  course: CartCourse | null
  getHistory: (
    semester: string,
    courseCode: string,
    options: { sectionId?: string; from: string; to: string; resolution?: 'auto'; signal?: AbortSignal },
  ) => Promise<SchedulerPopularityHistoryResponse>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'access-lost', kind: 'authentication' | 'authorization' | 'scope'): void
}>()
const { t, locale } = useI18n()
const panel = ref<HTMLElement | null>(null)
const selectedSection = ref('')
const selectedRange = ref<SchedulerPopularityHistoryRange>('24h')
const response = ref<SchedulerPopularityHistoryResponse | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'not-started' | 'empty' | 'error'>('idle')
const refreshing = ref(false)
const reducedMotion = ref(false)
let requestId = 0
let resettingFilters = false
let previouslyFocused: HTMLElement | null = null
let previousBodyOverflow = ''
let bodyLocked = false
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let activeRequest: AbortController | null = null

const ranges: SchedulerPopularityHistoryRange[] = ['24h', '7d', '30d', 'all']
const uniqueSections = computed(() => {
  const sections = new Map<string, string>()
  for (const bundles of Object.values(props.course?.layers || {})) {
    for (const bundle of bundles) {
      for (const section of bundle.sections) {
        sections.set(section.section_id, `${section.section_type}${section.name.replace(/\D/g, '')}`)
      }
    }
  }
  return [...sections].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label))
})
const chartSeries = computed(() => response.value ? buildPopularityHistorySeries(response.value) : { looking: [], scheduling: [] })
const sortedPoints = computed(() => [...(response.value?.points || [])].sort(
  (a, b) => Date.parse(a.sampled_at) - Date.parse(b.sampled_at),
))
const tablePoints = computed(() => [...sortedPoints.value].reverse())
const latestPoint = computed(() => sortedPoints.value.at(-1))
const scopeLabel = computed(() => {
  if (!selectedSection.value) return t('scheduler.popularityHistoryCourseScope')
  return uniqueSections.value.find(section => section.id === selectedSection.value)?.label || selectedSection.value
})
const titleId = computed(() => `popularity-history-${props.course?.course_code.replace(/\W/g, '') || 'course'}`)
const descriptionId = computed(() => `${titleId.value}-description`)
const statusAnnouncement = computed(() => {
  if (refreshing.value) return t('scheduler.popularityHistoryRefreshing')
  if (status.value === 'loading') return t('scheduler.popularityHistoryLoading')
  if (status.value === 'empty') return t('scheduler.popularityHistoryEmpty')
  if (status.value === 'error') return t('scheduler.popularityHistoryError')
  if (status.value === 'not-started') return t('scheduler.popularityHistoryNotStarted')
  if (status.value === 'ready') return t('scheduler.popularityHistoryLoaded', { count: sortedPoints.value.length })
  return ''
})

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en-GB', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function scheduleRefresh() {
  clearRefreshTimer()
  if (
    !import.meta.client
    || !props.visible
    || !props.course
    || document.hidden
  ) return
  const delay = getNextPopularityHistoryRefreshDelay()
  if (delay === null) return

  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void loadHistory(true)
  }, delay)
}

async function loadHistory(background = false) {
  if (!props.visible || !props.course) return
  activeRequest?.abort()
  const requestController = new AbortController()
  activeRequest = requestController
  clearRefreshTimer()
  const currentRequest = ++requestId
  const keepCurrentResult = background && response.value !== null
  refreshing.value = keepCurrentResult
  if (!keepCurrentResult) {
    status.value = 'loading'
    response.value = null
  }
  try {
    const window = getPopularityHistoryWindow(selectedRange.value)
    const result = await props.getHistory(props.semesterId, props.course.course_code, {
      sectionId: selectedSection.value || undefined,
      from: window.from,
      to: window.to,
      resolution: 'auto',
      signal: requestController.signal,
    })
    if (currentRequest !== requestId || !props.visible) return
    response.value = result
    status.value = getPopularityHistoryDataState(result)
  } catch (loadError) {
    if (requestController.signal.aborted) return
    if (currentRequest !== requestId || !props.visible) return
    if (loadError instanceof SchedulerPopularityHistoryAccessError) {
      requestId += 1
      clearRefreshTimer()
      clearHistoryState()
      emit('access-lost', loadError.kind)
      return
    }
    if (!keepCurrentResult) status.value = 'error'
  } finally {
    if (currentRequest === requestId) {
      if (activeRequest === requestController) activeRequest = null
      refreshing.value = false
      scheduleRefresh()
    }
  }
}

function clearHistoryState() {
  activeRequest?.abort()
  activeRequest = null
  response.value = null
  status.value = 'idle'
  refreshing.value = false
}

function close() {
  requestId += 1
  activeRequest?.abort()
  activeRequest = null
  clearRefreshTimer()
  emit('close')
}

function handleVisibilityChange() {
  clearRefreshTimer()
  if (!props.visible || document.hidden) return
  void loadHistory(true)
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.visible) return
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return

  const focusable = [...panel.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), select:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])',
  )].filter(element => !element.hasAttribute('hidden'))
  if (!focusable.length) {
    event.preventDefault()
    panel.value.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || !panel.value.contains(document.activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!import.meta.client) return
    if (visible) {
      resettingFilters = true
      selectedSection.value = ''
      selectedRange.value = '24h'
      reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      previousBodyOverflow = document.body.style.overflow
      document.addEventListener('keydown', handleKeydown)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      document.body.style.overflow = 'hidden'
      bodyLocked = true
      await nextTick()
      resettingFilters = false
      panel.value?.focus()
      await loadHistory()
    } else {
      requestId += 1
      clearRefreshTimer()
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearHistoryState()
      if (bodyLocked) document.body.style.overflow = previousBodyOverflow
      bodyLocked = false
      await nextTick()
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

watch([selectedSection, selectedRange], () => {
  if (props.visible && !resettingFilters) loadHistory()
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearRefreshTimer()
  requestId += 1
  clearHistoryState()
  if (bodyLocked) document.body.style.overflow = previousBodyOverflow
  bodyLocked = false
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible && course" class="history" @click.self="close">
        <section
          ref="panel"
          class="history__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
          tabindex="-1"
        >
          <header class="history__header">
            <div>
              <span class="history__eyebrow">{{ course.course_code }}</span>
              <h2 :id="titleId">{{ t('scheduler.popularityHistoryTitle') }}</h2>
              <p :id="descriptionId">{{ t('scheduler.popularityHistoryDescription') }}</p>
            </div>
            <div class="history__header-actions">
              <button
                type="button"
                class="history__refresh"
                :disabled="status === 'loading' || refreshing"
                @click="loadHistory(true)"
              >
                {{ refreshing ? t('scheduler.popularityHistoryRefreshing') : t('scheduler.popularityHistoryRefresh') }}
              </button>
              <button type="button" class="history__close" :aria-label="t('scheduler.close')" @click="close">&times;</button>
            </div>
          </header>

          <div class="history__controls">
            <label>
              <span>{{ t('scheduler.popularityHistoryScope') }}</span>
              <select v-model="selectedSection">
                <option value="">{{ t('scheduler.popularityHistoryCourseScope') }}</option>
                <option v-for="section in uniqueSections" :key="section.id" :value="section.id">
                  {{ t('scheduler.popularityHistorySectionScope', { section: section.label }) }}
                </option>
              </select>
            </label>
            <fieldset>
              <legend>{{ t('scheduler.popularityHistoryRange') }}</legend>
              <div class="history__ranges">
                <button
                  v-for="range in ranges"
                  :key="range"
                  type="button"
                  :class="{ active: selectedRange === range }"
                  :aria-pressed="selectedRange === range"
                  @click="selectedRange = range"
                >
                  {{ t(`scheduler.popularityHistoryRange${range === 'all' ? 'All' : range}`) }}
                </button>
              </div>
            </fieldset>
          </div>

          <main class="history__body">
            <p class="history__sr-only" role="status" aria-live="polite">{{ statusAnnouncement }}</p>
            <div v-if="status === 'loading'" class="history__state">
              {{ t('scheduler.popularityHistoryLoading') }}
            </div>
            <div v-else-if="status === 'error'" class="history__state history__state--error">
              <p>{{ t('scheduler.popularityHistoryError') }}</p>
              <button type="button" @click="loadHistory">{{ t('scheduler.popularityHistoryRetry') }}</button>
            </div>
            <div v-else-if="status === 'not-started'" class="history__state">
              <p>{{ t('scheduler.popularityHistoryNotStarted') }}</p>
            </div>
            <div v-else-if="status === 'empty'" class="history__state">
              <p>{{ t('scheduler.popularityHistoryEmpty') }}</p>
            </div>
            <template v-else-if="status === 'ready' && response">
              <p class="history__summary">
                {{ t('scheduler.popularityHistorySummary', {
                  scope: scopeLabel,
                  looking: latestPoint?.looking_count ?? 0,
                  scheduling: latestPoint?.scheduling_count ?? 0,
                }) }}
              </p>
              <p class="history__sr-only">{{ t('scheduler.popularityHistoryChartLabel', { scope: scopeLabel }) }}</p>
              <div class="history__chart" aria-hidden="true">
                <ClientOnly>
                  <SchedulerPopularityHistoryChart
                    :series="chartSeries"
                    :looking-label="t('scheduler.popularityHistoryLooking')"
                    :scheduling-label="t('scheduler.popularityHistoryPlanning')"
                    :locale="locale"
                    :reduced-motion="reducedMotion"
                  />
                </ClientOnly>
              </div>
              <p class="history__meta">
                {{ t('scheduler.popularityHistoryTimezone') }} ·
                <template v-if="response.tracking_started_at">
                  {{ t('scheduler.popularityHistoryTrackingWindow', { from: formatDateTime(response.tracking_started_at), to: formatDateTime(response.tracking_ends_at) }) }} ·
                </template>
                {{ t('scheduler.popularityHistorySourceInterval', { minutes: Math.max(1, Math.round(response.source_interval_seconds / 60)) }) }} ·
                {{ t('scheduler.popularityHistoryEffectiveInterval', { minutes: Math.max(1, Math.round(response.effective_interval_seconds / 60)) }) }} ·
                {{ t('scheduler.popularityHistoryGaps') }}
              </p>
              <details class="history__data">
                <summary>{{ t('scheduler.popularityHistoryTableToggle') }}</summary>
                <div class="history__table-wrap">
                  <table>
                    <caption>{{ t('scheduler.popularityHistoryTableCaption', { count: tablePoints.length }) }}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{{ t('scheduler.popularityHistoryTime') }}</th>
                        <th scope="col">{{ t('scheduler.popularityHistoryLooking') }}</th>
                        <th scope="col">{{ t('scheduler.popularityHistoryPlanning') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="point in tablePoints" :key="point.sampled_at">
                        <th scope="row">{{ formatDateTime(point.sampled_at) }}</th>
                        <td>{{ point.looking_count }}</td>
                        <td>{{ point.scheduling_count }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </template>
          </main>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.history {
  position: fixed;
  inset: 0;
  z-index: 1140;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--modal-backdrop);
  backdrop-filter: blur(4px);

  &__panel {
    width: min(920px, 100%);
    max-height: min(88vh, 820px);
    overflow: auto;
    border: 1px solid var(--border-secondary);
    border-radius: 18px;
    background: var(--surface-primary);
    box-shadow: var(--modal-shadow);
    outline: none;
  }

  &__header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 20px 22px;
    border-bottom: 1px solid var(--border-secondary);
    background: var(--surface-primary);

    h2 { margin: 3px 0 0; color: var(--text-primary); font-size: 1.25rem; }
    p { margin: 6px 0 0; color: var(--text-secondary); font-size: 0.84rem; line-height: 1.5; }
  }

  &__eyebrow { color: var(--interactive-active); font-size: 0.76rem; font-weight: 800; letter-spacing: 0.05em; }
  &__header-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
  &__refresh { min-height: 44px; padding: 0 13px; border: 1px solid var(--border-secondary); border-radius: 999px; background: var(--surface-secondary); color: var(--interactive-active); cursor: pointer; font-size: 0.76rem; font-weight: 700; }
  &__refresh:disabled { cursor: wait; opacity: 0.65; }
  &__close { width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; flex: 0 0 auto; border: 1px solid var(--border-secondary); border-radius: 50%; background: var(--surface-secondary); color: var(--text-primary); cursor: pointer; font-size: 1.45rem; }

  &__controls {
    display: grid;
    grid-template-columns: minmax(190px, 0.65fr) minmax(300px, 1fr);
    gap: 16px;
    padding: 16px 22px;
    border-bottom: 1px solid var(--border-secondary);
    label, fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
    label > span, legend { display: block; margin-bottom: 7px; color: var(--text-secondary); font-size: 0.75rem; font-weight: 700; }
    select { width: 100%; min-height: 44px; padding: 0 10px; border: 1px solid var(--border-primary); border-radius: 10px; background: var(--surface-secondary); color: var(--text-primary); }
  }

  &__ranges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 3px; border: 1px solid var(--border-secondary); border-radius: 11px; background: var(--surface-secondary); }
  &__ranges button { min-height: 44px; padding: 0 6px; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); cursor: pointer; font-weight: 700; }
  &__ranges button.active { background: var(--surface-primary); color: var(--interactive-active); box-shadow: var(--shadow-small); }
  &__body { min-height: 390px; padding: 18px 22px 24px; }
  &__state { min-height: 350px; display: grid; place-content: center; justify-items: center; gap: 12px; color: var(--text-secondary); text-align: center; }
  &__state--error { color: var(--semantic-error); }
  &__state button { min-height: 44px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--interactive-primary); color: var(--text-inverse); cursor: pointer; font-weight: 700; }
  &__summary { margin: 0 0 10px; color: var(--text-secondary); font-size: 0.84rem; line-height: 1.5; }
  &__chart { min-height: 320px; }
  &__meta { margin: 8px 0 0; color: var(--text-secondary); font-size: 0.72rem; line-height: 1.5; }
  &__data { margin-top: 14px; border-top: 1px solid var(--border-secondary); padding-top: 12px; }
  &__data summary { color: var(--interactive-active); cursor: pointer; font-size: 0.8rem; font-weight: 700; }
  &__table-wrap { max-height: 280px; margin-top: 10px; overflow: auto; border: 1px solid var(--border-secondary); border-radius: 10px; }
  table { width: 100%; border-collapse: collapse; color: var(--text-primary); font-size: 0.78rem; }
  caption { padding: 10px; color: var(--text-secondary); text-align: left; }
  th, td { padding: 8px 10px; border-top: 1px solid var(--border-secondary); text-align: left; }
  thead th { position: sticky; top: 0; background: var(--surface-secondary); }
  tbody th { font-weight: 500; }
  button:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid color-mix(in srgb, var(--interactive-primary) 35%, transparent); outline-offset: 2px; }
  &__sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
}

@media (max-width: 640px) {
  .history { align-items: end; padding: 0; }
  .history__panel { width: 100%; max-height: 92dvh; padding-bottom: env(safe-area-inset-bottom); border-radius: 18px 18px 0 0; }
  .history__header { padding: 17px 16px; }
  .history__controls { grid-template-columns: 1fr; padding: 14px 16px; }
  .history__body { padding: 16px; }
  .history__ranges { grid-template-columns: repeat(2, 1fr); }
  .history__ranges button { min-width: 0; font-size: 0.76rem; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active, .modal-leave-active { transition: none; }
}
</style>
