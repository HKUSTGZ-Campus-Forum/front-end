<!-- front-end/components/scheduler/SchedulerTimetable.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  CartCourse,
  SchedulerPopularityByCourse,
  SchedulerPopularityCounts,
} from '~/utils/scheduler'
import {
  TIME_SLOTS,
  getCourseColor,
  getHeight,
  getSchedulerCoursePopularity,
  getTopOffset,
} from '~/utils/scheduler'

const props = defineProps<{
  courseList: CartCourse[]
  currentPlan: { courseIndex: number; bundleId: number; layer: number }[]
  bannedPeriods: boolean[][]
  filterMode: boolean
  displayOptions: { name: boolean; section: boolean; location: boolean; instructor: boolean; duration: boolean }
  maxDayNum: number
  popularityByCourse: SchedulerPopularityByCourse
  showPopularity: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-ban', day: number, period: number): void
}>()
const { t } = useI18n()
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
const decorationWidth = 4

const dayColWidth = computed(() => {
  const available = containerWidth.value - timeColWidth - decorationWidth * 2
  const minWidth = containerWidth.value < 560 ? 52 : 86
  return Math.max(minWidth, available / props.maxDayNum)
})

const rowHeight = computed(() => {
  const available = containerHeight.value - headerHeight - decorationWidth * 2
  return Math.max(46, available / 8)
})

const timetableGridStyle = computed(() => ({
  backgroundSize: `${dayColWidth.value}px ${rowHeight.value}px`,
  backgroundPosition: `${timeColWidth + decorationWidth}px ${headerHeight + decorationWidth}px`,
}))

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
  color: string
  isMain: boolean
  credit: number
  popularity?: SchedulerPopularityCounts
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
    const color = getCourseColor(selection.courseIndex)
    const coursePopularity = getSchedulerCoursePopularity(
      props.popularityByCourse,
      course.course_code,
    )
    for (const section of bundle.sections) {
      for (const lecture of section.lectures) {
        blocks.push({
          ...lecture,
          courseCode: course.course_code,
          courseTitle: course.course_title,
          sectionId: section.section_id,
          sectionName: section.name,
          color,
          isMain: section.is_main,
          credit: course.credit,
          popularity: coursePopularity?.sections[section.section_id],
        })
      }
    }
  }
  return blocks
})

const showEmptyState = computed(() => lectureBlocks.value.length === 0 && !props.filterMode)

function getBlockStyle(block: LectureBlock) {
  const top = headerHeight + decorationWidth + getTopOffset(block.start_time) * rowHeight.value
  const left = timeColWidth + decorationWidth + (block.day - 1) * dayColWidth.value
  const height = getHeight(block.start_time, block.end_time) * rowHeight.value - 2
  const width = dayColWidth.value - 2
  return {
    top: `${top}px`,
    left: `${left}px`,
    height: `${height}px`,
    width: `${width}px`,
    backgroundColor: block.color,
    opacity: block.isMain ? 1 : 0.7,
  }
}

function formatTime(time: number): string {
  const h = Math.floor(time / 100)
  const m = time % 100
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isBanned(day: number, period: number): boolean {
  return props.bannedPeriods[day]?.[period] ?? false
}
</script>

<template>
  <div ref="containerRef" class="timetable" :style="timetableGridStyle">
    <!-- Day headers -->
    <div
      v-for="d in maxDayNum"
      :key="d"
      class="timetable__header"
      :style="{
        left: `${timeColWidth + decorationWidth + (d - 1) * dayColWidth}px`,
        width: `${dayColWidth}px`,
        height: `${headerHeight}px`,
      }"
    >
      {{ dayNames[d - 1] }}
    </div>

    <!-- Time labels -->
    <div
      v-for="(slot, i) in TIME_SLOTS"
      :key="i"
      class="timetable__time-label"
      :style="{
        top: `${headerHeight + decorationWidth + i * rowHeight}px`,
        width: `${timeColWidth}px`,
        height: `${rowHeight}px`,
      }"
    >
      {{ slot.label }}
    </div>

    <!-- Banned period overlays -->
    <template v-if="filterMode">
      <div v-for="d in maxDayNum" :key="`col-${d}`">
        <div
          v-for="p in 8"
          :key="`${d}-${p}`"
          class="timetable__cell"
          :class="{ 'timetable__cell--banned': isBanned(d - 1, p - 1) }"
          :style="{
            left: `${timeColWidth + decorationWidth + (d - 1) * dayColWidth}px`,
            top: `${headerHeight + decorationWidth + (p - 1) * rowHeight}px`,
            width: `${dayColWidth}px`,
            height: `${rowHeight}px`,
          }"
          @click="emit('toggle-ban', d - 1, p - 1)"
        />
      </div>
    </template>

    <div v-if="showEmptyState" class="timetable__empty">
      <div class="timetable__empty-title">{{ t('scheduler.emptyTimetableTitle') }}</div>
      <p>{{ t('scheduler.emptyTimetableDescription') }}</p>
    </div>

    <!-- Lecture blocks -->
    <div
      v-for="(block, i) in lectureBlocks"
      :key="`${block.courseCode}-${block.sectionId}-${block.day}-${block.start_time}-${i}`"
      class="timetable__block"
      :style="getBlockStyle(block)"
    >
      <div class="timetable__block-code">{{ block.courseCode }}</div>
      <template v-if="rowHeight > 50">
        <div v-if="displayOptions.name" class="timetable__block-title">{{ block.courseTitle }}</div>
        <div v-if="displayOptions.section" class="timetable__block-section">{{ block.sectionName }}</div>
        <div v-if="displayOptions.location" class="timetable__block-room">{{ block.room }}</div>
        <div v-if="displayOptions.instructor" class="timetable__block-instructor">{{ block.instructor }}</div>
        <div v-if="displayOptions.duration" class="timetable__block-time">
          {{ formatTime(block.start_time) }}-{{ formatTime(block.end_time) }}
        </div>
      </template>
      <SchedulerPopularityBadge
        v-if="showPopularity && block.popularity"
        class="timetable__block-popularity"
        :counts="block.popularity"
        compact
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
  background: var(--surface-primary);
  background-image:
    linear-gradient(to right, transparent calc(100% - 1px), var(--border-secondary) calc(100% - 1px)),
    linear-gradient(to bottom, transparent calc(100% - 1px), var(--border-secondary) calc(100% - 1px));
  border: 1px solid var(--border-secondary);
  border-radius: 12px 12px 0 0;
  overflow: hidden;

  &__header {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--surface-secondary) 72%, var(--surface-primary));
    border-bottom: 1px solid var(--border-secondary);
  }

  &__time-label {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: var(--text-secondary);
    border-right: 1px solid var(--border-secondary);
  }

  &__cell {
    position: absolute;
    z-index: 30;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: color-mix(in srgb, var(--semantic-error) 8%, transparent);
    }

    &--banned {
      background: color-mix(in srgb, var(--semantic-error) 14%, var(--surface-primary));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--semantic-error) 24%, transparent);
    }
  }

  &__empty {
    position: absolute;
    inset: 76px 28px 28px 84px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--text-secondary);
    pointer-events: none;
  }

  &__empty-title {
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 700;
  }

  &__empty p {
    max-width: 360px;
    margin: 8px 0 0;
    font-size: 0.86rem;
    line-height: 1.6;
  }

  &__block {
    position: absolute;
    border-radius: 8px;
    padding: 6px 8px;
    overflow: hidden;
    color: white;
    font-size: 0.75rem;
    cursor: default;
    border: 1px solid rgba(255, 255, 255, 0.32);
    box-shadow: 0 2px 6px rgba(26, 42, 74, 0.14);
    transition: opacity 0.2s, box-shadow 0.2s, transform 0.2s;
    z-index: 10;

    &:hover {
      z-index: 20;
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(26, 42, 74, 0.22);
    }

    &-code {
      font-weight: 700;
      font-size: 0.8rem;
    }

    &-title {
      font-size: 0.7rem;
      opacity: 0.9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &-section, &-room, &-instructor, &-time {
      font-size: 0.65rem;
      opacity: 0.8;
    }

    &-popularity {
      margin-top: 4px;
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

    &__empty {
      inset: 72px 16px 22px 64px;
    }

    &__block {
      padding: 5px 6px;
      font-size: 0.7rem;

      &-code {
        font-size: 0.72rem;
      }
    }
  }
}
</style>
