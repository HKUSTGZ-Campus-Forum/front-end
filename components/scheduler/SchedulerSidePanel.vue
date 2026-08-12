<!-- front-end/components/scheduler/SchedulerSidePanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse, SchedulerPopularityByCourse } from '~/utils/scheduler'
import { getSchedulerCoursePopularity } from '~/utils/scheduler'

type DisplayOption = 'name' | 'section' | 'location' | 'instructor' | 'duration'

const props = defineProps<{
  courseList: CartCourse[]
  currentPlan: { courseIndex: number; bundleId: number; layer: number }[]
  displayOptions: Record<DisplayOption, boolean>
  popularityByCourse: SchedulerPopularityByCourse
  popularityGeneratedAt: string | null
  showPopularity: boolean
  showPopularityHistory: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-course', code: string, enabled: boolean): void
  (e: 'toggle-bundle', code: string, bundleId: number, layer: number, enabled: boolean): void
  (e: 'toggle-layer', code: string, layer: number, enabled: boolean): void
  (e: 'show-info', code: string): void
  (e: 'show-popularity-history', code: string): void
  (e: 'open-cart'): void
  (e: 'toggle-filter'): void
  (e: 'update:display-option', key: DisplayOption, value: boolean): void
}>()

const activeTab = ref<'main' | 'klms'>('main')
const { t, locale } = useI18n()
const displayOptionKeys: DisplayOption[] = ['name', 'section', 'location', 'instructor', 'duration']

const filteredCourses = computed(() => {
  if (activeTab.value === 'klms') return props.courseList.filter(c => c.klms_course)
  return props.courseList.filter(c => !c.klms_course)
})

const currentSelectionMap = computed(() => {
  const map: Record<string, Record<number, number>> = {}
  for (const sel of props.currentPlan) {
    const course = props.courseList[sel.courseIndex]
    if (course) {
      map[course.course_code] ||= {}
      map[course.course_code][sel.layer] = sel.bundleId
    }
  }
  return map
})

const totalCredits = computed(() =>
  props.courseList.filter(c => c.enabled).reduce((sum, c) => sum + c.credit, 0)
)

const popularityUpdatedAt = computed(() => {
  if (!props.popularityGeneratedAt) return ''
  const generatedAt = new Date(props.popularityGeneratedAt)
  if (Number.isNaN(generatedAt.getTime())) return ''
  return t('scheduler.popularityUpdatedAt', {
    time: new Intl.DateTimeFormat(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(generatedAt),
  })
})

function updateDisplayOption(key: DisplayOption, event: Event) {
  emit('update:display-option', key, (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="side-panel">
    <div class="side-panel__header">
      <div class="side-panel__tabs">
        <button type="button" :class="{ active: activeTab === 'main' }" @click="activeTab = 'main'">{{ t('scheduler.main') }}</button>
        <button type="button" :class="{ active: activeTab === 'klms' }" @click="activeTab = 'klms'">{{ t('scheduler.klms') }}</button>
      </div>
      <div class="side-panel__credits">{{ t('scheduler.credits', { count: totalCredits }) }}</div>
    </div>

    <details class="side-panel__display" open>
      <summary>
        <span>{{ t('scheduler.display') }}</span>
        <span class="side-panel__display-count">
          {{ displayOptionKeys.filter((key) => displayOptions[key]).length }}/{{ displayOptionKeys.length }}
        </span>
      </summary>
      <label v-for="key in displayOptionKeys" :key="key" :class="{ active: displayOptions[key] }">
        <input
          type="checkbox"
          :checked="displayOptions[key]"
          @change="updateDisplayOption(key, $event)"
        >
        {{ t(`scheduler.display${key.charAt(0).toUpperCase()}${key.slice(1)}`) }}
      </label>
    </details>

    <div v-if="showPopularity" class="side-panel__popularity-note">
      <strong>{{ t('scheduler.popularity') }}</strong>
      <span>{{ t('scheduler.popularityExplanation') }}</span>
      <span v-if="popularityUpdatedAt">{{ popularityUpdatedAt }}</span>
    </div>

    <div class="side-panel__list">
      <SchedulerCourseCard
        v-for="(course, i) in filteredCourses"
        :key="course.course_code"
        :course="course"
        :course-index="courseList.indexOf(course)"
        :current-selection="currentSelectionMap[course.course_code]"
        :popularity="getSchedulerCoursePopularity(popularityByCourse, course.course_code)"
        :show-popularity="showPopularity"
        :show-popularity-history="showPopularityHistory"
        @toggle-course="(...args) => emit('toggle-course', ...args)"
        @toggle-bundle="(...args) => emit('toggle-bundle', ...args)"
        @toggle-layer="(...args) => emit('toggle-layer', ...args)"
        @show-info="(...args) => emit('show-info', ...args)"
        @show-popularity-history="(...args) => emit('show-popularity-history', ...args)"
      />
      <div v-if="filteredCourses.length === 0" class="side-panel__empty">
        <div class="side-panel__empty-title">{{ t('scheduler.emptyCart') }}</div>
        <p>{{ t('scheduler.emptyCartDescription') }}</p>
        <button type="button" class="side-panel__empty-btn" @click="emit('open-cart')">
          {{ t('scheduler.addCourse') }}
        </button>
      </div>
    </div>

    <div class="side-panel__actions">
      <button type="button" class="side-panel__btn" @click="emit('toggle-filter')">{{ t('scheduler.filter') }}</button>
      <button type="button" class="side-panel__btn side-panel__btn--primary" @click="emit('open-cart')">{{ t('scheduler.cart') }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid var(--border-secondary);
    background: var(--surface-secondary);
  }

  &__tabs {
    display: flex;
    gap: 4px;
    padding: 3px;
    border: 1px solid var(--border-secondary);
    border-radius: 11px;
    background: var(--surface-primary);

    button {
      min-height: 34px;
      padding: 0 12px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      transition: background 0.16s ease, color 0.16s ease;

      &.active {
        background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
        color: var(--interactive-active);
      }
    }
  }

  &__credits {
    flex-shrink: 0;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    background: var(--surface-secondary);
  }

  &__display {
    padding: 12px;
    border-bottom: 1px solid var(--border-secondary);
    color: var(--text-secondary);
    font-size: 0.8rem;
    background: var(--surface-primary);

    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      color: var(--text-primary);
      font-weight: 700;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }

    label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      margin: 10px 6px 0 0;
      padding: 0 10px;
      border: 1px solid var(--border-secondary);
      border-radius: 999px;
      background: var(--surface-secondary);
      color: var(--text-secondary);
      cursor: pointer;

      &.active {
        border-color: color-mix(in srgb, var(--interactive-primary) 35%, var(--border-secondary));
        background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
        color: var(--interactive-active);
      }

      input {
        accent-color: var(--interactive-primary);
      }
    }
  }

  &__display-count {
    color: var(--text-secondary);
    font-size: 0.76rem;
    font-weight: 700;
  }

  &__popularity-note {
    display: grid;
    gap: 3px;
    padding: 9px 12px;
    border-bottom: 1px solid var(--border-secondary);
    background: color-mix(in srgb, var(--interactive-primary) 5%, var(--surface-primary));
    color: var(--text-secondary);
    font-size: 0.7rem;
    line-height: 1.4;

    strong {
      color: var(--text-primary);
      font-size: 0.76rem;
    }
  }

  &__empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 38px 18px;
    border: 1px dashed var(--border-primary);
    border-radius: 14px;
    background: var(--surface-primary);
    font-size: 0.86rem;

    p {
      max-width: 240px;
      margin: 8px auto 0;
      line-height: 1.55;
    }
  }

  &__empty-title {
    color: var(--text-primary);
    font-size: 0.98rem;
    font-weight: 700;
  }

  &__empty-btn {
    min-height: 36px;
    margin-top: 16px;
    padding: 0 16px;
    border: 0;
    border-radius: 999px;
    background: var(--interactive-primary);
    color: var(--text-inverse);
    cursor: pointer;
    font-size: 0.84rem;
    font-weight: 700;

    &:hover {
      background: var(--interactive-hover);
    }
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    padding: 12px;
    border-top: 1px solid var(--border-secondary);
    background: var(--surface-primary);
  }

  &__btn {
    flex: 1;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: var(--surface-primary);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    &:hover { background: var(--surface-secondary); }

    &--primary {
      border-color: var(--interactive-primary);
      background: var(--interactive-primary);
      color: var(--text-inverse);
      &:hover { background: var(--interactive-hover); }
    }
  }
}

@media (max-width: 1024px) {
  .side-panel {
    min-height: 420px;
    height: auto;

    &__list {
      max-height: 520px;
    }
  }
}

@media (max-width: 520px) {
  .side-panel {
    &__header {
      align-items: stretch;
      flex-direction: column;
    }

    &__credits {
      padding-left: 4px;
    }
  }
}
</style>
