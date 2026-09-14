<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CourseUniverseCanvas from './CourseUniverseCanvas.vue'
import CourseUniverseLegend from './CourseUniverseLegend.vue'
import CourseToolsHeader from '~/components/courses/CourseToolsHeader.vue'
import type { CartCourse, SemesterInfo } from '~/utils/scheduler'
import {
  compactCourseCode,
  getCourseUniverseActiveSchedulerSemester,
  getCourseUniverseSchedulerSemesterLabel,
  normalizeCourseUniverseNodes,
  type CourseUniverseAcademicRecord,
  type CourseUniverseMapComponent,
  type CourseUniverseMapCourse,
  type CourseUniverseMapLine,
  type CourseUniverseModeKey,
  type CourseUniverseGraphMetadata,
} from '~/utils/courseUniverse'

const props = defineProps<{
  mode?: CourseUniverseModeKey
}>()

const route = useRoute()
const { t, locale } = useI18n()
const { isLoggedIn } = useAuth()
const { getRelationshipGraph, getSemesters, getCart, addToCart, removeFromCart } = useScheduler()
const { fetchSummary } = useAcademicMap()

const components = ref<CourseUniverseMapComponent[]>([])
const lines = ref<CourseUniverseMapLine[]>([])
const courses = ref<CourseUniverseMapCourse[]>([])
const semesters = ref<SemesterInfo[]>([])
const plannerCourses = ref<CartCourse[]>([])
const academicRecords = ref<CourseUniverseAcademicRecord[]>([])
const selectedCourseCode = ref<string | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const graphMetadata = ref<CourseUniverseGraphMetadata | null>(null)
const cartMessage = ref('')
const cartNoticeTone = ref<'info' | 'success' | 'error'>('info')
const cartUpdatingCodes = ref(new Set<string>())

const mode = computed(() => props.mode || 'universe')
const activeSchedulerSemester = computed(() => getCourseUniverseActiveSchedulerSemester(semesters.value))
const activeSchedulerSemesterLabel = computed(() => {
  const semester = semesters.value.find(item => item.id === activeSchedulerSemester.value)
  if (!semester) return activeSchedulerSemester.value
  return getCourseUniverseSchedulerSemesterLabel(semester, locale.value)
})

const nodes = computed(() => normalizeCourseUniverseNodes({
  components: components.value,
  courses: courses.value,
  academicRecords: academicRecords.value,
  plannerCourses: plannerCourses.value,
  selectedCourseCode: selectedCourseCode.value,
}))

async function loadUniverse() {
  try {
    loading.value = true
    errorMessage.value = ''
    const [graph, semesterData] = await Promise.all([
      getRelationshipGraph('official'),
      getSemesters(),
    ])

    if (graph.metadata.catalog !== 'official' || !graph.courses.length) {
      errorMessage.value = t('courseUniverse.errors.catalogUnavailable')
      return
    }
    components.value = graph.components
    lines.value = graph.lines
    courses.value = graph.courses
    graphMetadata.value = graph.metadata
    semesters.value = semesterData
    const focusedCourse = typeof route.query.focus === 'string' ? compactCourseCode(route.query.focus) : ''
    if (focusedCourse) selectedCourseCode.value = focusedCourse

    if (isLoggedIn.value) {
      const summary = await fetchSummary()
      academicRecords.value = summary.records || []
      if (activeSchedulerSemester.value) {
        plannerCourses.value = await getCart(activeSchedulerSemester.value)
      }
    }
  } catch {
    errorMessage.value = t('courseUniverse.errors.load')
  } finally {
    loading.value = false
  }
}

async function refreshPlannerCart() {
  if (!isLoggedIn.value || !activeSchedulerSemester.value) {
    plannerCourses.value = []
    return
  }
  plannerCourses.value = await getCart(activeSchedulerSemester.value)
}

function isCourseInPlannerCart(code: string) {
  const normalizedCode = compactCourseCode(code)
  return plannerCourses.value.some(course => compactCourseCode(course.course_code) === normalizedCode)
}

async function togglePlannerCourse(code: string) {
  cartMessage.value = ''
  cartNoticeTone.value = 'info'
  const semester = activeSchedulerSemester.value
  const semesterLabel = activeSchedulerSemesterLabel.value
  if (!semester) {
    cartMessage.value = t('scheduler.noSemesters')
    cartNoticeTone.value = 'error'
    return
  }
  if (!isLoggedIn.value) {
    cartMessage.value = t('scheduler.loginHint')
    cartNoticeTone.value = 'error'
    return
  }

  const normalizedCode = compactCourseCode(code)
  if (cartUpdatingCodes.value.has(normalizedCode)) return

  cartUpdatingCodes.value = new Set(cartUpdatingCodes.value).add(normalizedCode)
  try {
    if (isCourseInPlannerCart(normalizedCode)) {
      await removeFromCart(semester, normalizedCode)
      cartMessage.value = t('scheduler.cartRemoved', { course: normalizedCode, semester: semesterLabel })
    } else {
      await addToCart(semester, normalizedCode)
      cartMessage.value = t('scheduler.cartAdded', { course: normalizedCode, semester: semesterLabel })
    }
    cartNoticeTone.value = 'success'
    await refreshPlannerCart()
  } catch (error) {
    const errorMessageText = error instanceof Error ? error.message : ''
    cartNoticeTone.value = 'error'
    if (errorMessageText.includes('no sections')) {
      cartMessage.value = t('scheduler.cartCourseUnavailable', { course: normalizedCode, semester: semesterLabel })
    } else if (errorMessageText.includes('already in cart')) {
      cartMessage.value = t('scheduler.cartAlreadyAdded', { course: normalizedCode, semester: semesterLabel })
      await refreshPlannerCart()
    } else {
      cartMessage.value = t('scheduler.cartFailed')
    }
  } finally {
    const nextUpdatingCodes = new Set(cartUpdatingCodes.value)
    nextUpdatingCodes.delete(normalizedCode)
    cartUpdatingCodes.value = nextUpdatingCodes
  }
}

watch(activeSchedulerSemester, () => {
  refreshPlannerCart()
})
onMounted(loadUniverse)
</script>

<template>
  <div class="cu-page">
    <CourseToolsHeader
      :mode="mode"
      :mode-order="['universe', 'explore', 'planner', 'academicMap']"
    />

    <div v-if="loading" class="cu-page__state">
      {{ t('courseUniverse.loading') }}
    </div>
    <div v-else-if="errorMessage" class="cu-page__state cu-page__state--error">
      <p role="alert">{{ errorMessage }}</p>
      <button type="button" @click="loadUniverse">{{ t('common.retry') }}</button>
    </div>

    <template v-else>
      <p v-if="cartMessage" :class="['cu-page__notice', `is-${cartNoticeTone}`]">
        {{ cartMessage }}
      </p>
      <div class="cu-page__graph">
        <CourseUniverseLegend class="cu-page__legend" />
        <p v-if="graphMetadata" class="cu-page__source">
          {{ t('courseUniverse.catalogSource', { term: graphMetadata.effective_from_semester_id || '—', date: graphMetadata.imported_at?.slice(0, 10) || '—' }) }}
        </p>
        <CourseUniverseCanvas
          catalog-graph
          :components="components"
          :nodes="nodes"
          :lines="lines"
          search-query=""
          @select="selectedCourseCode = $event"
          @toggle-planner="togglePlannerCourse"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.cu-page {
  margin: 0 auto;
  max-width: 1600px;
  padding: 18px 20px 28px;
}

.cu-page__source {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin: 0;
}

.cu-page__state {
  align-items: center;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  min-height: 260px;
}

.cu-page__state--error {
  color: var(--semantic-error);
  flex-direction: column;
  gap: 12px;
}

.cu-page__state--error button {
  background: var(--btn-primary-bg);
  border: 1px solid var(--interactive-primary);
  border-radius: 10px;
  color: var(--text-inverse);
  cursor: pointer;
  font: inherit;
  min-height: 44px;
  padding: 0 16px;
}

.cu-page__graph {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.cu-page__notice {
  background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 25%, var(--border-primary));
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  margin: 0 0 10px;
  padding: 7px 12px;
}

.cu-page__notice.is-success {
  background: color-mix(in srgb, var(--semantic-success) 10%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--semantic-success) 34%, var(--border-primary));
  color: var(--semantic-success);
}

.cu-page__notice.is-error {
  background: color-mix(in srgb, var(--semantic-error) 10%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--semantic-error) 34%, var(--border-primary));
  color: var(--semantic-error);
}

.cu-page__legend {
  min-width: 0;
}

@media (max-width: 980px) {
  .cu-page {
    padding: 16px 14px 36px;
  }
}
</style>
