<script setup lang="ts">
import CourseToolsHeader from '~/components/courses/CourseToolsHeader.vue'
import type { SchedulerSavedPlan, SemesterInfo } from '~/utils/scheduler'

definePageMeta({ layout: 'keguang' })

const { t, locale } = useI18n()
const { getLocalePath } = useAppLocale()
const router = useRouter()
const { isLoggedIn } = useAuth()
const { getSharedPlans, getSemesters, applyPlan, clonePlan } = useScheduler()

const plans = ref<SchedulerSavedPlan[]>([])
const semesters = ref<SemesterInfo[]>([])
const selectedId = ref('')
const semesterId = ref('')
const courseCode = ref('')
const loading = ref(true)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const selected = computed(() => plans.value.find(plan => plan.public_id === selectedId.value) || plans.value[0] || null)

async function loadShared() {
  loading.value = true
  error.value = ''
  try {
    const response = await getSharedPlans({
      semesterId: semesterId.value,
      courseCode: courseCode.value,
      page: page.value,
    })
    plans.value = response.plans
    totalPages.value = response.total_pages
    if (!plans.value.some(plan => plan.public_id === selectedId.value)) {
      selectedId.value = plans.value[0]?.public_id || ''
    }
  } catch {
    error.value = t('scheduler.savedPlans.loadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [, availableSemesters] = await Promise.all([
    loadShared(),
    getSemesters().catch(() => []),
  ])
  semesters.value = availableSemesters
})

watch(semesterId, () => { page.value = 1; void loadShared() })
watch(courseCode, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; void loadShared() }, 300)
})
onUnmounted(() => { if (searchTimer) clearTimeout(searchTimer) })

function semesterName(id: string) {
  const semester = semesters.value.find(item => item.id === id)
  if (!semester) return id
  return locale.value === 'zh' ? semester.name_zh : semester.name
}

async function usePlan(plan: SchedulerSavedPlan) {
  if (!isLoggedIn.value) {
    await router.push(getLocalePath('/login'))
    return
  }
  try {
    await applyPlan(plan.public_id)
    await router.push(getLocalePath({
      path: `/courses/planner/${plan.semester_id}`,
      query: { plan: plan.public_id },
    }))
  } catch (reason) {
    const code = (reason as Error & { code?: string }).code
    error.value = code === 'updated_plan_conflict'
      ? t('scheduler.savedPlans.applyConflict')
      : code === 'plan_unavailable'
        ? t('scheduler.savedPlans.applyUnavailable')
        : t('scheduler.savedPlans.applyFailed')
  }
}

async function copyPlan(plan: SchedulerSavedPlan) {
  if (!isLoggedIn.value) {
    await router.push(getLocalePath('/login'))
    return
  }
  try {
    const copyName = t('scheduler.savedPlans.copyName', { name: plan.name }).slice(0, 80).trim()
    const copy = await clonePlan(plan.public_id, copyName)
    await router.push(getLocalePath({
      path: '/courses/planner/plans',
      query: { plan: copy.public_id },
    }))
  } catch {
    error.value = t('scheduler.savedPlans.copyFailed')
  }
}
</script>

<template>
  <main class="shared-plans">
    <CourseToolsHeader mode="planner" :title="t('scheduler.savedPlans.sharedTitle')" :subtitle="t('scheduler.savedPlans.sharedSubtitle')" />

    <nav class="shared-plans__tabs" :aria-label="t('scheduler.savedPlans.navigation')">
      <NuxtLink :to="getLocalePath('/courses/planner/plans')">{{ t('scheduler.savedPlans.mine') }}</NuxtLink>
      <NuxtLink class="active" :to="getLocalePath('/courses/planner/shared')">{{ t('scheduler.savedPlans.shared') }}</NuxtLink>
    </nav>

    <section class="shared-plans__filters">
      <label>
        <span>{{ t('scheduler.savedPlans.semesterFilter') }}</span>
        <select v-model="semesterId">
          <option value="">{{ t('scheduler.savedPlans.allSemesters') }}</option>
          <option v-for="semester in semesters" :key="semester.id" :value="semester.id">{{ semesterName(semester.id) }}</option>
        </select>
      </label>
      <label class="shared-plans__search">
        <span>{{ t('scheduler.savedPlans.courseFilter') }}</span>
        <span class="shared-plans__search-control">
          <Icon name="lucide:search" aria-hidden="true" />
          <input v-model="courseCode" :placeholder="t('scheduler.savedPlans.courseFilterPlaceholder')" />
        </span>
      </label>
    </section>

    <div v-if="error" class="shared-plans__notice" role="alert">{{ error }}</div>
    <section v-if="loading" class="shared-plans__empty">{{ t('scheduler.loading') }}</section>

    <section v-else-if="plans.length" class="shared-plans__layout">
      <div class="shared-plans__list">
        <SchedulerPlanCard
          v-for="plan in plans"
          :key="plan.public_id"
          :plan="plan"
          :active="selected?.public_id === plan.public_id"
          @select="selectedId = plan.public_id"
        >
          <template #actions>
            <NuxtLink :to="getLocalePath(`/courses/planner/shared/${plan.public_id}`)">{{ t('common.details') }}</NuxtLink>
            <button type="button" @click="usePlan(plan)">{{ t('scheduler.savedPlans.use') }}</button>
            <button v-if="!plan.is_owner" type="button" @click="copyPlan(plan)">{{ t('scheduler.savedPlans.copy') }}</button>
          </template>
        </SchedulerPlanCard>
        <div v-if="totalPages > 1" class="shared-plans__pagination">
          <button type="button" :disabled="page <= 1" @click="page -= 1; loadShared()">{{ t('common.previous') }}</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="page += 1; loadShared()">{{ t('common.next') }}</button>
        </div>
      </div>
      <SchedulerPlanPreview v-if="selected" :plan="selected" />
    </section>

    <section v-else class="shared-plans__empty">
      <Icon name="lucide:search-x" aria-hidden="true" />
      <h2>{{ t('scheduler.savedPlans.emptySharedTitle') }}</h2>
      <p>{{ t('scheduler.savedPlans.emptySharedDescription') }}</p>
    </section>
  </main>
</template>

<style scoped lang="scss">
.shared-plans { margin: 0 auto; max-width: 1240px; padding: 24px 20px 64px; width: 100%; }
.shared-plans__tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.shared-plans__tabs a { background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 999px; color: var(--text-secondary); font-size: .84rem; font-weight: 700; padding: 9px 15px; text-decoration: none; }
.shared-plans__tabs a.active { border-color: var(--interactive-primary); color: var(--interactive-active); }
.shared-plans__filters { align-items: end; background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 14px; display: grid; gap: 12px; grid-template-columns: minmax(180px, 240px) minmax(240px, 1fr); margin-bottom: 14px; padding: 14px; }
.shared-plans__filters label { color: var(--text-secondary); display: grid; font-size: .75rem; gap: 6px; }
.shared-plans__filters select,
.shared-plans__filters input { background: var(--surface-secondary); border: 1px solid var(--border-secondary); border-radius: 9px; color: var(--text-primary); font: inherit; min-height: 38px; outline: 0; padding: 0 11px; }
.shared-plans__search-control { position: relative; }
.shared-plans__search-control svg { color: var(--text-muted); left: 11px; position: absolute; top: 11px; }
.shared-plans__search-control input { padding-left: 36px; width: 100%; }
.shared-plans__notice { background: color-mix(in srgb, var(--semantic-error) 9%, var(--surface-primary)); border: 1px solid color-mix(in srgb, var(--semantic-error) 22%, var(--border-secondary)); border-radius: 11px; margin-bottom: 12px; padding: 10px 13px; }
.shared-plans__layout { align-items: start; display: grid; gap: 16px; grid-template-columns: minmax(270px, 340px) minmax(0, 1fr); }
.shared-plans__list { display: grid; gap: 10px; }
.shared-plans__list :deep(.plan-card__actions a), .shared-plans__list :deep(.plan-card__actions button) { background: transparent; border: 0; color: var(--interactive-active); cursor: pointer; font-size: .75rem; font-weight: 700; padding: 3px; text-decoration: none; }
.shared-plans__pagination { align-items: center; display: flex; justify-content: space-between; margin-top: 4px; }
.shared-plans__pagination button { background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 999px; color: var(--text-secondary); min-height: 34px; padding: 0 13px; }
.shared-plans__pagination button:disabled { opacity: .45; }
.shared-plans__pagination span { color: var(--text-muted); font-size: .78rem; }
.shared-plans__empty { align-items: center; background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 16px; color: var(--text-secondary); display: flex; flex-direction: column; justify-content: center; min-height: 320px; padding: 28px; text-align: center; }
.shared-plans__empty > svg { color: var(--interactive-primary); font-size: 2rem; }
.shared-plans__empty h2 { color: var(--text-primary); font-size: 1.1rem; margin: 12px 0 0; }
.shared-plans__empty p { margin: 8px 0 0; }
@media (max-width: 900px) { .shared-plans__layout { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .shared-plans { padding: 18px 14px 48px; } .shared-plans__filters { grid-template-columns: 1fr; } }
</style>
