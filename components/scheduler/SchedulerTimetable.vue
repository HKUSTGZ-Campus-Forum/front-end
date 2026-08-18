<!-- front-end/components/scheduler/SchedulerTimetable.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse } from '~/utils/scheduler'
import {
  TIME_SLOTS,
  getCourseTimetableColors,
  getHeight,
  getTopOffset,
} from '~/utils/scheduler'

const props = defineProps<{
  courseList: CartCourse[]
  currentPlan: { courseIndex: number; bundleId: number; layer: number }[]
  bannedPeriods: boolean[][]
  filterMode: boolean
  displayOptions: { name: boolean; section: boolean; location: boolean; instructor: boolean; duration: boolean }
  maxDayNum: number
}>()

const emit = defineEmits<{
  (e: 'toggle-ban', day: number, period: number): void
}>()
const { t } = useI18n()
const { isDarkTheme } = useTheme()
const dayNames = computed(() => [
  t('scheduler.days.mon'),
  t('scheduler.days.tue'),
  t('scheduler.days.wed'),
  t('scheduler.days.thu'),
  t('scheduler.days.fri'),
  t('scheduler.days.sat'),
  t('scheduler.days.sun'),
])

const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(800)
const containerHeight = ref(600)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        containerHeight.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

const timeColWidth = 52
const headerHeight = 36
// Grid lines start exactly at the time-column and header boundaries so there
// is no offset seam that would render a doubled line at the first row/column.

const dayColWidth = computed(() => {
  const available = containerWidth.value - timeColWidth
  const minWidth = containerWidth.value < 560 ? 52 : 86
  return Math.max(minWidth, available / props.maxDayNum)
})

const rowHeight = computed(() => {
  // Mirror the original planner: 8 rows fill (container - header - a small
  // 20px bottom strip), so the trailing 21:00 label sits on the bottom grid
  // line instead of leaving a large empty gap below it.
  const available = containerHeight.value - headerHeight
  return Math.max(40, (available - 20) / 8)
})

// Grid lines live on a dedicated layer that starts exactly at the time-column
// and header boundaries. Because CSS background-repeat tiles both directions,
// keeping the layer inset this way guarantees no line bleeds into the
// time-label column.
const timetableGridStyle = computed(() => ({
  top: `${headerHeight}px`,
  left: `${timeColWidth}px`,
  backgroundSize: `${dayColWidth.value}px ${rowHeight.value}px`,
  backgroundPosition: '0 0',
}))

// Wide columns inline the section label next to the course code (original:
// colWidth > 150). Narrow columns show it as its own icon row instead.
const wideSection = computed(() => dayColWidth.value > 150)

// Nine labels aligned to the nine horizontal grid lines (8 rows + bottom edge).
const timeLabels = computed(() => [
  ...TIME_SLOTS.map(slot => slot.label),
  formatTime(TIME_SLOTS[TIME_SLOTS.length - 1].end),
])

interface LectureBlock {
  day: number
  start_time: number
  end_time: number
  room: string
  instructor: string
  courseCode: string
  courseTitle: string
  sectionId: string
  sectionName: string
  backgroundColor: string
  textColor: string
  accentColor: string
  isMain: boolean
  credit: number
  key: string
}

const lectureBlocks = computed(() => {
  const blocks: LectureBlock[] = []
  for (const selection of props.currentPlan) {
    const course = props.courseList[selection.courseIndex]
    if (!course) continue
    const bundles = course.layers[selection.layer]
    if (!bundles) continue
    const bundle = bundles.find(b => b.id === selection.bundleId)
    if (!bundle) continue
    const colors = getCourseTimetableColors(selection.courseIndex, isDarkTheme.value)
    for (const section of bundle.sections) {
      for (const lecture of section.lectures) {
        blocks.push({
          ...lecture,
          courseCode: course.course_code,
          courseTitle: course.course_title,
          sectionId: section.section_id,
          sectionName: section.name,
          backgroundColor: colors.background,
          textColor: colors.text,
          accentColor: colors.accent,
          isMain: section.is_main,
          credit: course.credit,
          key: `${course.course_code}-${section.section_id}-${lecture.day}-${lecture.start_time}-${section.is_main ? 'main' : 'sub'}`,
        })
      }
    }
  }
  return blocks
})

// Hover expansion: measure the natural content height and grow the block.
const hoveredKey = ref<string | null>(null)
const expandedHeights = ref<Record<string, number>>({})
const blockContentRefs = new Map<string, HTMLElement>()

function setBlockRef(key: string, el: unknown) {
  if (el instanceof HTMLElement) blockContentRefs.set(key, el)
  else blockContentRefs.delete(key)
}

// Hover ring: a bright outline in dark mode, a subtle gray ring in light mode
// (mirrors the original planner's outline + elevated shadow).
const blockOutlineColor = computed(() =>
  isDarkTheme.value
    ? 'color-mix(in srgb, var(--text-primary) 90%, transparent)'
    : 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
)

// Measure every block's natural content height up front so the bottom fade
// cue and the hover expansion work even before the user's first hover.
// Track each display option key individually: the options object itself is
// mutated in place by the dashboard, so watching the object reference would
// never re-fire and the hover-expanded height would go stale after toggling
// items in the side-panel menu.
watch(
  () => [
    lectureBlocks.value,
    rowHeight.value,
    dayColWidth.value,
    props.displayOptions.name,
    props.displayOptions.section,
    props.displayOptions.location,
    props.displayOptions.instructor,
    props.displayOptions.duration,
  ],
  () => {
    void nextTick(() => {
      const heights: Record<string, number> = {}
      blockContentRefs.forEach((el, key) => {
        heights[key] = el.scrollHeight
      })
      expandedHeights.value = heights
    })
  },
  { immediate: true, flush: 'post' },
)

function onBlockEnter(key: string) {
  hoveredKey.value = key
}

function onBlockLeave() {
  hoveredKey.value = null
}

function blockBaseHeight(block: LectureBlock): number {
  return getHeight(block.start_time, block.end_time) * rowHeight.value - 2
}

// Content taller than the block's slot needs the bottom fade cue.
function blockOverflows(block: LectureBlock): boolean {
  const contentHeight = expandedHeights.value[block.key]
  if (!contentHeight) return false
  return contentHeight + 6 > blockBaseHeight(block)
}

function getBlockStyle(block: LectureBlock) {
  // +1px nudge mirrors the original planner's `top + 1`: the card sits just
  // below the 2px horizontal grid line instead of covering it.
  const top = headerHeight + getTopOffset(block.start_time) * rowHeight.value + 3
  // Grid lines are 2px wide at each day-column boundary; inset the card 3px
  // from the column start so it sits centered with a symmetric 1px gap on
  // both sides (mirrors the original planner's `left + 3`, `colWidth - 4`).
  const left = timeColWidth + (block.day - 1) * dayColWidth.value + 3
  const baseHeight = blockBaseHeight(block)
  const isHovered = hoveredKey.value === block.key
  const contentHeight = expandedHeights.value[block.key]
  // Keep the block at least as tall as its slot so short cards never shrink
  // on hover; only grow when the content actually needs more room.
  const height = isHovered && contentHeight
    ? Math.max(baseHeight, contentHeight + 12)
    : baseHeight
  return {
    top: `${top}px`,
    left: `${left}px`,
    height: `${height}px`,
    width: `${dayColWidth.value - 4}px`,
    backgroundColor: block.backgroundColor,
    opacity: isHovered ? 1 : (block.isMain ? 1 : 0.7),
    // Small downward nudge on hover for interactive feedback (original: y: 4).
    transform: isHovered ? 'translateY(4px)' : 'translateY(0)',
    // Hover: highlight ring + elevation shadow. Resting: subtle base shadow.
    boxShadow: isHovered
      ? `0 0 0 2px ${blockOutlineColor.value}, var(--shadow-large)`
      : 'var(--shadow-small)',
  }
}

// Soft bottom fade: starts from a semi-transparent tint of the card color so
// the text underneath stays readable while still hinting there is more.
function getFadeStyle(block: LectureBlock) {
  const tint = `color-mix(in srgb, ${block.backgroundColor} 55%, transparent)`
  return {
    background: `linear-gradient(to top, ${tint}, transparent)`,
  }
}

// Original planner format: hours are not zero-padded (9:00), minutes are.
function formatTime(time: number): string {
  const h = Math.floor(time / 100)
  const m = time % 100
  return `${h}:${String(m).padStart(2, '0')}`
}

function isBanned(day: number, period: number): boolean {
  return props.bannedPeriods[day]?.[period] ?? false
}

// Ban cells are always rendered so blocked periods stay visible after leaving
// edit mode; only edit mode makes them clickable (the readonly overlay passes
// pointer events through so lecture hover still works).
function onCellClick(day: number, period: number) {
  if (!props.filterMode) return
  emit('toggle-ban', day, period)
}
</script>

<template>
  <div ref="containerRef" class="timetable">
    <!-- Grid lines layer: inset to the day-column area only -->
    <div class="timetable__grid" :style="timetableGridStyle" />

    <!-- Day headers -->
    <div
      v-for="d in maxDayNum"
      :key="d"
      class="timetable__header"
      :style="{
        top: '0',
        left: `${timeColWidth + (d - 1) * dayColWidth}px`,
        width: `${dayColWidth}px`,
        height: `${headerHeight}px`,
      }"
    >
      {{ dayNames[d - 1] }}
    </div>

    <!-- Time labels: center-aligned to the horizontal grid lines -->
    <div
      v-for="(label, i) in timeLabels"
      :key="`${label}-${i}`"
      class="timetable__time-label"
      :style="{
        top: `${headerHeight + i * rowHeight - rowHeight / 2}px`,
        width: `${timeColWidth}px`,
        height: `${rowHeight}px`,
      }"
    >
      {{ label }}
    </div>

    <!-- Banned period overlays. Always rendered so blocked periods stay
         visible after leaving edit mode; in edit mode they are clickable and
         show hover hint icons, otherwise they are read-only markers. -->
    <div v-for="d in maxDayNum" :key="`col-${d}`">
      <div
        v-for="p in 8"
        :key="`${d}-${p}`"
        class="timetable__cell"
        :class="{
          'timetable__cell--banned': isBanned(d - 1, p - 1),
          'timetable__cell--readonly': !filterMode,
        }"
        :style="{
          left: `${timeColWidth + (d - 1) * dayColWidth}px`,
          top: `${headerHeight + (p - 1) * rowHeight}px`,
          width: `${dayColWidth}px`,
          height: `${rowHeight}px`,
        }"
        @click="onCellClick(d - 1, p - 1)"
      >
        <!-- Hover hint icons (mirrors the original planner: X to block,
             rotate-ccw to restore), shown only in edit mode. aria-hidden:
             the cell itself is the interactive element and has no text. -->
        <Icon
          v-if="filterMode && !isBanned(d - 1, p - 1)"
          name="lucide:x"
          class="timetable__cell-icon timetable__cell-icon--ban"
          aria-hidden="true"
        />
        <Icon
          v-else-if="filterMode"
          name="lucide:rotate-ccw"
          class="timetable__cell-icon timetable__cell-icon--unban"
          aria-hidden="true"
        />
      </div>
    </div>

    <!-- Lecture blocks -->
    <div
      v-for="(block, i) in lectureBlocks"
      :key="`${block.key}-${i}`"
      class="timetable__block"
      :class="{ 'timetable__block--expanded': hoveredKey === block.key }"
      :style="getBlockStyle(block)"
      @mouseenter="onBlockEnter(block.key)"
      @mouseleave="onBlockLeave"
    >
      <div :ref="(el) => setBlockRef(block.key, el)" class="timetable__block-content">
        <!-- Top row: course code, section inline on wide columns (original) -->
        <div class="timetable__block-top">
          <span class="timetable__block-code" :style="{ color: block.textColor }">{{ block.courseCode }}</span>
          <span
            v-if="displayOptions.section && wideSection"
            class="timetable__block-code-section"
            :style="{ color: block.accentColor }"
          >
            &nbsp;· {{ block.sectionName }} ({{ block.sectionId }})
          </span>
        </div>

        <div
          v-if="displayOptions.name"
          class="timetable__block-title"
          :style="{ color: block.textColor }"
        >
          {{ block.courseTitle }}
        </div>

        <!-- Section as its own row on narrow columns (original) -->
        <div
          v-if="displayOptions.section && !wideSection"
          class="timetable__block-detail"
          :style="{ color: block.textColor }"
        >
          <Icon name="lucide:list" class="timetable__block-icon" />
          <span>{{ block.sectionName }} ({{ block.sectionId }})</span>
        </div>
        <div
          v-if="displayOptions.location"
          class="timetable__block-detail"
          :style="{ color: block.textColor }"
        >
          <Icon name="lucide:map-pin" class="timetable__block-icon" />
          <span>{{ block.room }}</span>
        </div>
        <div
          v-if="displayOptions.instructor"
          class="timetable__block-detail"
          :style="{ color: block.textColor }"
        >
          <Icon name="lucide:user" class="timetable__block-icon" />
          <span>{{ block.instructor }}</span>
        </div>
        <div
          v-if="displayOptions.duration"
          class="timetable__block-detail"
          :style="{ color: block.textColor }"
        >
          <Icon name="lucide:clock" class="timetable__block-icon" />
          <span>{{ formatTime(block.start_time) }} - {{ formatTime(block.end_time) }}</span>
        </div>
      </div>
      <!-- Bottom fade cue: hints there is more content once hovered -->
      <div
        v-if="hoveredKey !== block.key && blockOverflows(block)"
        class="timetable__block-fade"
        :style="getFadeStyle(block)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.timetable {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: transparent;
  overflow: hidden;

  /* Inset grid layer: vertical/horizontal lines are drawn at the top and left
     edge of every tiled cell, starting at (timeColWidth, headerHeight). The
     layer never covers the time-label column, so no line can cross it. */
  &__grid {
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, var(--timetable-grid) 0 2px, transparent 2px),
      linear-gradient(to bottom, var(--timetable-grid) 0 2px, transparent 2px);
  }

  &__header {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--timetable-header-text);
    background: var(--timetable-header-bg);
    border-left: 2px solid var(--timetable-grid);
  }

  &__time-label {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: var(--timetable-header-text);
  }

  &__cell {
    position: absolute;
    z-index: 30;
    cursor: pointer;
    transition: background 0.15s;

    &:not(.timetable__cell--readonly):hover {
      background: color-mix(in srgb, var(--semantic-error) 13%, transparent);
    }

    /* Outside edit mode the ban markers are read-only: no pointer cursor and
       clicks/hover pass through so lecture blocks below stay interactive. */
    &--readonly {
      cursor: default;
      pointer-events: none;
    }

    &--banned {
      /* 白色斜纹刻意保留：叠加在错误色混合底上的警示纹理，
         在浅/深两种主题下均保持可见，不随主题变化 */
      background:
        repeating-linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.22) 0 6px,
          transparent 6px 12px
        ),
        color-mix(in srgb, var(--semantic-error) 24%, var(--surface-primary));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--semantic-error) 38%, transparent);

      &:not(.timetable__cell--readonly):hover {
        background:
          repeating-linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.28) 0 6px,
            transparent 6px 12px
          ),
          color-mix(in srgb, var(--semantic-error) 30%, var(--surface-primary));
      }
    }

    &-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 17px;
      line-height: 1;
      opacity: 0;
      transition: opacity 0.15s;
      pointer-events: none;

      &--ban {
        color: var(--semantic-error);
      }

      &--unban {
        color: var(--timetable-ban-icon);
        font-size: 21px;
        opacity: 0;
      }
    }

    &:hover &-icon--ban {
      opacity: 0.7;
    }

    &--banned:hover &-icon--unban {
      opacity: 0.9;
    }
  }

  &__block {
    position: absolute;
    border-radius: 6px;
    padding: 6px 10px;
    overflow: hidden;
    cursor: default;
    transition: height 0.25s ease, opacity 0.2s, box-shadow 0.2s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 10;

    &--expanded {
      z-index: 25;
      overflow: visible;
    }

    &-content {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 4px; /* original: gap-1 */
    }

    /* Gradient fade at the bottom of overflowing cards, removed on hover when
       the full content is revealed. Short and semi-transparent so it hints at
       more content without hiding the text underneath. */
    &-fade {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 10px;
      pointer-events: none;
    }

    &-top {
      display: flex;
      align-items: baseline;
      gap: 2px;
      flex-shrink: 0; /* original: top row always visible, never compressed */
    }

    &-code {
      font-weight: 500; /* original: font-medium */
      font-size: 0.875rem; /* original: text-sm */
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    &-code-section {
      font-weight: 500;
      font-size: 0.875rem;
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    &-title {
      font-size: 0.75rem; /* original: text-xs */
      margin-bottom: 4px; /* original: mb-1 */
      line-height: 1.4;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    &-detail {
      display: flex;
      align-items: flex-start;
      gap: 8px; /* original: gap-2 */
      opacity: 0.7; /* original: opacity-70 */
      font-size: 0.75rem; /* original: text-xs */

      > span {
        min-width: 0;
        line-height: 1.4;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    }

    &-icon {
      flex-shrink: 0;
      font-size: 16px; /* original: size-4 (Icon renders at 1em) */
      line-height: 1;
      margin-top: 1px; /* visual alignment with text-xs rows */
    }
  }
}

@media (max-width: 768px) {
  .timetable {
    min-height: 460px;

    &__header {
      font-size: 0.74rem;
    }

    &__time-label {
      font-size: 0.7rem;
    }

    &__block {
      padding: 3px 6px;

      &-code {
        font-size: 0.78rem;
      }
    }
  }
}
</style>
