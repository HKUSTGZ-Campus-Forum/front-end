<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import CourseToolsHeader from '~/components/courses/CourseToolsHeader.vue'
import { formatCourseUniverseAcademicYearLabel } from '~/utils/courseUniverse'
import type { SemesterInfo } from '~/utils/scheduler'

definePageMeta({ layout: 'keguang' })

const { t, locale } = useI18n()
const { getLocalePath } = useAppLocale()
const { getSemesters } = useScheduler()

const semesters = ref<SemesterInfo[]>([])
const loading = ref(true)
const loadError = ref(false)

const SEASON_COLUMNS = [
  { key: '10', labelKey: 'courses.semester.fall' },
  { key: '30', labelKey: 'courses.semester.spring' },
  { key: '40', labelKey: 'courses.semester.summer' },
] as const

const sortedSemesters = computed(() =>
  [...semesters.value].sort((a, b) => Number(b.id) - Number(a.id))
)

const totalSections = computed(() =>
  semesters.value.reduce((sum, sem) => sum + sem.section_count, 0)
)

const latestSemester = computed(() => sortedSemesters.value[0])

async function loadSemesters() {
  loading.value = true
  loadError.value = false
  try {
    semesters.value = await getSemesters()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => void loadSemesters())

function groupByYear(sems: SemesterInfo[]) {
  const groups: Record<string, SemesterInfo[]> = {}
  for (const s of sems) {
    const year = formatCourseUniverseAcademicYearLabel(s.id)
    if (!groups[year]) groups[year] = []
    groups[year].push(s)
  }
  return groups
}

const semesterGroups = computed(() => groupByYear(sortedSemesters.value))

function getSemesterSeason(sem: SemesterInfo) {
  const match = String(sem.id || '').trim().match(/^\d{2}(\d{2})$/)
  return match?.[1] || ''
}

const semestersByYearSeason = computed(() => {
  const map: Record<string, Partial<Record<string, SemesterInfo>>> = {}
  for (const [year, sems] of Object.entries(semesterGroups.value)) {
    map[year] = {}
    for (const sem of sems) {
      const season = getSemesterSeason(sem)
      if (SEASON_COLUMNS.some(column => column.key === season)) {
        map[year][season] = sem
      }
    }
  }
  return map
})

function getSemesterName(sem: SemesterInfo) {
  return locale.value === 'zh' ? sem.name_zh : sem.name
}
</script>

<template>
  <div class="scheduler-home">
    <CourseToolsHeader
      mode="planner"
      :title="t('scheduler.title')"
    >
      <template #actions>
        <div class="scheduler-home__actions">
          <NuxtLink :to="getLocalePath('/courses/planner/plans')" class="scheduler-home__secondary">
            {{ t('scheduler.savedPlans.mine') }}
          </NuxtLink>
          <NuxtLink :to="getLocalePath('/courses/planner/shared')" class="scheduler-home__secondary">
            {{ t('scheduler.savedPlans.shared') }}
          </NuxtLink>
          <NuxtLink
            v-if="latestSemester"
            :to="getLocalePath(`/courses/planner/${latestSemester.id}`)"
            class="scheduler-home__primary"
          >
            {{ t('scheduler.openLatest') }}
          </NuxtLink>
        </div>
      </template>
    </CourseToolsHeader>

    <div v-if="loading" class="scheduler-home__panel scheduler-home__loading">
      {{ t('scheduler.loading') }}
    </div>

    <div v-else-if="loadError" class="scheduler-home__panel scheduler-home__error" role="alert">
      <span>{{ t('scheduler.semestersLoadFailed') }}</span>
      <button type="button" @click="loadSemesters">{{ t('common.retry') }}</button>
    </div>

    <template v-else>
      <section class="scheduler-home__stats" aria-label="planner summary">
        <div class="scheduler-home__stat">
          <span>{{ t('scheduler.availableSemesters') }}</span>
          <strong>{{ semesters.length }}</strong>
        </div>
        <div class="scheduler-home__stat">
          <span>{{ t('scheduler.availableSections') }}</span>
          <strong>{{ totalSections }}</strong>
        </div>
        <div v-if="latestSemester" class="scheduler-home__stat">
          <span>{{ t('scheduler.latestSemester') }}</span>
          <strong>{{ getSemesterName(latestSemester) }}</strong>
        </div>
      </section>

      <div v-if="semesters.length > 0" class="scheduler-home__panel scheduler-home__timeline">
        <div class="scheduler-home__semester-table">
          <div class="scheduler-home__semester-table-row scheduler-home__semester-table-row--head">
            <div class="scheduler-home__semester-table-cell scheduler-home__semester-table-cell--year" aria-hidden="true"></div>
            <div
              v-for="column in SEASON_COLUMNS"
              :key="column.key"
              class="scheduler-home__semester-table-cell scheduler-home__semester-table-cell--head"
            >
              {{ t(column.labelKey) }}
            </div>
          </div>
          <div
            v-for="(yearSeasons, year) in semestersByYearSeason"
            :key="year"
            class="scheduler-home__semester-table-row"
          >
            <div class="scheduler-home__semester-table-cell scheduler-home__semester-table-cell--year">
              {{ year }}
            </div>
            <div
              v-for="column in SEASON_COLUMNS"
              :key="column.key"
              class="scheduler-home__semester-table-cell"
            >
              <NuxtLink
                v-if="yearSeasons[column.key]"
                :to="getLocalePath(`/courses/planner/${yearSeasons[column.key].id}`)"
                class="scheduler-home__card"
              >
                <div class="scheduler-home__card-name">{{ getSemesterName(yearSeasons[column.key]) }}</div>
                <div class="scheduler-home__card-count">{{ t('scheduler.sections', { count: yearSeasons[column.key].section_count }) }}</div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="scheduler-home__panel scheduler-home__empty">
        {{ t('scheduler.noSemesters') }}
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.scheduler-home {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 64px;

  &__actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__secondary {
    align-items: center;
    background: var(--surface-primary);
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    color: var(--interactive-active);
    display: inline-flex;
    font-size: 0.84rem;
    font-weight: 700;
    min-height: 40px;
    padding: 0 14px;
    text-decoration: none;
  }

  &__primary {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 20px;
    border-radius: 999px;
    background: var(--btn-primary-bg);
    color: var(--text-inverse);
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    box-shadow: var(--shadow-small);
    transition: background 0.18s ease, transform 0.18s ease;

    &:hover {
      background: var(--btn-primary-bg-hover);
      transform: translateY(-1px);
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  &__stat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 68px;
    padding: 14px 18px;
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-small);

    span {
      font-size: 0.84rem;
      color: var(--text-secondary);
    }

    strong {
      font-size: 1.08rem;
      color: var(--text-primary);
    }
  }

  &__panel {
    border: 1px solid var(--border-secondary);
    border-radius: 14px;
    background: var(--surface-primary);
    box-shadow: var(--shadow-small);
  }

  &__loading {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem;
  }

  &__error {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 14px;
    padding: 3rem;
    color: var(--semantic-error);
    text-align: center;

    button {
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid var(--border-primary);
      border-radius: 10px;
      background: var(--surface-secondary);
      color: var(--text-primary);
      cursor: pointer;
      font-weight: 700;
    }
  }

  &__timeline {
    padding: 10px 18px 4px;
  }

  &__semester-table {
    min-width: 0;
    overflow-x: auto;
  }

  &__semester-table-row {
    display: grid;
    grid-template-columns: 96px repeat(3, minmax(0, 1fr));
    gap: 8px;
    align-items: stretch;
    padding: 14px 0;
    // Narrower minimum so phones scroll less while the columns stay readable.
    min-width: 420px;

    & + & {
      border-top: 1px solid var(--border-secondary);
    }

    &--head {
      border-bottom: 1px solid var(--border-secondary);
      padding-bottom: 10px;
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--text-secondary);
    }
  }

  &__semester-table-cell {
    min-width: 0;

    &--head {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    &--year {
      display: flex;
      align-items: center;
      font-size: 0.96rem;
      font-weight: 700;
      color: var(--text-secondary);
      padding-top: 2px;
    }
  }

  &__card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    min-height: 72px;
    padding: 12px 14px;
    background: var(--surface-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

    &:hover {
      background: var(--surface-primary);
      border-color: var(--interactive-secondary);
      transform: translateY(-1px);
    }

    &-name {
      font-size: 0.95rem;
      font-weight: 650;
      color: var(--text-primary);
    }

    &-count {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
  }

  &__empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem;
  }
}

@media (max-width: 768px) {
  .scheduler-home {
    padding: 18px 16px 48px;

    &__primary {
      width: 100%;
    }

    // Keep the three summary stats on a single row on phones instead of
    // stacking them vertically (each full-width row wasted a lot of height).
    &__stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    &__stat {
      min-height: 60px;
      padding: 10px 8px;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;

      span {
        font-size: 0.72rem;
        white-space: nowrap;
      }

      strong {
        font-size: 1rem;
      }
    }
  }
}
</style>
