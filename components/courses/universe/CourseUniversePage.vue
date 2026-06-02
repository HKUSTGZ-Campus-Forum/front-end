<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CourseNodeDetailPanel from './CourseNodeDetailPanel.vue'
import CourseUniverseCanvas from './CourseUniverseCanvas.vue'
import CourseUniverseLegend from './CourseUniverseLegend.vue'
import CourseUniverseToolbar from './CourseUniverseToolbar.vue'
import type { AcademicCourseRecord, AcademicCourseStatus } from '~/types/academic-map'
import type { CartCourse, SemesterInfo } from '~/utils/scheduler'
import {
  compactCourseCode,
  formatCourseCode,
  normalizeCourseUniverseNodes,
  type CourseUniverseMapComponent,
  type CourseUniverseMapCourse,
  type CourseUniverseMapLine,
  type CourseUniverseModeKey,
} from '~/utils/courseUniverse'

const props = defineProps<{
  mode?: CourseUniverseModeKey
}>()

const { t } = useI18n()
const { isLoggedIn } = useAuth()
const { getMapComponents, getMapLines, getMapCourses, getSemesters, getCart } = useScheduler()
const { fetchSummary, saveImportedRecords, updateRecord } = useAcademicMap()

const components = ref<CourseUniverseMapComponent[]>([])
const lines = ref<CourseUniverseMapLine[]>([])
const courses = ref<CourseUniverseMapCourse[]>([])
const semesters = ref<SemesterInfo[]>([])
const plannerCourses = ref<CartCourse[]>([])
const academicRecords = ref<AcademicCourseRecord[]>([])
const searchQuery = ref('')
const selectedSemester = ref('')
const selectedCourseCode = ref<string | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const mode = computed(() => props.mode || 'universe')

const nodes = computed(() => normalizeCourseUniverseNodes({
  components: components.value,
  courses: courses.value,
  academicRecords: academicRecords.value,
  plannerCourses: plannerCourses.value,
  selectedCourseCode: selectedCourseCode.value,
}))

const selectedNode = computed(() => (
  nodes.value.find(node => node.code === compactCourseCode(selectedCourseCode.value || '')) || null
))

const selectedAcademicRecord = computed(() => {
  if (!selectedNode.value) return null
  return academicRecords.value.find(record => (
    compactCourseCode(record.course_code) === selectedNode.value?.code
  )) || null
})

const selectedAcademicStatus = computed(() => selectedAcademicRecord.value?.status || null)
const selectedInPlanner = computed(() => Boolean(selectedNode.value?.inPlanner))

async function loadUniverse() {
  try {
    loading.value = true
    errorMessage.value = ''
    const [mapComponents, mapLines, mapCourses, semesterData] = await Promise.all([
      getMapComponents(),
      getMapLines(),
      getMapCourses(),
      getSemesters(),
    ])

    components.value = mapComponents
    lines.value = mapLines
    courses.value = mapCourses
    semesters.value = semesterData
    selectedSemester.value = semesterData[0]?.id || ''

    if (isLoggedIn.value) {
      const summary = await fetchSummary()
      academicRecords.value = summary.records || []
      if (selectedSemester.value) {
        plannerCourses.value = await getCart(selectedSemester.value)
      }
    }
  } catch {
    errorMessage.value = t('courseUniverse.errors.load')
  } finally {
    loading.value = false
  }
}

async function refreshPlannerCart() {
  if (!isLoggedIn.value || !selectedSemester.value) {
    plannerCourses.value = []
    return
  }
  plannerCourses.value = await getCart(selectedSemester.value)
}

async function updateAcademicStatus(status: AcademicCourseStatus) {
  if (!selectedNode.value || !isLoggedIn.value) return
  const existing = selectedAcademicRecord.value
  if (existing?.id) {
    const result = await updateRecord(existing.id, { status })
    academicRecords.value = academicRecords.value.map(record => (
      record.id === existing.id ? result.record : record
    ))
    return
  }

  const result = await saveImportedRecords([{
    course_code: formatCourseCode(selectedNode.value.code),
    course_title: selectedNode.value.title,
    term_label: selectedSemester.value,
    status,
    needs_review: false,
  }], false)
  academicRecords.value = [...academicRecords.value, ...(result.records || [])]
}

watch(selectedSemester, refreshPlannerCart)
onMounted(loadUniverse)
</script>

<template>
  <div class="cu-page">
    <CourseUniverseToolbar
      :mode="mode"
      :search-query="searchQuery"
      :semesters="semesters"
      :selected-semester="selectedSemester"
      @update:search-query="searchQuery = $event"
      @update:selected-semester="selectedSemester = $event"
    />

    <div v-if="loading" class="cu-page__state">
      {{ t('courseUniverse.loading') }}
    </div>
    <div v-else-if="errorMessage" class="cu-page__state cu-page__state--error">
      {{ errorMessage }}
    </div>

    <template v-else>
      <div class="cu-page__main">
        <div class="cu-page__graph">
          <CourseUniverseCanvas
            :nodes="nodes"
            :lines="lines"
            :search-query="searchQuery"
            @select="selectedCourseCode = $event"
          />
          <CourseUniverseLegend class="cu-page__legend" />
        </div>
        <CourseNodeDetailPanel
          :node="selectedNode"
          :academic-status="selectedAcademicStatus"
          :in-planner="selectedInPlanner"
          :selected-semester="selectedSemester"
          @update-status="updateAcademicStatus"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.cu-page {
  margin: 0 auto;
  max-width: 1380px;
  padding: 22px 20px 60px;
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
}

.cu-page__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.cu-page__graph {
  min-width: 0;
  position: relative;
}

.cu-page__legend {
  bottom: 14px;
  left: 14px;
  position: absolute;
  z-index: 2;
}

@media (max-width: 980px) {
  .cu-page {
    padding: 16px 14px 48px;
  }

  .cu-page__main {
    grid-template-columns: 1fr;
  }

  .cu-page__legend {
    margin-top: 10px;
    position: static;
  }
}
</style>
