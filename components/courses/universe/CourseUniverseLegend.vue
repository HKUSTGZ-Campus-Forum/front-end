<script setup lang="ts">
const { t } = useI18n()

const items = [
  { key: 'completed', className: 'is-completed' },
  { key: 'inProgress', className: 'is-in-progress' },
  { key: 'planned', className: 'is-planned' },
  { key: 'interested', className: 'is-interested' },
  { key: 'inPlanner', className: 'is-planner' },
  { key: 'blocker', className: 'is-blocker' },
  { key: 'reviewSignal', className: 'is-review' },
]
</script>

<template>
  <div class="cu-legend" aria-label="Course graph legend">
    <span v-for="item in items" :key="item.key" class="cu-legend__item">
      <i :class="['cu-legend__dot', item.className]" aria-hidden="true"></i>
      {{ t(`courseUniverse.legend.${item.key}`) }}
    </span>
  </div>
</template>

<style scoped lang="scss">
.cu-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cu-legend__item {
  align-items: center;
  background: color-mix(in srgb, var(--surface-primary) 88%, transparent);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 7px;
  min-height: 30px;
  padding: 0 10px;
}

.cu-legend__dot {
  border-radius: 999px;
  display: inline-block;
  height: 9px;
  width: 9px;
}

.is-completed { background: var(--semantic-success); }
.is-in-progress { background: var(--interactive-primary); }
.is-planned { background: #7c3aed; }
.is-interested { background: #8b9bb2; }
.is-planner { background: #0ea5e9; }
.is-blocker { background: var(--semantic-warning); }
.is-review { background: #a855f7; }
</style>
