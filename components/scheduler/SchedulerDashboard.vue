<!-- front-end/components/scheduler/SchedulerDashboard.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CartCourse } from '~/utils/scheduler'
import { solvePlans } from '~/utils/scheduler'

const props = defineProps<{
  semesterId: string
  initialCourseList: CartCourse[]
  isLoggedIn: boolean
  loading: boolean
}>()

const { addToCart, removeFromCart, toggleCourse, toggleBundle, toggleLayer, getCart } = useScheduler()

const courseList = ref<CartCourse[]>([...props.initialCourseList])
const viewIndex = ref(1)
const bannedPeriods = ref<boolean[][]>(
  Array.from({ length: 7 }, () => Array(8).fill(false))
)
const filterMode = ref(false)
const showCartPanel = ref(false)
const displayOptions = ref({
  name: true,
  section: true,
  location: true,
  instructor: false,
  duration: false,
})

const maxDayNum = computed(() => {
  let hasWeekend = false
  for (const plan of planList.value[viewIndex.value - 1] || []) {
    const course = courseList.value[plan.courseIndex]
    if (!course) continue
    const bundles = course.layers[plan.layer]
    if (!bundles) continue
    const bundle = bundles.find(b => b.id === plan.bundleId)
    if (!bundle) continue
    for (const section of bundle.sections) {
      for (const lecture of section.lectures) {
        if (lecture.day >= 5) hasWeekend = true
      }
    }
  }
  return hasWeekend ? 7 : 5
})

const planList = computed(() => solvePlans(courseList.value, bannedPeriods.value))

const currentPlan = computed(() => {
  const plan = planList.value[viewIndex.value - 1]
  return plan || []
})

const planMessage = computed(() => {
  if (courseList.value.length === 0) return 'Cart is empty'
  if (courseList.value.filter(c => c.enabled).length === 0) return 'Enable at least one course'
  if (planList.value.length === 0) return 'No valid schedule found'
  return null
})

// Reset viewIndex when plans change
watch(planList, (plans) => {
  if (viewIndex.value > plans.length) {
    viewIndex.value = Math.max(1, plans.length)
  }
})

async function handleRefresh() {
  courseList.value = await getCart(props.semesterId)
}

async function handleAddCourse(code: string) {
  await addToCart(props.semesterId, code)
}

async function handleRemoveCourse(code: string) {
  await removeFromCart(props.semesterId, code)
}

async function handleToggleCourse(code: string, enabled: boolean) {
  await toggleCourse(props.semesterId, code, enabled)
  const course = courseList.value.find(c => c.course_code === code)
  if (course) course.enabled = enabled
}

async function handleToggleBundle(code: string, bundleId: number, layer: number, enabled: boolean) {
  await toggleBundle(props.semesterId, code, bundleId, layer, enabled)
  const course = courseList.value.find(c => c.course_code === code)
  if (course?.layers[layer]) {
    const bundle = course.layers[layer].find(b => b.id === bundleId)
    if (bundle) bundle.enabled = enabled
  }
}

async function handleToggleLayer(code: string, layer: number, enabled: boolean) {
  await toggleLayer(props.semesterId, code, layer, enabled)
  const course = courseList.value.find(c => c.course_code === code)
  if (course?.layers[layer]) {
    for (const bundle of course.layers[layer]) {
      bundle.enabled = enabled
    }
  }
}

function toggleBan(day: number, period: number) {
  bannedPeriods.value[day][period] = !bannedPeriods.value[day][period]
}
</script>

<template>
  <div class="dashboard">
    <!-- Login banner -->
    <div v-if="!isLoggedIn" class="dashboard__banner">
      Log in to save your cart
    </div>

    <!-- Error overlay -->
    <div v-if="planMessage" class="dashboard__message">
      {{ planMessage }}
    </div>

    <div class="dashboard__body">
      <!-- Left: Timetable + BottomPanel -->
      <div class="dashboard__left">
        <div class="dashboard__timetable">
          <SchedulerTimetable
            v-if="!loading"
            :course-list="courseList"
            :current-plan="currentPlan"
            :banned-periods="bannedPeriods"
            :filter-mode="filterMode"
            :display-options="displayOptions"
            :max-day-num="maxDayNum"
            @toggle-ban="toggleBan"
          />
          <div v-else class="dashboard__loading">Loading...</div>
        </div>
        <SchedulerBottomPanel
          :current-index="viewIndex"
          :total-plans="planList.length"
          @update:index="viewIndex = $event"
        />
      </div>

      <!-- Right: SidePanel -->
      <div class="dashboard__right">
        <SchedulerSidePanel
          :course-list="courseList"
          :current-plan="currentPlan"
          @toggle-course="handleToggleCourse"
          @toggle-bundle="handleToggleBundle"
          @toggle-layer="handleToggleLayer"
          @open-cart="showCartPanel = true"
          @toggle-filter="filterMode = !filterMode"
        />
      </div>
    </div>

    <!-- Cart Panel Modal -->
    <SchedulerCartPanel
      :semester-id="semesterId"
      :course-list="courseList"
      :visible="showCartPanel"
      @close="showCartPanel = false"
      @add="handleAddCourse"
      @remove="handleRemoveCourse"
      @refresh="handleRefresh"
    />
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__banner {
    padding: 0.5rem 1rem;
    background: #fef3c7;
    color: #92400e;
    font-size: 0.85rem;
    text-align: center;
  }

  &__message {
    padding: 0.5rem 1rem;
    background: var(--surface-secondary);
    color: var(--text-secondary);
    font-size: 0.85rem;
    text-align: center;
  }

  &__body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  &__left {
    flex: 7;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__timetable {
    flex: 1;
    overflow: hidden;
    padding: 0.5rem;
  }

  &__right {
    flex: 3;
    min-width: 280px;
    max-width: 380px;
    overflow: hidden;
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-tertiary);
  }
}
</style>
