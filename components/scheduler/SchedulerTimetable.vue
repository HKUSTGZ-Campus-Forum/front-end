<!-- front-end/components/scheduler/SchedulerTimetable.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CartCourse, SchedulerLecture } from '~/utils/scheduler'
import { DAY_NAMES, TIME_SLOTS, getTopOffset, getHeight, getCourseColor } from '~/utils/scheduler'

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

const timeColWidth = 60
const headerHeight = 32
const decorationWidth = 4

const dayColWidth = computed(() => {
  const available = containerWidth.value - timeColWidth - decorationWidth * 2
  return Math.max(80, available / props.maxDayNum)
})

const rowHeight = computed(() => {
  const available = containerHeight.value - headerHeight - decorationWidth * 2
  return Math.max(40, available / 8)
})

interface LectureBlock {
  day: number
  startTime: number
  endTime: number
  room: string
  instructor: string
  courseCode: string
  courseTitle: string
  sectionName: string
  color: string
  isMain: boolean
  credit: number
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
    for (const section of bundle.sections) {
      for (const lecture of section.lectures) {
        blocks.push({
          ...lecture,
          courseCode: course.course_code,
          courseTitle: course.course_title,
          sectionName: section.name,
          color,
          isMain: section.is_main,
          credit: course.credit,
        })
      }
    }
  }
  return blocks
})

function getBlockStyle(block: LectureBlock) {
  const top = headerHeight + decorationWidth + getTopOffset(block.startTime) * rowHeight.value
  const left = timeColWidth + decorationWidth + block.day * dayColWidth.value
  const height = getHeight(block.startTime, block.endTime) * rowHeight.value - 2
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
  <div ref="containerRef" class="timetable">
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
      {{ DAY_NAMES[d - 1] }}
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

    <!-- Lecture blocks -->
    <div
      v-for="(block, i) in lectureBlocks"
      :key="i"
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
          {{ formatTime(block.startTime) }}-{{ formatTime(block.endTime) }}
        </div>
      </template>
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
  border-radius: 12px;
  overflow: hidden;

  &__header {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-primary);
  }

  &__time-label {
    position: absolute;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    padding-top: 2px;
  }

  &__cell {
    position: absolute;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 0, 0, 0.08);
    }

    &--banned {
      background: repeating-linear-gradient(
        45deg,
        rgba(255, 0, 0, 0.12),
        rgba(255, 0, 0, 0.12) 4px,
        transparent 4px,
        transparent 8px
      );
    }
  }

  &__block {
    position: absolute;
    border-radius: 6px;
    padding: 4px 6px;
    overflow: hidden;
    color: white;
    font-size: 0.75rem;
    cursor: default;
    transition: opacity 0.2s;
    z-index: 10;

    &:hover {
      z-index: 20;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
  }
}
</style>
