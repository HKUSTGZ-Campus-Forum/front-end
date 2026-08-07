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
const { getLocalePath } = useAppLocale()
const { getCourseDetail, getPopularity } = useScheduler()
const loggedIn = toRef(props, 'isLoggedIn')
const cart = useSchedulerCart(
  props.semesterId,
  loggedIn,
  toRef(props, 'initialCourseList'),
)
const courseList = cart.courses
const popularityCourseCodes = computed(() => courseList.value.map(course => course.course_code))
const popularity = useSchedulerPopularity({
  semesterId: props.semesterId,
  isLoggedIn: loggedIn,
  courseCodes: popularityCourseCodes,
  getPopularity,
})
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
const enabledCourses = computed(() => courseList.value.filter(course => course.enabled))
const totalCredits = computed(() => enabledCourses.value.reduce((sum, course) => sum + course.credit, 0))

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
    return
  }

  await popularity.refresh()
}

function toggleBan(day: number, period: number) {
  bannedPeriods.value[day][period] = !bannedPeriods.value[day][period]
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <div class="dashboard__heading">
        <NuxtLink class="dashboard__back" :to="getLocalePath('/courses/planner')">
          {{ t('scheduler.backToSemesters') }}
        </NuxtLink>
        <h1>{{ t('scheduler.title') }}</h1>
        <p>{{ t('scheduler.workspaceSubtitle') }}</p>
      </div>
      <div class="dashboard__summary" aria-label="planner summary">
        <div class="dashboard__summary-item">
          <span>{{ t('scheduler.selectedCourses') }}</span>
          <strong>{{ enabledCourses.length }}</strong>
        </div>
        <div class="dashboard__summary-item">
          <span>{{ t('scheduler.planCount') }}</span>
          <strong>{{ planList.length }}</strong>
        </div>
        <div class="dashboard__summary-item">
          <span>{{ t('scheduler.totalCredits') }}</span>
          <strong>{{ totalCredits }}</strong>
        </div>
      </div>
    </header>

    <div v-if="!isLoggedIn && showGuestHint" class="dashboard__notice dashboard__notice--warning">
      <span>{{ t('scheduler.guestHint') }}</span>
      <button type="button" :aria-label="t('scheduler.close')" @click="showGuestHint = false">&times;</button>
    </div>

    <div v-if="popularity.forbidden.value" class="dashboard__notice dashboard__notice--warning">
      {{ t('scheduler.popularityVerifiedOnly') }}
    </div>

    <div v-if="cartError || planMessage" class="dashboard__notice">
      {{ cartError || planMessage }}
    </div>

    <div class="dashboard__body">
      <div class="dashboard__left">
        <div class="dashboard__timetable-card">
          <SchedulerTimetable
            v-if="!loading"
            :course-list="courseList"
            :current-plan="currentPlan"
            :banned-periods="bannedPeriods"
            :filter-mode="filterMode"
            :display-options="displayOptions"
            :max-day-num="maxDayNum"
            :popularity-by-course="popularity.popularityByCourse.value"
            :show-popularity="popularity.canShowPopularity.value"
            @toggle-ban="toggleBan"
          />
          <div v-else class="dashboard__loading">{{ t('scheduler.loading') }}</div>
          <SchedulerBottomPanel
            :current-index="viewIndex"
            :total-plans="planList.length"
            @update:index="viewIndex = $event"
          />
        </div>
      </div>

      <div class="dashboard__right">
        <SchedulerSidePanel
          :course-list="courseList"
          :current-plan="currentPlan"
          :display-options="displayOptions"
          :popularity-by-course="popularity.popularityByCourse.value"
          :popularity-generated-at="popularity.generatedAt.value"
          :show-popularity="popularity.canShowPopularity.value"
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
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 24px 28px;
  overflow: visible;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  &__heading {
    min-width: 0;

    h1 {
      margin: 4px 0 0;
      color: var(--text-primary);
      font-size: 1.5rem;
      line-height: 1.25;
      font-weight: 700;
    }

    p {
      margin: 7px 0 0;
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.55;
    }
  }

  &__back {
    color: var(--interactive-active);
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;

    &:hover {
      color: var(--interactive-hover);
    }
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(92px, 1fr));
    gap: 10px;
    flex: 0 0 min(420px, 42%);
  }

  &__summary-item {
    min-height: 62px;
    padding: 10px 14px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-small);

    span {
      display: block;
      margin-bottom: 4px;
      color: var(--text-secondary);
      font-size: 0.76rem;
      white-space: nowrap;
    }

    strong {
      color: var(--text-primary);
      font-size: 1.14rem;
      line-height: 1.2;
    }
  }

  &__notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 40px;
    padding: 9px 16px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    color: var(--text-secondary);
    font-size: 0.86rem;
    text-align: center;

    &--warning {
      background: color-mix(in srgb, var(--semantic-warning) 14%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--semantic-warning) 24%, var(--border-secondary));
      color: var(--text-primary);
    }

    button {
      width: 26px;
      height: 26px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;

      &:hover {
        border-color: color-mix(in srgb, var(--semantic-warning) 35%, transparent);
        background: color-mix(in srgb, var(--surface-primary) 70%, transparent);
      }
    }
  }

  &__body {
    flex: 1;
    min-height: 620px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
    gap: 14px;
    overflow: visible;
  }

  &__left {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__timetable-card {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 10px;
    border: 1px solid var(--border-secondary);
    border-radius: 16px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-small);
  }

  &__right {
    min-width: 0;
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

@media (max-width: 1024px) {
  .dashboard {
    &__header {
      align-items: stretch;
      flex-direction: column;
    }

    &__summary {
      flex-basis: auto;
      width: 100%;
    }

    &__body {
      grid-template-columns: 1fr;
      min-height: 0;
    }

    &__timetable-card {
      min-height: 620px;
    }

    &__right {
      overflow: visible;
    }
  }
}

@media (max-width: 768px) {
  .dashboard {
    min-height: calc(100vh - 64px);
    padding: 16px 14px 28px;

    &__summary {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    &__summary-item {
      padding: 9px 10px;

      span {
        white-space: normal;
      }
    }

    &__notice {
      align-items: flex-start;
      justify-content: space-between;
      text-align: left;
    }

    &__timetable-card {
      min-height: 560px;
      padding: 8px;
    }
  }
}

@media (max-width: 520px) {
  .dashboard {
    &__summary {
      grid-template-columns: 1fr;
    }
  }
}
</style>
