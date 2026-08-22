<script setup lang="ts">
import type { SchedulerPlanAvailability, SchedulerPlanVisibility } from '~/utils/scheduler'

const props = defineProps<{
  availability?: SchedulerPlanAvailability
  visibility?: SchedulerPlanVisibility
}>()

const { t } = useI18n()
const status = computed(() => props.availability || props.visibility || 'private')
</script>

<template>
  <span :class="['plan-status', `plan-status--${status}`]">
    <span class="plan-status__dot" aria-hidden="true"></span>
    {{ t(`scheduler.savedPlans.status.${status}`) }}
  </span>
</template>

<style scoped>
.plan-status {
  align-items: center;
  background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 18%, var(--border-secondary));
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-size: 0.74rem;
  font-weight: 700;
  gap: 6px;
  min-height: 26px;
  padding: 0 9px;
  white-space: nowrap;
}

.plan-status__dot {
  background: var(--interactive-primary);
  border-radius: 50%;
  height: 6px;
  width: 6px;
}

.plan-status--updated,
.plan-status--unlisted {
  background: color-mix(in srgb, var(--semantic-warning) 10%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--semantic-warning) 24%, var(--border-secondary));
}

.plan-status--updated .plan-status__dot,
.plan-status--unlisted .plan-status__dot { background: var(--semantic-warning); }

.plan-status--unavailable {
  background: color-mix(in srgb, var(--semantic-error) 9%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--semantic-error) 22%, var(--border-secondary));
}

.plan-status--unavailable .plan-status__dot { background: var(--semantic-error); }

.plan-status--private .plan-status__dot { background: var(--text-muted); }
</style>
