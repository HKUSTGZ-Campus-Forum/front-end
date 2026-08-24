<!-- front-end/components/scheduler/SchedulerCourseInfoPopover.vue -->
<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CourseDetail } from '~/utils/scheduler'
import { createLatestRequestTracker } from '~/utils/schedulerAsync'

const props = defineProps<{
  courseCode: string
  courseTitle: string
  credit: number
  countsTowardTermLoad?: boolean
  semesterId: string
  // Which edge of the popover the trigger anchors to. 'right' keeps the
  // popover's right edge under the icon (opens leftwards, side panel);
  // 'left' aligns the popover's left edge with the icon's left edge
  // (opens rightwards, cart panel rows so it does not cover the list).
  align?: 'left' | 'right'
}>()

const { t } = useI18n()
const { getCourseDetail } = useScheduler()

function creditColorVar(credit: number): string {
  if (props.countsTowardTermLoad === false) return 'var(--credit-excluded)'
  const level = Math.min(6, Math.max(1, credit))
  return `var(--credit-level-${level})`
}

const visible = ref(false)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const course = ref<CourseDetail | null>(null)
const detailRequests = createLatestRequestTracker()
const hostRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0 })

let closeTimer: ReturnType<typeof setTimeout> | null = null

// Position the popover near the trigger icon, flipping above when there is no
// room below and staying inside the viewport (mirrors the original planner's
// calculateInfoCardPosition; popover is teleported to body so the side panel's
// overflow:hidden never clips it).
function updatePosition() {
  if (!hostRef.value || !popoverRef.value) return
  const hostRect = hostRef.value.getBoundingClientRect()
  const popRect = popoverRef.value.getBoundingClientRect()
  const vh = window.innerHeight
  const vw = window.innerWidth

  // Default: below the icon, right edges aligned.
  let top = hostRect.bottom + 8
  let left = props.align === 'left'
    ? hostRect.left
    : hostRect.right - popRect.width

  // Not enough room below -> flip above.
  if (hostRect.bottom + popRect.height > vh) {
    top = hostRect.top - popRect.height - 8
  }
  // Not enough room above either -> stick to bottom, move left of the icon.
  if (top < 0) {
    top = vh - popRect.height - 8
    left = hostRect.left - popRect.width - 8
  }
  // Clamp to the viewport edges.
  if (left < 8) left = 8
  if (left + popRect.width > vw - 8) left = vw - popRect.width - 8

  position.value = { top, left }
}

async function load() {
  const request = detailRequests.begin()
  status.value = 'loading'
  course.value = null
  try {
    const detail = await getCourseDetail(props.courseCode, props.semesterId, request.signal)
    if (!request.isCurrent()) return
    course.value = detail
    status.value = 'ready'
  } catch {
    if (request.isCurrent()) status.value = 'error'
  }
}

function open() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  visible.value = true
  if (status.value === 'idle') void load()
  void nextTick(() => updatePosition())
}

function close() {
  closeTimer = setTimeout(() => {
    visible.value = false
  }, 150)
}

function retry() {
  void load()
  void nextTick(() => updatePosition())
}

// Re-measure whenever the popover content height changes (loading -> ready).
watch(status, () => {
  void nextTick(() => updatePosition())
})

watch(() => [props.courseCode, props.semesterId], () => {
  detailRequests.invalidate()
  visible.value = false
  status.value = 'idle'
  course.value = null
})

onUnmounted(() => {
  detailRequests.invalidate()
  if (closeTimer) clearTimeout(closeTimer)
})
</script>

<template>
  <span
    ref="hostRef"
    class="course-info-trigger"
    role="button"
    tabindex="0"
    :aria-label="t('scheduler.details')"
    aria-haspopup="dialog"
    :aria-expanded="visible"
    @mouseenter="open"
    @mouseleave="close"
    @focus="open"
    @blur="close"
    @click.stop
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
  >
    <Icon name="lucide:info" class="course-info-trigger__icon" aria-hidden="true" />
    <Teleport to="body">
      <div
        v-if="visible"
        ref="popoverRef"
        class="course-info-popover"
        role="dialog"
        :style="{ top: `${position.top}px`, left: `${position.left}px` }"
        @mouseenter="open"
        @mouseleave="close"
      >
        <div v-if="status === 'loading'" class="course-info-popover__state" role="status">
          {{ t('scheduler.loading') }}
        </div>

        <div v-else-if="status === 'error'" class="course-info-popover__state course-info-popover__state--error" role="alert">
          <p>{{ t('scheduler.courseDetailLoadFailed') }}</p>
          <button type="button" @click="retry">{{ t('common.retry') }}</button>
        </div>

        <template v-else-if="status === 'ready' && course">
          <div class="course-info-popover__title">{{ course.course_title }}</div>
          <div class="course-info-popover__meta">
            {{ course.course_code }} · <span :style="{ color: creditColorVar(course.credit) }">{{ t('scheduler.credits', { count: course.credit }) }}<template v-if="course.counts_toward_term_load === false"> · {{ t('scheduler.notCountedInTermLoad') }}</template></span>
          </div>
          <p class="course-info-popover__desc">
            {{ course.course_desc || t('scheduler.notAvailable') }}
          </p>
          <dl class="course-info-popover__reqs">
            <template v-if="course.pre_requirement">
              <dt>{{ t('scheduler.prerequisites') }}</dt>
              <dd>{{ course.pre_requirement }}</dd>
            </template>
            <template v-if="course.co_requirement">
              <dt>{{ t('scheduler.corequisites') }}</dt>
              <dd>{{ course.co_requirement }}</dd>
            </template>
            <template v-if="course.exclusion">
              <dt>{{ t('scheduler.exclusions') }}</dt>
              <dd>{{ course.exclusion }}</dd>
            </template>
          </dl>
        </template>
      </div>
    </Teleport>
  </span>
</template>

<style lang="scss" scoped>
.course-info-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.15s;

  &:hover,
  &:focus-visible {
    color: var(--interactive-active);
    outline: none;
  }

  &__icon {
    font-size: 17px;
    line-height: 1;
  }
}

.course-info-popover {
  position: fixed;
  z-index: 1300;
  width: 420px;
  max-width: calc(100vw - 16px);
  max-height: 70vh;
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-large);
  color: var(--text-primary);
  font-size: 0.8rem;

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 80px;
    color: var(--text-secondary);
    text-align: center;

    &--error {
      color: var(--semantic-error);
    }

    button {
      min-height: 32px;
      padding: 0 14px;
      border: 1px solid var(--border-primary);
      border-radius: 999px;
      background: var(--surface-secondary);
      color: var(--text-primary);
      cursor: pointer;
      font-weight: 700;
      font-size: 0.78rem;

      &:hover {
        border-color: var(--interactive-secondary);
      }
    }
  }

  &__title {
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.35;
  }

  &__meta {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 0.78rem;
  }

  &__desc {
    margin: 10px 0 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  &__reqs {
    margin: 8px 0 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;

    dt {
      color: var(--text-primary);
      font-weight: 700;
    }

    dd {
      margin: 0;
      color: var(--text-secondary);
    }
  }
}
</style>
