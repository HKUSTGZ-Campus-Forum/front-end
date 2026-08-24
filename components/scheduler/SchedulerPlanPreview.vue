<script setup lang="ts">
import type { SchedulerSavedPlan } from '~/utils/scheduler'
import { getMaxDayNum } from '~/utils/scheduler'

const props = defineProps<{ plan: SchedulerSavedPlan }>()
const { t } = useI18n()
const emptyBans = Array.from({ length: 7 }, () => Array(8).fill(false))
const maxDayNum = computed(() => getMaxDayNum(props.plan.courses || [], props.plan.selections || []))
const displayOptions = {
  name: true,
  section: true,
  location: true,
  instructor: true,
  duration: false,
}
</script>

<template>
  <section class="plan-preview">
    <div class="plan-preview__heading">
      <div>
        <p>{{ t('scheduler.savedPlans.preview') }}</p>
        <h2>{{ plan.name }}</h2>
      </div>
      <SchedulerPlanStatus :availability="plan.availability" />
    </div>

    <div class="plan-preview__meta">
      <span>{{ t('scheduler.savedPlans.courseCount', { count: plan.course_count }) }}</span>
      <span>{{ t('scheduler.credits', { count: plan.total_credits }) }}</span>
      <span>{{ plan.semester_id }}</span>
    </div>

    <div class="plan-preview__table">
      <SchedulerTimetable
        :course-list="plan.courses || []"
        :current-plan="plan.selections || []"
        :banned-periods="emptyBans"
        :filter-mode="false"
        :display-options="displayOptions"
        :max-day-num="maxDayNum"
        :preview-section="null"
        :preview-section-enabled="false"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.plan-preview {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  min-width: 0;
  overflow: hidden;
  padding: 18px;
}

.plan-preview__heading {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.plan-preview__heading p {
  color: var(--interactive-active);
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.plan-preview__heading h2 {
  color: var(--text-primary);
  font-size: 1.18rem;
  margin: 0;
}

.plan-preview__meta {
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.8rem;
  gap: 8px 16px;
  margin: 10px 0 14px;
}

.plan-preview__table {
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  height: 560px;
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 768px) {
  .plan-preview { padding: 14px; }
  .plan-preview__table { height: 500px; }
}
</style>
