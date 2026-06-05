<script setup lang="ts">
const { t } = useI18n()

const items = [
  { key: 'completed', className: 'is-completed', type: 'dot' },
  { key: 'inProgress', className: 'is-in-progress', type: 'dot' },
  { key: 'notTaken', className: 'is-not-taken', type: 'dot' },
  { key: 'interested', className: 'is-interested', type: 'dot' },
  { key: 'prerequisite', className: 'is-prerequisite', type: 'line' },
  { key: 'corequisite', className: 'is-corequisite', type: 'line' },
  { key: 'exclusion', className: 'is-exclusion', type: 'line' },
  { key: 'hollowLogic', className: 'is-hollow-logic', type: 'logic' },
  { key: 'solidLogic', className: 'is-solid-logic', type: 'logic' },
]
</script>

<template>
  <div class="cu-legend" aria-label="Course graph legend">
    <span v-for="item in items" :key="item.key" class="cu-legend__item">
      <i :class="['cu-legend__mark', `cu-legend__mark--${item.type}`, item.className]" aria-hidden="true"></i>
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

.cu-legend__mark {
  display: inline-block;
}

.cu-legend__mark--dot {
  border-radius: 999px;
  height: 9px;
  width: 9px;
}

.cu-legend__mark--logic {
  border: 2px solid var(--text-primary);
  border-radius: 999px;
  height: 10px;
  width: 10px;
}

.cu-legend__mark--line {
  border-radius: 999px;
  height: 0;
  width: 18px;
  border-top: 2px solid var(--text-primary);
}

.is-completed { background: var(--semantic-success); }
.is-in-progress { background: var(--interactive-primary); }
.is-not-taken { background: var(--border-primary); }
.is-interested { background: var(--text-secondary); }
.is-prerequisite { border-top-style: dashed; }
.is-corequisite { border-top-color: var(--semantic-info); }
.is-exclusion { border-top-color: var(--semantic-error); }
.is-hollow-logic { background: var(--surface-primary); }
.is-solid-logic { background: var(--text-primary); }
</style>
