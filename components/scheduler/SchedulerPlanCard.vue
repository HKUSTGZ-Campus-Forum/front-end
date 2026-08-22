<script setup lang="ts">
import type { SchedulerSavedPlan } from '~/utils/scheduler'

defineProps<{ plan: SchedulerSavedPlan; active?: boolean }>()
defineEmits<{ (e: 'select'): void }>()
const { t, locale } = useI18n()

function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}
</script>

<template>
  <article :class="['plan-card', { 'plan-card--active': active }]">
    <button type="button" class="plan-card__main" @click="$emit('select')">
      <span class="plan-card__top">
        <strong>{{ plan.name }}</strong>
        <SchedulerPlanStatus :availability="plan.availability" />
      </span>
      <span class="plan-card__courses">{{ plan.course_codes.join(' · ') }}</span>
      <span class="plan-card__meta">
        {{ t('scheduler.savedPlans.courseCount', { count: plan.course_count }) }}
        · {{ t('scheduler.creditsShort', { count: plan.total_credits }) }}
        · {{ formatDate(plan.updated_at) }}
      </span>
    </button>
    <div v-if="$slots.actions" class="plan-card__actions"><slot name="actions" /></div>
  </article>
</template>

<style scoped lang="scss">
.plan-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  box-shadow: var(--shadow-small);
  overflow: hidden;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.plan-card:hover,
.plan-card--active {
  border-color: color-mix(in srgb, var(--interactive-primary) 44%, var(--border-secondary));
  box-shadow: var(--shadow-medium);
  transform: translateY(-1px);
}

.plan-card__main {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: block;
  padding: 15px;
  text-align: left;
  width: 100%;
}

.plan-card__top {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.plan-card__top strong {
  color: var(--text-primary);
  font-size: 0.96rem;
  line-height: 1.35;
}

.plan-card__courses {
  color: var(--interactive-active);
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
  margin-top: 8px;
}

.plan-card__meta {
  color: var(--text-muted);
  display: block;
  font-size: 0.75rem;
  margin-top: 5px;
}

.plan-card__actions {
  align-items: center;
  border-top: 1px solid var(--border-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 9px 12px;
}
</style>
