<!-- front-end/components/scheduler/SchedulerDashboard.vue -->
<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse, CourseDetail } from '~/utils/scheduler'
import { getMaxDayNum, solvePlans } from '~/utils/scheduler'

const props = defineProps<{
  semesterId: string
  initialCourseList: CartCourse[]
  isLoggedIn: boolean
  loading: boolean
}>()

const { t } = useI18n()
const { getCourseDetail } = useScheduler()
const cart = useSchedulerCart(
  props.semesterId,
  toRef(props, 'isLoggedIn'),
  toRef(props, 'initialCourseList'),
)
const courseList = cart.courses
const viewIndex = ref(1)
const bannedPeriods = ref<boolean[][]>(
  Array.from({ length: 7 }, () => Array(8).fill(false))
)
const filterMode = ref(false)
const showCartPanel = ref(false)
const showGuestHint = ref(true)
const selectedCourse = ref<CourseDetail | null>(null)
const showCourseDetail = ref(false)
const cartError = ref('')
const displayOptions = ref({
  name: true,
  section: true,
  location: true,
  instructor: false,
  duration: false,
})

const solverResult = computed(() => solvePlans(courseList.value, bannedPeriods.value))
const planList = computed(() => solverResult.value.status === 'ok' ? solverResult.value.plans : [])

const currentPlan = computed(() => {
  const plan = planList.value[viewIndex.value - 1]
  return plan || []
})

const maxDayNum = computed(() => getMaxDayNum(courseList.value, currentPlan.value))

const planMessage = computed(() => {
  if (solverResult.value.status === 'empty-cart') return t('scheduler.emptyCartHint')
  if (solverResult.value.status === 'all-disabled') return t('scheduler.allDisabled')
  if (solverResult.value.status === 'unavailable-layer') {
    return t('scheduler.unavailableLayer', {
      course: solverResult.value.courseCode,
      layer: solverResult.value.layer,
    })
  }
  if (solverResult.value.status === 'no-solution') return t('scheduler.noSolution')
  return null
})

// Reset viewIndex when plans change
watch(planList, (plans) => {
  if (viewIndex.value > plans.length) {
    viewIndex.value = Math.max(1, plans.length)
  }
})

async function handleShowInfo(code: string) {
  selectedCourse.value = await getCourseDetail(code, props.semesterId)
  showCourseDetail.value = true
}

async function handleCartAction(action: () => Promise<void>) {
  cartError.value = ''
  try {
    await action()
  } catch {
    cartError.value = t('scheduler.cartFailed')
  }
}

function toggleBan(day: number, period: number) {
  bannedPeriods.value[day][period] = !bannedPeriods.value[day][period]
}
</script>

<template>
  <div class="dashboard">
    <!-- Login banner -->
    <div v-if="!isLoggedIn && showGuestHint" class="dashboard__banner">
      {{ t('scheduler.guestHint') }}
      <button type="button" :aria-label="t('scheduler.close')" @click="showGuestHint = false">&times;</button>
    </div>

    <!-- Error overlay -->
    <div v-if="cartError || planMessage" class="dashboard__message">
      {{ cartError || planMessage }}
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
          <div v-else class="dashboard__loading">{{ t('scheduler.loading') }}</div>
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
          :display-options="displayOptions"
          @toggle-course="(code, enabled) => handleCartAction(() => cart.toggleCourse(code, enabled))"
          @toggle-bundle="(code, bundleId, layer, enabled) => handleCartAction(() => cart.toggleBundle(code, bundleId, layer, enabled))"
          @toggle-layer="(code, layer, enabled) => handleCartAction(() => cart.toggleLayer(code, layer, enabled))"
          @show-info="handleShowInfo"
          @open-cart="showCartPanel = true"
          @toggle-filter="filterMode = !filterMode"
          @update:display-option="(key, value) => displayOptions[key] = value"
        />
      </div>
    </div>

    <!-- Cart Panel Modal -->
    <SchedulerCartPanel
      :semester-id="semesterId"
      :course-list="courseList"
      :visible="showCartPanel"
      @close="showCartPanel = false"
      @add="(code) => handleCartAction(() => cart.add(code))"
      @remove="(code) => handleCartAction(() => cart.remove(code))"
    />

    <SchedulerCourseDetail
      :visible="showCourseDetail"
      :course="selectedCourse"
      @close="showCourseDetail = false"
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0.5rem 1rem;
    background: color-mix(in srgb, var(--semantic-warning) 18%, var(--surface-primary));
    color: var(--text-primary);
    font-size: 0.85rem;
    text-align: center;

    button {
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
    }
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
