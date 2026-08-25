<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CourseUniverseExplorer from './CourseUniverseExplorer.vue'
import CourseToolsHeader from '~/components/courses/CourseToolsHeader.vue'
import type { CourseOverviewPayload } from '~/types/course-overview'
import type { CartCourse, SemesterInfo } from '~/utils/scheduler'
import {
  compactCourseCode,
  getCourseUniverseActiveSchedulerSemester,
  getCourseUniverseSchedulerSemesterLabel,
  mergeCourseUniverseCatalogCourses,
  normalizeCourseUniverseNodes,
  type CourseUniverseAcademicRecord,
  type CourseUniverseMapComponent,
  type CourseUniverseMapCourse,
  type CourseUniverseMapLine,
  type CourseUniverseGraphMetadata,
  type CourseUniverseGraphResponse,
  type CourseUniverseModeKey,
} from '~/utils/courseUniverse'

const props = defineProps<{
  mode?: CourseUniverseModeKey
}>()

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { isLoggedIn } = useAuth()
const { fetchPublic } = useApi()
const { getMapComponents, getMapLines, getMapCourses, getRelationshipGraph, getSemesters, getCart, addToCart, removeFromCart } = useScheduler()
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
const cartMessage = ref('')
const cartNoticeTone = ref<'info' | 'success' | 'error'>('info')
const cartUpdatingCodes = ref(new Set<string>())
const graphMetadata = ref<CourseUniverseGraphMetadata | null>(null)
const selectedCourseOverview = ref<CourseOverviewPayload | null>(null)
const overviewLoading = ref(false)
const overviewError = ref('')
let overviewRequestId = 0

const mode = computed(() => props.mode || 'universe')
const graphSourceKind = computed<'official' | 'mixed' | 'fallback'>(() => {
  if (!graphMetadata.value) return 'official'
  if ((graphMetadata.value.fallback_relationship_count || 0) > 0) return 'mixed'
  return graphMetadata.value.is_fallback ? 'fallback' : 'official'
})
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

async function getCatalogCourses(): Promise<CourseUniverseMapCourse[]> {
  const response = await fetchPublic('/api/courses?stage=all')
  if (!response.ok) return []
  const data = await response.json()
  if (!Array.isArray(data)) return []

  return data.map(course => ({
    course_code: course.course_code || course.code,
    course_title_abbr: course.course_title_abbr,
    course_title: course.course_title,
    name: course.name,
    title: course.title,
  }))
}

async function loadUniverse() {
  try {
    loading.value = true
    errorMessage.value = ''
    const [relationshipGraph, semesterData, catalogCourses] = await Promise.all([
      getRelationshipGraph().catch(async () => {
        const [fallbackComponents, fallbackLines, fallbackCourses] = await Promise.all([
          getMapComponents(),
          getMapLines(),
          getMapCourses(),
        ])
        return {
          components: fallbackComponents,
          lines: fallbackLines,
          courses: fallbackCourses,
          metadata: {
            source: 'legacy_scheduler_map',
            is_fallback: true,
            course_count: fallbackCourses.length,
            relationship_count: fallbackLines.length,
          },
        } as CourseUniverseGraphResponse
      }),
      getSemesters(),
      getCatalogCourses().catch(() => []),
    ])

    components.value = relationshipGraph.components
    lines.value = relationshipGraph.lines
    courses.value = mergeCourseUniverseCatalogCourses(relationshipGraph.courses, catalogCourses)
    graphMetadata.value = relationshipGraph.metadata
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

async function loadCourseOverview(code: string) {
  const requestId = ++overviewRequestId
  overviewLoading.value = true
  overviewError.value = ''
  selectedCourseOverview.value = null
  try {
    const response = await fetchPublic(`/api/courses/by-code/${encodeURIComponent(code)}/overview`)
    if (!response.ok) throw new Error('overview_request_failed')
    const payload = await response.json() as CourseOverviewPayload
    if (requestId === overviewRequestId) selectedCourseOverview.value = payload
  } catch {
    if (requestId === overviewRequestId) overviewError.value = t('courseUniverse.errors.courseDetail')
  } finally {
    if (requestId === overviewRequestId) overviewLoading.value = false
  }
}

function selectCourse(code: string) {
  const normalizedCode = compactCourseCode(code)
  selectedCourseCode.value = normalizedCode || null
  const query = { ...route.query }
  if (normalizedCode) query.focus = normalizedCode
  else delete query.focus
  router.replace({ query })
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
watch(() => route.query.focus, (focus) => {
  const normalizedCode = typeof focus === 'string' ? compactCourseCode(focus) : ''
  if ((selectedCourseCode.value || '') !== normalizedCode) {
    selectedCourseCode.value = normalizedCode || null
  }
})
watch(selectedCourseCode, (code) => {
  if (!code) {
    overviewRequestId += 1
    selectedCourseOverview.value = null
    overviewError.value = ''
    overviewLoading.value = false
    return
  }
  loadCourseOverview(code)
})
onMounted(loadUniverse)
</script>

<template>
  <div class="cu-page">
    <CourseToolsHeader
      :mode="mode"
    />

    <div v-if="loading" class="cu-page__state cu-page__state--loading" aria-busy="true">
      <span class="cu-page__skeleton cu-page__skeleton--title" />
      <span class="cu-page__skeleton cu-page__skeleton--controls" />
      <span class="cu-page__skeleton cu-page__skeleton--body" />
      <span class="sr-only">{{ t('courseUniverse.loading') }}</span>
    </div>
    <div v-else-if="errorMessage" class="cu-page__state cu-page__state--error">
      <p>{{ errorMessage }}</p>
      <button type="button" @click="loadUniverse">
        {{ t('courseUniverse.actions.retry') }}
      </button>
    </div>

    <template v-else>
      <p v-if="graphMetadata" :class="['cu-page__source', `is-${graphSourceKind}`]">
        <span v-if="graphSourceKind === 'mixed'">
          {{ t('courseUniverse.source.mixed', { count: graphMetadata.fallback_relationship_count || 0 }) }}
        </span>
        <span v-else>{{ graphSourceKind === 'fallback' ? t('courseUniverse.source.fallback') : t('courseUniverse.source.official') }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ t('courseUniverse.source.summary', { courses: graphMetadata.course_count, relationships: graphMetadata.relationship_count }) }}</span>
      </p>
      <p v-if="cartMessage" :class="['cu-page__notice', `is-${cartNoticeTone}`]">
        {{ cartMessage }}
      </p>
      <CourseUniverseExplorer
        :components="components"
        :nodes="nodes"
        :lines="lines"
        :overview="selectedCourseOverview"
        :overview-loading="overviewLoading"
        :overview-error="overviewError"
        :active-semester-label="activeSchedulerSemesterLabel"
        :planner-updating-codes="cartUpdatingCodes"
        @select="selectCourse"
        @retry-overview="selectedCourseCode && loadCourseOverview(selectedCourseCode)"
        @toggle-planner="togglePlannerCourse"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.cu-page {
  margin: 0 auto;
  max-width: 1440px;
  padding: 24px 20px 28px;
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
  padding: 24px;
}

.cu-page__state--error {
  color: var(--semantic-error);
  flex-direction: column;
  gap: 12px;
}

.cu-page__state--error p {
  margin: 0;
}

.cu-page__state--error button {
  appearance: none;
  background: var(--btn-primary-bg);
  border: 1px solid var(--interactive-primary);
  border-radius: 10px;
  color: var(--text-inverse);
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 750;
  min-height: 44px;
  padding: 0 16px;
}

.cu-page__state--loading {
  align-items: stretch;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(180px, 0.7fr) minmax(260px, 1fr);
}

.cu-page__skeleton {
  animation: cu-page-pulse 1.4s ease-in-out infinite;
  background: var(--surface-secondary);
  border-radius: 10px;
  display: block;
}

.cu-page__skeleton--title,
.cu-page__skeleton--controls {
  height: 70px;
}

.cu-page__skeleton--body {
  grid-column: 1 / -1;
  height: 360px;
}

@keyframes cu-page-pulse {
  50% { opacity: 0.55; }
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

.cu-page__source {
  align-items: center;
  color: var(--text-tertiary);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.78rem;
  font-weight: 650;
  gap: 6px;
  margin: 0 0 10px;
}

.cu-page__source.is-fallback,
.cu-page__source.is-mixed {
  color: var(--semantic-warning);
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

@media (max-width: 980px) {
  .cu-page {
    padding: 16px 14px 36px;
  }
}

@media (max-width: 640px) {
  .cu-page__state--loading {
    grid-template-columns: 1fr;
  }

  .cu-page__skeleton--body {
    grid-column: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cu-page__skeleton {
    animation: none;
  }
}
</style>
