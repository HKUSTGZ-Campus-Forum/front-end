<!-- front-end/components/scheduler/SchedulerSidePanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CartCourse } from '~/utils/scheduler'

const props = defineProps<{
  courseList: CartCourse[]
  currentPlan: { courseIndex: number; bundleId: number; layer: number }[]
}>()

const emit = defineEmits<{
  (e: 'toggle-course', code: string, enabled: boolean): void
  (e: 'toggle-bundle', code: string, bundleId: number, layer: number, enabled: boolean): void
  (e: 'toggle-layer', code: string, layer: number, enabled: boolean): void
  (e: 'show-info', code: string): void
  (e: 'open-cart'): void
  (e: 'toggle-filter'): void
}>()

const activeTab = ref<'main' | 'klms'>('main')

const filteredCourses = computed(() => {
  if (activeTab.value === 'klms') return props.courseList.filter(c => c.klms_course)
  return props.courseList.filter(c => !c.klms_course)
})

const currentSelectionMap = computed(() => {
  const map: Record<string, { bundleId: number; layer: number }> = {}
  for (const sel of props.currentPlan) {
    const course = props.courseList[sel.courseIndex]
    if (course) map[course.course_code] = { bundleId: sel.bundleId, layer: sel.layer }
  }
  return map
})

const totalCredits = computed(() =>
  props.courseList.filter(c => c.enabled).reduce((sum, c) => sum + c.credit, 0)
)
</script>

<template>
  <div class="side-panel">
    <div class="side-panel__header">
      <div class="side-panel__tabs">
        <button :class="{ active: activeTab === 'main' }" @click="activeTab = 'main'">Main</button>
        <button :class="{ active: activeTab === 'klms' }" @click="activeTab = 'klms'">KLMS</button>
      </div>
      <div class="side-panel__credits">{{ totalCredits }} credits</div>
    </div>

    <div class="side-panel__list">
      <SchedulerCourseCard
        v-for="(course, i) in filteredCourses"
        :key="course.course_code"
        :course="course"
        :course-index="courseList.indexOf(course)"
        :current-selection="currentSelectionMap[course.course_code]"
        @toggle-course="(...args) => emit('toggle-course', ...args)"
        @toggle-bundle="(...args) => emit('toggle-bundle', ...args)"
        @toggle-layer="(...args) => emit('toggle-layer', ...args)"
        @show-info="(...args) => emit('show-info', ...args)"
      />
      <div v-if="filteredCourses.length === 0" class="side-panel__empty">No courses in cart</div>
    </div>

    <div class="side-panel__actions">
      <button class="side-panel__btn" @click="emit('toggle-filter')">Filter</button>
      <button class="side-panel__btn side-panel__btn--primary" @click="emit('open-cart')">Cart</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-secondary);
  border-left: 1px solid var(--border-primary);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-primary);
  }

  &__tabs {
    display: flex;
    gap: 0.25rem;
    button {
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 0.8rem;
      color: var(--text-secondary);
      &.active { background: var(--surface-primary); color: var(--text-primary); font-weight: 600; }
    }
  }

  &__credits { font-size: 0.8rem; color: var(--text-secondary); }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  &__empty {
    text-align: center;
    color: var(--text-tertiary);
    padding: 2rem;
    font-size: 0.85rem;
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--border-primary);
  }

  &__btn {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    background: var(--surface-primary);
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-primary);
    transition: background 0.15s;
    &:hover { background: var(--surface-secondary); }

    &--primary {
      background: rgba(38, 164, 255, 0.15);
      border-color: rgba(38, 164, 255, 0.4);
      color: #2563eb;
      &:hover { background: rgba(38, 164, 255, 0.25); }
    }
  }
}
</style>
