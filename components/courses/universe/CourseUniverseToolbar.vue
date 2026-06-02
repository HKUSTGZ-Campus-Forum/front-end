<script setup lang="ts">
import { computed } from 'vue'
import type { SemesterInfo } from '~/utils/scheduler'
import { COURSE_UNIVERSE_MODES, type CourseUniverseModeKey } from '~/utils/courseUniverse'

const props = defineProps<{
  mode: CourseUniverseModeKey
  searchQuery: string
  semesters: SemesterInfo[]
  selectedSemester: string
}>()

const emit = defineEmits<{
  (event: 'update:searchQuery', value: string): void
  (event: 'update:selectedSemester', value: string): void
}>()

const { t, locale } = useI18n()
const { getLocalePath } = useAppLocale()

const semesterOptions = computed(() => props.semesters.map(semester => ({
  id: semester.id,
  label: locale.value === 'zh' ? semester.name_zh : semester.name,
})))
</script>

<template>
  <header class="cu-toolbar">
    <div class="cu-toolbar__title">
      <h1>{{ t('courseUniverse.title') }}</h1>
      <p>{{ t('courseUniverse.subtitle') }}</p>
    </div>

    <div class="cu-toolbar__controls">
      <input
        :value="searchQuery"
        class="cu-toolbar__search"
        type="search"
        :placeholder="t('courseUniverse.searchPlaceholder')"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      />

      <select
        :value="selectedSemester"
        class="cu-toolbar__select"
        :aria-label="t('courseUniverse.selectedSemester')"
        @change="emit('update:selectedSemester', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="semester in semesterOptions" :key="semester.id" :value="semester.id">
          {{ semester.label }}
        </option>
      </select>
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
  </header>
</template>

<style scoped lang="scss">
.cu-toolbar {
  display: grid;
  gap: 14px;
  margin-bottom: 16px;
}

.cu-toolbar__title h1 {
  color: var(--text-primary);
  font-size: 1.55rem;
  font-weight: 750;
  margin: 0 0 4px;
}

.cu-toolbar__title p {
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
  margin: 0;
}

.cu-toolbar__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cu-toolbar__search,
.cu-toolbar__select {
  min-height: 42px;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.cu-toolbar__search {
  flex: 1 1 280px;
  padding: 0 14px;
}

.cu-toolbar__select {
  flex: 0 0 190px;
  padding: 0 12px;
}

.cu-toolbar__search:focus,
.cu-toolbar__select:focus {
  border-color: var(--interactive-primary);
}

.cu-toolbar__modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cu-toolbar__mode {
  align-items: center;
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 700;
  min-height: 36px;
  padding: 0 14px;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.cu-toolbar__mode:hover,
.cu-toolbar__mode.active {
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
  color: var(--text-inverse);
}
</style>
