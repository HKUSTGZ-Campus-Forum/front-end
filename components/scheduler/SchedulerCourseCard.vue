<!-- front-end/components/scheduler/SchedulerCourseCard.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type {
  BundleData,
  CartCourse,
  IndexedSchedulerCoursePopularity,
  SchedulerSection,
} from '~/utils/scheduler'

const props = defineProps<{
  course: CartCourse
  courseIndex: number
  currentSelection?: Record<number, number>
  popularity?: IndexedSchedulerCoursePopularity
  showPopularity: boolean
}>()
const { t } = useI18n()

const emit = defineEmits<{
  (e: 'toggle-course', code: string, enabled: boolean): void
  (e: 'toggle-bundle', code: string, bundleId: number, layer: number, enabled: boolean): void
  (e: 'toggle-layer', code: string, layer: number, enabled: boolean): void
  (e: 'show-info', code: string): void
}>()

function getBundleLabel(bundle: BundleData): string {
  return bundle.sections.map(s => s.section_type + s.name.replace(/\D/g, '')).join('/')
}

function getSectionLabel(section: SchedulerSection): string {
  return section.section_type + section.name.replace(/\D/g, '')
}

</script>

<template>
  <div class="course-card" :class="{ 'course-card--disabled': !course.enabled }">
    <div class="course-card__header" @click="emit('toggle-course', course.course_code, !course.enabled)">
      <div class="course-card__dot" :class="{ 'course-card__dot--on': course.enabled }" />
      <div class="course-card__info">
        <div class="course-card__code">{{ course.course_code }}</div>
        <div class="course-card__title">{{ course.course_title }}</div>
        <SchedulerPopularityBadge
          v-if="showPopularity && popularity"
          class="course-card__popularity"
          :counts="popularity"
        />
      </div>
      <span class="course-card__credits">{{ t('scheduler.credits', { count: course.credit }) }}</span>
      <button class="course-card__detail" type="button" @click.stop="emit('show-info', course.course_code)">
        {{ t('scheduler.details') }}
      </button>
    </div>

    <div
      v-if="course.enabled || (showPopularity && popularity)"
      class="course-card__bundles"
    >
      <div v-for="(bundles, layer) in course.layers" :key="layer" class="course-card__layer">
        <div class="course-card__layer-header">
          <span>{{ t('scheduler.layer', { layer }) }}</span>
          <button type="button" class="course-card__layer-btn" @click="emit('toggle-layer', course.course_code, Number(layer), true)">{{ t('scheduler.all') }}</button>
          <button type="button" class="course-card__layer-btn" @click="emit('toggle-layer', course.course_code, Number(layer), false)">{{ t('scheduler.none') }}</button>
        </div>
        <div class="course-card__bundle-row">
          <button
            v-for="bundle in bundles"
            :key="bundle.id"
            class="course-card__bundle"
            :class="{
              'course-card__bundle--active': bundle.enabled,
              'course-card__bundle--selected': currentSelection?.[Number(layer)] === bundle.id,
            }"
            type="button"
            @click="emit('toggle-bundle', course.course_code, bundle.id, Number(layer), !bundle.enabled)"
          >
            <template v-if="showPopularity && popularity">
              <span
                v-for="section in bundle.sections"
                :key="section.section_id"
                class="course-card__section-popularity"
              >
                <span>{{ getSectionLabel(section) }}</span>
                <SchedulerPopularityBadge
                  v-if="popularity.sections[section.section_id]"
                  :counts="popularity.sections[section.section_id]"
                />
              </span>
            </template>
            <template v-else>{{ getBundleLabel(bundle) }}</template>
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
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: var(--shadow-small);
  transition: opacity 0.2s, border-color 0.2s;

  &:hover {
    border-color: var(--interactive-secondary);
  }

  &--disabled {
    box-shadow: none;
    background: color-mix(in srgb, var(--surface-secondary) 42%, var(--surface-primary));
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
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

  &__info { flex: 1; min-width: 0; }

  &__code {
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--text-primary);
  }

  &__credits {
    flex-shrink: 0;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--surface-secondary);
    border: 1px solid var(--border-secondary);
    font-weight: 700;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  &__title {
    margin-top: 2px;
    font-size: 0.78rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__popularity {
    margin-top: 6px;
  }

  &__detail {
    flex-shrink: 0;
    min-height: 30px;
    padding: 0 9px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: color-mix(in srgb, var(--interactive-primary) 8%, transparent);
    color: var(--interactive-primary);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 700;

    &:hover {
      border-color: color-mix(in srgb, var(--interactive-primary) 28%, transparent);
      color: var(--interactive-active);
    }
  }

  &__bundles {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-secondary);
  }

  &__layer {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__layer-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    color: var(--text-secondary);
    margin-bottom: 6px;

    span {
      margin-right: auto;
      font-weight: 700;
    }
  }

  &__layer-btn {
    min-height: 24px;
    background: var(--surface-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    font-size: 0.68rem;
    padding: 0 8px;
    cursor: pointer;
    color: var(--text-secondary);
    &:hover {
      border-color: var(--interactive-secondary);
      color: var(--interactive-active);
    }
  }

  &__bundle-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__bundle {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 5px;
    background: var(--surface-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    min-height: 28px;
    padding: 5px 10px;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--text-primary);
    position: relative;
    transition: all 0.15s;

    &--active {
      background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
      border-color: color-mix(in srgb, var(--interactive-primary) 40%, transparent);
      color: var(--interactive-active);
    }

    &--selected {
      border-color: var(--semantic-warning);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--semantic-warning) 18%, transparent);
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

    &:hover { background: color-mix(in srgb, var(--interactive-primary) 10%, transparent); }
  }

  &__section-popularity {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 7px;
    width: 100%;

    > span:first-child {
      flex-shrink: 0;
      font-weight: 700;
    }
  }
}

@media (max-width: 520px) {
  .course-card {
    &__header {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    &__info {
      flex-basis: calc(100% - 24px);
      order: 1;
    }

    &__credits,
    &__detail {
      order: 2;
    }
  }
}
</style>
