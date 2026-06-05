<script setup lang="ts">
import {
  COURSE_UNIVERSE_MODES,
  type CourseUniverseModeKey,
} from '~/utils/courseUniverse'

const props = defineProps<{
  mode: CourseUniverseModeKey
}>()

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
</script>

<template>
  <header class="cu-toolbar">
    <div class="cu-toolbar__main">
      <div class="cu-toolbar__title">
        <h1>{{ t('courseUniverse.hubTitle') }}</h1>
      </div>

      <nav class="cu-toolbar__modes" :aria-label="t('nav.courses')">
        <NuxtLink
          v-for="item in COURSE_UNIVERSE_MODES"
          :key="item.key"
          :to="getLocalePath(item.path)"
          :class="['cu-toolbar__mode', { active: mode === item.key }]"
        >
          {{ t(item.labelKey) }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped lang="scss">
.cu-toolbar {
  align-items: center;
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.cu-toolbar__main {
  align-items: center;
  display: flex;
  gap: 16px;
  min-width: 0;
}

.cu-toolbar__title h1 {
  color: var(--text-primary);
  font-size: 1.55rem;
  font-weight: 750;
  margin: 0 0 4px;
}

.cu-toolbar__modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.cu-toolbar__mode {
  align-items: center;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 700;
  min-height: 36px;
  padding: 0 14px;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, color 0.2s;
}

.cu-toolbar__mode:hover {
  background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--interactive-primary) 35%, var(--border-primary));
  color: var(--interactive-active);
}

.cu-toolbar__mode.active {
  background: var(--surface-primary);
  border-color: var(--interactive-primary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--interactive-primary) 18%, transparent);
  color: var(--interactive-active);
}

@media (max-width: 768px) {
  .cu-toolbar {
    align-items: stretch;
    display: grid;
    gap: 10px;
  }

  .cu-toolbar__main {
    display: grid;
    gap: 10px;
  }

  .cu-toolbar__title h1 {
    font-size: 1.36rem;
  }

  .cu-toolbar__modes {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .cu-toolbar__mode {
    flex: 0 0 auto;
  }
}
</style>
