<script setup lang="ts">
import CourseToolsHeader from '~/components/courses/CourseToolsHeader.vue'
import type { SchedulerSavedPlan, SchedulerPlanVisibility } from '~/utils/scheduler'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const router = useRouter()
const route = useRoute()
const { isLoggedIn, authInitialized } = useAuth()
const { getMyPlans, updatePlan, deletePlan, applyPlan } = useScheduler()

const plans = ref<SchedulerSavedPlan[]>([])
const selectedId = ref('')
const semester = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')
const editing = ref<SchedulerSavedPlan | null>(null)
const submitting = ref(false)

const selected = computed(() => plans.value.find(plan => plan.public_id === selectedId.value) || plans.value[0] || null)
const semesterOptions = computed(() => [...new Set(plans.value.map(plan => plan.semester_id))].sort().reverse())

async function loadPlans() {
  if (!authInitialized.value || !isLoggedIn.value) return
  loading.value = true
  error.value = ''
  try {
    plans.value = await getMyPlans(semester.value)
    if (!plans.value.some(plan => plan.public_id === selectedId.value)) {
      const requested = typeof route.query.plan === 'string' ? route.query.plan : ''
      selectedId.value = plans.value.some(plan => plan.public_id === requested)
        ? requested
        : plans.value[0]?.public_id || ''
    }
  } catch {
    error.value = t('scheduler.savedPlans.loadFailed')
  } finally {
    loading.value = false
  }
}

watch([authInitialized, isLoggedIn], () => void loadPlans(), { immediate: true })
watch(semester, () => void loadPlans())

async function usePlan(plan: SchedulerSavedPlan) {
  error.value = ''
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

async function copyLink(plan: SchedulerSavedPlan) {
  let sharePlan = plan
  try {
    if (plan.visibility === 'private') {
      sharePlan = await updatePlan(plan.public_id, { version: plan.version, visibility: 'unlisted' })
      plans.value = plans.value.map(item => item.public_id === sharePlan.public_id ? sharePlan : item)
    }
    const path = getLocalePath(`/courses/planner/shared/${sharePlan.public_id}`)
    await navigator.clipboard.writeText(new URL(path, window.location.origin).toString())
    message.value = t('scheduler.savedPlans.linkCopied')
  } catch {
    error.value = t('scheduler.savedPlans.shareFailed')
  }
}

async function setPublic(plan: SchedulerSavedPlan) {
  try {
    const visibility: SchedulerPlanVisibility = plan.visibility === 'public' ? 'unlisted' : 'public'
    const updated = await updatePlan(plan.public_id, { version: plan.version, visibility })
    plans.value = plans.value.map(item => item.public_id === updated.public_id ? updated : item)
    message.value = visibility === 'public'
      ? t('scheduler.savedPlans.publishedMessage')
      : t('scheduler.savedPlans.unpublishedMessage')
  } catch {
    error.value = t('scheduler.savedPlans.saveFailed')
  }
}

async function removePlan(plan: SchedulerSavedPlan) {
  if (!window.confirm(t('scheduler.savedPlans.deleteConfirm', { name: plan.name }))) return
  try {
    await deletePlan(plan.public_id)
    plans.value = plans.value.filter(item => item.public_id !== plan.public_id)
    selectedId.value = plans.value[0]?.public_id || ''
    message.value = t('scheduler.savedPlans.deletedMessage')
  } catch {
    error.value = t('scheduler.savedPlans.deleteFailed')
  }
}

async function saveMetadata(value: {
  name: string
  description: string
  visibility: SchedulerPlanVisibility
}) {
  if (!editing.value) return
  submitting.value = true
  error.value = ''
  try {
    const updated = await updatePlan(editing.value.public_id, {
      version: editing.value.version,
      name: value.name,
      description: value.description,
      visibility: value.visibility,
    })
    plans.value = plans.value.map(item => item.public_id === updated.public_id ? updated : item)
    editing.value = null
    message.value = t('scheduler.savedPlans.updatedMessage')
  } catch (reason) {
    error.value = (reason as Error & { code?: string }).code === 'version_conflict'
      ? t('scheduler.savedPlans.versionConflict')
      : t('scheduler.savedPlans.saveFailed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="plans-page">
    <CourseToolsHeader :mode="'planner'" :title="t('scheduler.savedPlans.mineTitle')" :subtitle="t('scheduler.savedPlans.mineSubtitle')">
      <template #actions>
        <NuxtLink class="plans-page__primary" :to="getLocalePath('/courses/planner')">
          <Icon name="lucide:plus" aria-hidden="true" />{{ t('scheduler.savedPlans.new') }}
        </NuxtLink>
      </template>
    </CourseToolsHeader>

    <nav class="plans-page__tabs" :aria-label="t('scheduler.savedPlans.navigation')">
      <NuxtLink class="active" :to="getLocalePath('/courses/planner/plans')">{{ t('scheduler.savedPlans.mine') }}</NuxtLink>
      <NuxtLink :to="getLocalePath('/courses/planner/shared')">{{ t('scheduler.savedPlans.shared') }}</NuxtLink>
    </nav>

    <div v-if="message" class="plans-page__notice" role="status">{{ message }}</div>
    <div v-if="error" class="plans-page__notice plans-page__notice--error" role="alert">{{ error }}</div>

    <section v-if="authInitialized && !isLoggedIn" class="plans-page__empty">
      <Icon name="lucide:lock-keyhole" aria-hidden="true" />
      <h2>{{ t('scheduler.savedPlans.loginTitle') }}</h2>
      <p>{{ t('scheduler.savedPlans.loginDescription') }}</p>
      <NuxtLink class="plans-page__primary" :to="getLocalePath('/login')">{{ t('actions.login') }}</NuxtLink>
    </section>

    <div v-else-if="loading" class="plans-page__empty">{{ t('scheduler.loading') }}</div>

    <template v-else-if="isLoggedIn">
      <div class="plans-page__toolbar">
        <label>
          <span>{{ t('scheduler.savedPlans.semesterFilter') }}</span>
          <select v-model="semester">
            <option value="">{{ t('scheduler.savedPlans.allSemesters') }}</option>
            <option v-for="value in semesterOptions" :key="value" :value="value">{{ value }}</option>
          </select>
        </label>
        <span>{{ t('scheduler.savedPlans.planTotal', { count: plans.length }) }}</span>
      </div>

      <section v-if="plans.length" class="plans-page__layout">
        <div class="plans-page__list">
          <SchedulerPlanCard
            v-for="plan in plans"
            :key="plan.public_id"
            :plan="plan"
            :active="selected?.public_id === plan.public_id"
            @select="selectedId = plan.public_id"
          >
            <template #actions>
              <button type="button" @click="usePlan(plan)">{{ t('scheduler.savedPlans.use') }}</button>
              <button type="button" @click="editing = plan">{{ t('common.edit') }}</button>
              <button type="button" @click="copyLink(plan)">{{ t('scheduler.savedPlans.share') }}</button>
              <button type="button" @click="setPublic(plan)">
                {{ plan.visibility === 'public' ? t('scheduler.savedPlans.unpublish') : t('scheduler.savedPlans.publish') }}
              </button>
              <button type="button" class="is-danger" @click="removePlan(plan)">{{ t('common.delete') }}</button>
            </template>
          </SchedulerPlanCard>
        </div>
        <SchedulerPlanPreview v-if="selected" :plan="selected" />
      </section>

      <section v-else class="plans-page__empty">
        <Icon name="lucide:calendar-plus-2" aria-hidden="true" />
        <h2>{{ t('scheduler.savedPlans.emptyMineTitle') }}</h2>
        <p>{{ t('scheduler.savedPlans.emptyMineDescription') }}</p>
        <NuxtLink class="plans-page__primary" :to="getLocalePath('/courses/planner')">{{ t('scheduler.savedPlans.startPlanning') }}</NuxtLink>
      </section>
    </template>

    <SchedulerPlanDialog
      :visible="Boolean(editing)"
      :initial-name="editing?.name || ''"
      :initial-description="editing?.description || ''"
      :initial-visibility="editing?.visibility || 'private'"
      :allow-update="true"
      :submitting="submitting"
      :error="error"
      @close="editing = null"
      @save="saveMetadata"
    />
  </main>
</template>

<style scoped lang="scss">
.plans-page { margin: 0 auto; max-width: 1240px; padding: 24px 20px 64px; width: 100%; }
.plans-page__primary { align-items: center; background: var(--btn-primary-bg); border-radius: 999px; color: var(--text-inverse); display: inline-flex; font-size: .86rem; font-weight: 700; gap: 7px; min-height: 40px; padding: 0 16px; text-decoration: none; }
.plans-page__tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.plans-page__tabs a { background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 999px; color: var(--text-secondary); font-size: .84rem; font-weight: 700; padding: 9px 15px; text-decoration: none; }
.plans-page__tabs a.active { border-color: var(--interactive-primary); color: var(--interactive-active); }
.plans-page__notice { background: color-mix(in srgb, var(--semantic-success) 10%, var(--surface-primary)); border: 1px solid color-mix(in srgb, var(--semantic-success) 25%, var(--border-secondary)); border-radius: 11px; color: var(--text-primary); font-size: .84rem; margin-bottom: 12px; padding: 10px 13px; }
.plans-page__notice--error { background: color-mix(in srgb, var(--semantic-error) 9%, var(--surface-primary)); border-color: color-mix(in srgb, var(--semantic-error) 22%, var(--border-secondary)); }
.plans-page__toolbar { align-items: flex-end; display: flex; justify-content: space-between; margin-bottom: 14px; }
.plans-page__toolbar label { color: var(--text-secondary); display: grid; font-size: .75rem; gap: 5px; }
.plans-page__toolbar select { background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 9px; color: var(--text-primary); min-height: 36px; padding: 0 32px 0 10px; }
.plans-page__toolbar > span { color: var(--text-muted); font-size: .8rem; }
.plans-page__layout { align-items: start; display: grid; gap: 16px; grid-template-columns: minmax(270px, 340px) minmax(0, 1fr); }
.plans-page__list { display: grid; gap: 10px; }
.plans-page__list :deep(.plan-card__actions button) { background: transparent; border: 0; color: var(--interactive-active); cursor: pointer; font-size: .75rem; font-weight: 700; padding: 3px; }
.plans-page__list :deep(.plan-card__actions button.is-danger) { color: var(--semantic-error); margin-left: auto; }
.plans-page__empty { align-items: center; background: var(--surface-primary); border: 1px solid var(--border-secondary); border-radius: 16px; color: var(--text-secondary); display: flex; flex-direction: column; min-height: 320px; justify-content: center; padding: 28px; text-align: center; }
.plans-page__empty > svg { color: var(--interactive-primary); font-size: 2rem; }
.plans-page__empty h2 { color: var(--text-primary); font-size: 1.1rem; margin: 12px 0 0; }
.plans-page__empty p { margin: 8px 0 18px; max-width: 440px; }
@media (max-width: 900px) { .plans-page__layout { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .plans-page { padding: 18px 14px 48px; } .plans-page__toolbar { align-items: stretch; flex-direction: column; gap: 8px; } }
</style>
