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

const sortedSemesters = computed(() =>
  [...semesters.value].sort((a, b) => Number(b.id) - Number(a.id))
)

const totalSections = computed(() =>
  semesters.value.reduce((sum, sem) => sum + sem.section_count, 0)
)

const latestSemester = computed(() => sortedSemesters.value[0])

onMounted(async () => {
  try {
    semesters.value = await getSemesters()
  } finally {
    loading.value = false
  }
})

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
        <NuxtLink
          v-if="latestSemester"
          :to="getLocalePath(`/courses/planner/${latestSemester.id}`)"
          class="scheduler-home__primary"
        >
          {{ t('scheduler.openLatest') }}
        </NuxtLink>
      </template>
    </CourseToolsHeader>

    <div v-if="loading" class="scheduler-home__panel scheduler-home__loading">
      {{ t('scheduler.loading') }}
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
        <div
          v-for="(sems, year) in semesterGroups"
          :key="year"
          class="scheduler-home__year"
        >
          <div class="scheduler-home__year-label">{{ year }}</div>
          <div class="scheduler-home__semesters">
            <NuxtLink
              v-for="sem in sems"
              :key="sem.id"
              :to="getLocalePath(`/courses/planner/${sem.id}`)"
              class="scheduler-home__card"
            >
              <div class="scheduler-home__card-main">
                <div class="scheduler-home__card-name">{{ getSemesterName(sem) }}</div>
                <div class="scheduler-home__card-count">{{ t('scheduler.sections', { count: sem.section_count }) }}</div>
              </div>
              <span class="scheduler-home__card-action">{{ t('scheduler.enterPlanner') }}</span>
            </NuxtLink>
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
  max-width: 1160px;
  margin: 0 auto;
  padding: 22px 24px 64px;

  &__primary {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 20px;
    border-radius: 999px;
    background: var(--interactive-primary);
    color: var(--text-inverse);
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    box-shadow: var(--shadow-small);
    transition: background 0.18s ease, transform 0.18s ease;

    &:hover {
      background: var(--interactive-hover);
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

  &__timeline {
    padding: 10px 18px 4px;
  }

  &__year {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 18px;
    padding: 18px 0;

    & + & {
      border-top: 1px solid var(--border-secondary);
    }
  }

  &__year-label {
    font-size: 0.96rem;
    font-weight: 700;
    color: var(--text-secondary);
    padding-top: 10px;
  }

  &__semesters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }

  &__card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 82px;
    padding: 16px 18px;
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
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    &-count {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    &-action {
      flex-shrink: 0;
      padding: 5px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
      color: var(--interactive-active);
      font-size: 0.78rem;
      font-weight: 700;
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

    &__stats {
      grid-template-columns: 1fr;
    }

    &__year {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    &__year-label {
      padding-top: 0;
    }
  }
}
</style>
