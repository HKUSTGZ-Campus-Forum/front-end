<!-- front-end/components/scheduler/SchedulerCourseCard.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CartCourse, BundleData } from '~/utils/scheduler'

const props = defineProps<{
  course: CartCourse
  courseIndex: number
  currentSelection?: Record<number, number>
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
</script>

<template>
  <div class="course-card" :class="{ 'course-card--disabled': !course.enabled }">
    <div class="course-card__header" @click="emit('toggle-course', course.course_code, !course.enabled)">
      <div class="course-card__dot" :class="{ 'course-card__dot--on': course.enabled }" />
      <div class="course-card__info">
        <div class="course-card__code">
          {{ course.course_code }}
          <span class="course-card__credits">{{ t('scheduler.credits', { count: course.credit }) }}</span>
        </div>
        <div class="course-card__title">{{ course.course_title }}</div>
      </div>
      <button class="course-card__detail" type="button" @click.stop="emit('show-info', course.course_code)">
        {{ t('scheduler.details') }}
      </button>
    </div>

    <div v-if="course.enabled" class="course-card__bundles">
      <div v-for="(bundles, layer) in course.layers" :key="layer" class="course-card__layer">
        <div class="course-card__layer-header">
          <span>{{ t('scheduler.layer', { layer }) }}</span>
          <button class="course-card__layer-btn" @click="emit('toggle-layer', course.course_code, Number(layer), true)">{{ t('scheduler.all') }}</button>
          <button class="course-card__layer-btn" @click="emit('toggle-layer', course.course_code, Number(layer), false)">{{ t('scheduler.none') }}</button>
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
            @click="emit('toggle-bundle', course.course_code, bundle.id, Number(layer), !bundle.enabled)"
          >
            {{ getBundleLabel(bundle) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.course-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  transition: opacity 0.2s;

  &--disabled { opacity: 0.5; }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--text-tertiary);
    flex-shrink: 0;
    transition: background 0.2s;
    &--on { background: var(--semantic-success); }
  }

  &__info { flex: 1; min-width: 0; }

  &__code {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  &__credits {
    font-weight: 400;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-left: 0.5rem;
  }

  &__title {
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__detail {
    border: 0;
    background: transparent;
    color: var(--interactive-primary);
    cursor: pointer;
    font-size: 0.75rem;
  }

  &__bundles {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-primary);
  }

  &__layer { margin-bottom: 0.4rem; }

  &__layer-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-bottom: 0.25rem;
  }

  &__layer-btn {
    background: none;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    font-size: 0.65rem;
    padding: 1px 4px;
    cursor: pointer;
    color: var(--text-secondary);
    &:hover { background: var(--surface-secondary); }
  }

  &__bundle-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  &__bundle {
    background: var(--surface-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--text-primary);
    position: relative;
    transition: all 0.15s;

    &--active {
      background: color-mix(in srgb, var(--interactive-primary) 15%, transparent);
      border-color: color-mix(in srgb, var(--interactive-primary) 40%, transparent);
    }

    &--selected {
      border-color: var(--semantic-warning);
      &::after {
        content: '';
        position: absolute;
        top: -3px;
        right: -3px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--semantic-warning);
      }
    }

    &:hover { background: color-mix(in srgb, var(--interactive-primary) 10%, transparent); }
  }
}
</style>
