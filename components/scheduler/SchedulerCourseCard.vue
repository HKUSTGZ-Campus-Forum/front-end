<!-- front-end/components/scheduler/SchedulerCourseCard.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type {
  BundleData,
  CartCourse,
  IndexedSchedulerCoursePopularity,
} from '~/utils/scheduler'

const props = defineProps<{
  course: CartCourse
  semesterId: string
  currentSelection?: Record<number, number>
  popularity?: IndexedSchedulerCoursePopularity
  showPopularity: boolean
  mutationsDisabled: boolean
}>()
const { t } = useI18n()

const emit = defineEmits<{
  (e: 'toggle-course', code: string, currentEnabled: boolean): void
  (e: 'toggle-bundle', code: string, bundleId: number, layer: number, currentEnabled: boolean): void
  (e: 'toggle-layer', code: string, layer: number, enabled: boolean): void
}>()

function getBundleLabel(bundle: BundleData): string {
  return bundle.sections.map(s => s.section_type + s.name.replace(/\D/g, '')).join('/')
}

function isBundleSelected(layer: number, bundleId: number): boolean {
  return props.currentSelection?.[layer] === bundleId
}

function creditColorVar(credit: number): string {
  const level = Math.min(6, Math.max(1, credit))
  return `var(--credit-level-${level})`
}
</script>

<template>
  <div class="course-card" :class="{ 'course-card--disabled': !course.enabled }">
    <!-- Header: one compact line of meta + title, click toggles the course -->
    <div class="course-card__header" @click="!mutationsDisabled && emit('toggle-course', course.course_code, course.enabled)">
      <div class="course-card__info">
        <div class="course-card__meta">
          <span class="course-card__code">{{ course.course_code }}</span>
          <span class="course-card__credits" :style="{ color: creditColorVar(course.credit) }">· {{ t('scheduler.credits', { count: course.credit }) }}</span>
          <SchedulerPopularitySummary
            v-if="showPopularity && popularity"
            class="course-card__popularity"
            :counts="popularity"
          />
        </div>
        <div class="course-card__title">{{ course.course_title }}</div>
      </div>
      <div class="course-card__actions">
        <SchedulerCourseInfoPopover
          :course-code="course.course_code"
          :course-title="course.course_title"
          :credit="course.credit"
          :semester-id="semesterId"
        />
        <span class="course-card__dot" :class="{ 'course-card__dot--on': course.enabled }" />
      </div>
    </div>

    <!-- Bundle selection: one row per layer, capsules + enable-all/disable-all icons -->
    <div v-if="course.enabled" class="course-card__bundles">
      <div v-for="(bundles, layer) in course.layers" :key="layer" class="course-card__layer">
        <div class="course-card__bundle-row">
          <button
            v-for="bundle in bundles"
            :key="bundle.id"
            class="course-card__bundle"
            :class="{
              'course-card__bundle--active': bundle.enabled,
              'course-card__bundle--selected': isBundleSelected(Number(layer), bundle.id),
            }"
            type="button"
            :disabled="mutationsDisabled"
            @click="emit('toggle-bundle', course.course_code, bundle.id, Number(layer), bundle.enabled)"
          >
            {{ getBundleLabel(bundle) }}
          </button>
        </div>
        <div class="course-card__layer-actions">
          <button
            type="button"
            :title="t('scheduler.all')"
            :aria-label="t('scheduler.all')"
            :disabled="mutationsDisabled"
            @click="emit('toggle-layer', course.course_code, Number(layer), true)"
          >
            <Icon name="lucide:layers-plus" aria-hidden="true" />
          </button>
          <button
            type="button"
            :title="t('scheduler.none')"
            :aria-label="t('scheduler.none')"
            :disabled="mutationsDisabled"
            @click="emit('toggle-layer', course.course_code, Number(layer), false)"
          >
            <Icon name="lucide:trash" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.course-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 10px;
  box-shadow: var(--shadow-small);
  transition: opacity 0.2s, border-color 0.2s, background 0.2s;

  &:hover {
    border-color: color-mix(in srgb, var(--interactive-primary) 42%, var(--border-secondary));
    background: color-mix(in srgb, var(--interactive-primary) 4%, var(--surface-primary));
  }

  &--disabled {
    box-shadow: none;
    background: var(--surface-secondary);
    border-color: var(--border-secondary);
    opacity: 0.62;

    &:hover {
      border-color: var(--border-secondary);
      background: var(--surface-secondary);
    }

    .course-card__code,
    .course-card__title {
      color: var(--text-secondary);
    }
  }

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  &__code {
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--text-primary);
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  &__credits {
    flex-shrink: 0;
    font-size: 0.72rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  &__popularity {
    flex-shrink: 0;
    align-self: center;
    margin-left: 8px;
  }

  &__title {
    margin-top: 3px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  &__dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--text-muted);
    flex-shrink: 0;
    transition: background 0.2s;
    &--on { background: var(--semantic-success); }
  }

  &__bundles {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-secondary);
  }

  &__layer {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__bundle-row {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  &__bundle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--scheduler-chip-bg);
    border: 1px solid var(--scheduler-chip-border);
    border-radius: 8px;
    min-height: 26px;
    padding: 2px 10px;
    font-size: 0.74rem;
    cursor: pointer;
    color: var(--scheduler-chip-text);
    position: relative;
    transition: all 0.15s;

    &--active {
      background: var(--scheduler-chip-bg-active);
      border-color: var(--scheduler-chip-border-active);
      color: var(--scheduler-chip-text-active);
    }

    &--selected {
      background: var(--scheduler-chip-bg-selected);
      border-color: var(--scheduler-chip-border-selected);
      color: var(--scheduler-chip-text-active);
      box-shadow: var(--shadow-small);
      &::after {
        content: '';
        position: absolute;
        top: -2px;
        right: -2px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--semantic-warning);
      }
    }

    // Disabled bundle (not enabled): hover stays muted gray, never turns blue
    &:hover:not(:disabled) {
      background: var(--scheduler-chip-bg-hover);
      border-color: var(--scheduler-chip-border-hover);
      color: var(--scheduler-chip-text);
    }

    &--active:hover:not(:disabled) {
      background: var(--scheduler-chip-bg-active-hover);
      border-color: var(--scheduler-chip-border-active);
      color: var(--scheduler-chip-text-active);
    }

    &--selected:hover:not(:disabled) {
      background: var(--scheduler-chip-bg-selected-hover);
      border-color: var(--scheduler-chip-border-selected);
      color: var(--scheduler-chip-text-active);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  &__layer-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;

    button {
      width: 26px;
      height: 26px;
      min-height: 0;
      padding: 0;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--text-secondary);
      font-size: 15px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;

      &:hover:not(:disabled) {
        background: var(--surface-secondary);
        color: var(--interactive-active-text);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
}
</style>
