<script setup lang="ts">
import {
  COURSE_UNIVERSE_MODES,
  type CourseUniverseModeKey,
} from '~/utils/courseUniverse'

withDefaults(defineProps<{
  mode: CourseUniverseModeKey
  title?: string
  subtitle?: string
}>(), {
  title: '',
  subtitle: '',
})

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
</script>

<template>
  <header class="course-tools-header">
    <div class="course-tools-header__copy">
      <div class="course-tools-header__row">
        <h1>{{ title || t('courseUniverse.hubTitle') }}</h1>

        <nav class="course-tools-header__modes" :aria-label="t('nav.courses')">
          <NuxtLink
            v-for="item in COURSE_UNIVERSE_MODES"
            :key="item.key"
            :to="getLocalePath(item.path)"
            :class="['course-tools-header__mode', { active: mode === item.key }]"
          >
            {{ t(item.labelKey) }}
          </NuxtLink>
        </nav>

        <div v-if="$slots.actions" class="course-tools-header__actions">
          <slot name="actions" />
        </div>
      </div>

      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
  </header>
</template>

<style scoped lang="scss">
.course-tools-header {
  margin-bottom: 16px;
}

.course-tools-header__copy {
  min-width: 0;
}

.course-tools-header__row {
  align-items: center;
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  min-width: 0;
}

.course-tools-header__copy h1 {
  color: var(--text-primary);
  font-size: 1.55rem;
  font-weight: 750;
  line-height: 1.25;
  margin: 0;
}

.course-tools-header__copy p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.55;
  margin: 7px 0 0;
  max-width: 680px;
}

.course-tools-header__modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.course-tools-header__actions {
  align-items: center;
  display: flex;
  margin-left: auto;
}

.course-tools-header__mode {
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
  white-space: nowrap;
}

.course-tools-header__mode:hover {
  background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
  border-color: color-mix(in srgb, var(--interactive-primary) 35%, var(--border-primary));
  color: var(--interactive-active);
}

.course-tools-header__mode.active {
  background: var(--surface-primary);
  border-color: var(--interactive-primary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--interactive-primary) 18%, transparent);
  color: var(--interactive-active);
}

@media (max-width: 768px) {
  .course-tools-header {
    margin-bottom: 18px;
  }

  .course-tools-header__row {
    display: grid;
    gap: 10px;
  }

  .course-tools-header__copy h1 {
    font-size: 1.36rem;
  }

  .course-tools-header__modes {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .course-tools-header__mode {
    flex: 0 0 auto;
  }

  .course-tools-header__actions {
    margin-left: 0;
  }
}
</style>
