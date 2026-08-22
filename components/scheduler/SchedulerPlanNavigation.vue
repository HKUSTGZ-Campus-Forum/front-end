<script setup lang="ts">
defineProps<{
  active: 'mine' | 'shared'
}>()

const { t } = useI18n()
const { plannerTo, plansTo, sharedTo } = useSchedulerPlanNavigation()
</script>

<template>
  <nav class="plan-navigation" :aria-label="t('scheduler.savedPlans.navigation')">
    <NuxtLink class="plan-navigation__back" :to="plannerTo">
      <Icon name="lucide:arrow-left" aria-hidden="true" />
      <span>{{ t('scheduler.savedPlans.backToPlanner') }}</span>
    </NuxtLink>

    <div class="plan-navigation__tabs">
      <NuxtLink
        :class="{ active: active === 'mine' }"
        :aria-current="active === 'mine' ? 'page' : undefined"
        :to="plansTo"
      >
        {{ t('scheduler.savedPlans.mine') }}
      </NuxtLink>
      <NuxtLink
        :class="{ active: active === 'shared' }"
        :aria-current="active === 'shared' ? 'page' : undefined"
        :to="sharedTo"
      >
        {{ t('scheduler.savedPlans.shared') }}
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.plan-navigation {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 16px;
  min-width: 0;
}

.plan-navigation__back,
.plan-navigation__tabs a {
  align-items: center;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  min-height: 44px;
  text-decoration: none;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.plan-navigation__back {
  gap: 7px;
  padding: 0 14px;
}

.plan-navigation__back:hover,
.plan-navigation__tabs a:hover {
  background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--interactive-primary) 35%, var(--border-secondary));
  color: var(--interactive-active);
}

.plan-navigation__tabs {
  display: flex;
  gap: 8px;
}

.plan-navigation__tabs a {
  padding: 0 15px;
  white-space: nowrap;
}

.plan-navigation__tabs a.active {
  border-color: var(--interactive-primary);
  color: var(--interactive-active);
}

.plan-navigation__back:focus-visible,
.plan-navigation__tabs a:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .plan-navigation {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
  }

  .plan-navigation__back {
    align-self: flex-start;
  }

  .plan-navigation__tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-navigation__tabs a {
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .plan-navigation__back,
  .plan-navigation__tabs a {
    transition: none;
  }
}
</style>
