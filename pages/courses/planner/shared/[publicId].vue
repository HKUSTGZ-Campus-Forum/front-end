<script setup lang="ts">
import type { SchedulerSavedPlan } from '~/utils/scheduler'

definePageMeta({ layout: 'keguang' })

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { isLoggedIn } = useAuth()
const { getPlan, applyPlan, clonePlan } = useScheduler()
const { sharedTo, toPlanPage } = useSchedulerPlanNavigation()

const plan = ref<SchedulerSavedPlan | null>(null)
const loading = ref(true)
const error = ref('')
const actionLoading = ref(false)

onMounted(async () => {
  try {
    plan.value = await getPlan(String(route.params.publicId))
  } catch {
    error.value = t('scheduler.savedPlans.notFound')
  } finally {
    loading.value = false
  }
})

async function requireLogin() {
  if (isLoggedIn.value) return true
  await router.push(getLocalePath('/login'))
  return false
}

async function useCurrentPlan() {
  if (!plan.value || !await requireLogin()) return
  actionLoading.value = true
  try {
    await applyPlan(plan.value.public_id)
    await router.push(getLocalePath({
      path: `/courses/planner/${plan.value.semester_id}`,
      query: { plan: plan.value.public_id },
    }))
  } catch (reason) {
    const code = (reason as Error & { code?: string }).code
    error.value = code === 'updated_plan_conflict'
      ? t('scheduler.savedPlans.applyConflict')
      : code === 'plan_unavailable'
        ? t('scheduler.savedPlans.applyUnavailable')
        : t('scheduler.savedPlans.applyFailed')
  } finally {
    actionLoading.value = false
  }
}

async function copyCurrentPlan() {
  if (!plan.value || !await requireLogin()) return
  actionLoading.value = true
  try {
    const copyName = t('scheduler.savedPlans.copyName', { name: plan.value.name }).slice(0, 80).trim()
    const copy = await clonePlan(plan.value.public_id, copyName)
    await router.push(toPlanPage('/courses/planner/plans', { plan: copy.public_id }))
  } catch {
    error.value = t('scheduler.savedPlans.copyFailed')
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <main class="shared-detail">
    <NuxtLink class="shared-detail__back" :to="sharedTo">
      <Icon name="lucide:arrow-left" aria-hidden="true" />{{ t('scheduler.savedPlans.backToShared') }}
    </NuxtLink>

    <section v-if="loading" class="shared-detail__state">{{ t('scheduler.loading') }}</section>
    <section v-else-if="!plan" class="shared-detail__state shared-detail__state--error">
      <Icon name="lucide:calendar-x-2" aria-hidden="true" />
      <h1>{{ t('scheduler.savedPlans.notFoundTitle') }}</h1>
      <p>{{ error }}</p>
    </section>

    <template v-else>
      <header class="shared-detail__header">
        <div>
          <div class="shared-detail__eyebrow">{{ t('scheduler.savedPlans.sharedBy', { name: plan.author.username }) }}</div>
          <h1>{{ plan.name }}</h1>
          <p v-if="plan.description">{{ plan.description }}</p>
          <div class="shared-detail__badges">
            <SchedulerPlanStatus :availability="plan.availability" />
            <SchedulerPlanStatus :visibility="plan.visibility" />
          </div>
        </div>
        <div class="shared-detail__actions">
          <button v-if="!plan.is_owner" type="button" class="shared-detail__secondary" :disabled="actionLoading" @click="copyCurrentPlan">
            <Icon name="lucide:copy-plus" aria-hidden="true" />{{ t('scheduler.savedPlans.copy') }}
          </button>
          <button type="button" class="shared-detail__primary" :disabled="actionLoading || plan.availability === 'unavailable'" @click="useCurrentPlan">
            <Icon name="lucide:calendar-check-2" aria-hidden="true" />{{ t('scheduler.savedPlans.use') }}
          </button>
        </div>
      </header>
      <div v-if="error" class="shared-detail__notice" role="alert">{{ error }}</div>
      <SchedulerPlanPreview :plan="plan" />
    </template>
  </main>
</template>

<style scoped lang="scss">
.shared-detail { margin: 0 auto; max-width: 1120px; padding: 24px 20px 64px; width: 100%; }
.shared-detail__back { align-items: center; color: var(--interactive-active); display: inline-flex; font-size: .82rem; font-weight: 700; gap: 7px; margin-bottom: 18px; text-decoration: none; }
.shared-detail__header { align-items: flex-start; display: flex; gap: 24px; justify-content: space-between; margin-bottom: 16px; }
.shared-detail__eyebrow { color: var(--interactive-active); font-size: .78rem; font-weight: 700; margin-bottom: 5px; }
.shared-detail__header h1 { color: var(--text-primary); font-size: 1.65rem; margin: 0; }
.shared-detail__header p { color: var(--text-secondary); line-height: 1.55; margin: 8px 0 0; max-width: 680px; }
.shared-detail__badges { display: flex; gap: 7px; margin-top: 11px; }
.shared-detail__actions { display: flex; flex-shrink: 0; gap: 9px; }
.shared-detail__actions button { align-items: center; border-radius: 999px; cursor: pointer; display: inline-flex; font: inherit; font-size: .84rem; font-weight: 700; gap: 7px; min-height: 40px; padding: 0 16px; }
.shared-detail__primary { background: var(--btn-primary-bg); border: 1px solid transparent; color: var(--text-inverse); }
.shared-detail__secondary { background: var(--surface-primary); border: 1px solid var(--border-secondary); color: var(--interactive-active); }
.shared-detail__actions button:disabled { cursor: not-allowed; opacity: .5; }
.shared-detail__notice { background: color-mix(in srgb, var(--semantic-error) 9%, var(--surface-primary)); border: 1px solid color-mix(in srgb, var(--semantic-error) 22%, var(--border-secondary)); border-radius: 11px; margin-bottom: 12px; padding: 10px 13px; }
.shared-detail__state { align-items: center; background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 16px; color: var(--text-secondary); display: flex; flex-direction: column; justify-content: center; min-height: 380px; padding: 28px; text-align: center; }
.shared-detail__state svg { color: var(--semantic-error); font-size: 2rem; }
.shared-detail__state h1 { color: var(--text-primary); margin: 12px 0 0; }
.shared-detail__state p { margin: 8px 0 0; }
@media (max-width: 700px) { .shared-detail { padding: 18px 14px 48px; } .shared-detail__header { flex-direction: column; } .shared-detail__actions { width: 100%; } .shared-detail__actions button { flex: 1; justify-content: center; } }
</style>
