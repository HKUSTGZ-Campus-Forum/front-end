<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SemesterInfo } from '~/utils/scheduler'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { getSemesters } = useScheduler()

const semesters = ref<SemesterInfo[]>([])
const loading = ref(true)

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
    const yearNum = Math.floor(Number(s.id) / 100)
    const year = `20${String(yearNum).slice(0, 2)}-${String(yearNum).slice(2)}`
    if (!groups[year]) groups[year] = []
    groups[year].push(s)
  }
  return groups
}
</script>

<template>
  <div class="scheduler-home">
    <h1 class="scheduler-home__title">{{ t('scheduler.dashboard') }}</h1>
    <div v-if="loading" class="scheduler-home__loading">Loading...</div>
    <div v-else class="scheduler-home__timeline">
      <div v-for="(sems, year) in groupByYear(semesters)" :key="year" class="scheduler-home__year">
        <div class="scheduler-home__year-label">{{ year }}</div>
        <div class="scheduler-home__semesters">
          <NuxtLink
            v-for="sem in sems"
            :key="sem.id"
            :to="getLocalePath(`/scheduler/dashboard/${sem.id}`)"
            class="scheduler-home__card"
          >
            <div class="scheduler-home__card-name">{{ sem.name_zh }}</div>
            <div class="scheduler-home__card-count">{{ sem.section_count }} sections</div>
          </NuxtLink>
        </div>
      </div>
      <div v-if="semesters.length === 0" class="scheduler-home__empty">No semesters available</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scheduler-home {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;

  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 2rem;
    color: var(--text-primary);
  }

  &__loading {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem;
  }

  &__year {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  &__year-label {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 100px;
    padding-top: 0.5rem;
  }

  &__semesters {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__card {
    display: block;
    padding: 1rem 1.5rem;
    background: var(--surface-primary);
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    text-decoration: none;
    transition: box-shadow 0.2s, transform 0.2s;

    &:hover {
      box-shadow: var(--shadow-medium);
      transform: translateY(-2px);
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
  }

  &__empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem;
  }
}
</style>
