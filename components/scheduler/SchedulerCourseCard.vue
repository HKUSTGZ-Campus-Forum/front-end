<!-- front-end/components/scheduler/SchedulerCourseCard.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type {
  CartCourse,
  IndexedSchedulerCoursePopularity,
} from '~/utils/scheduler'
import { getSchedulerBundleLabel } from '~/utils/scheduler'

const props = defineProps<{
  course: CartCourse
  semesterId: string
  currentSelectionKeys?: string[]
  popularity?: IndexedSchedulerCoursePopularity
  showPopularity: boolean
  mutationsDisabled: boolean
  canShowHistory?: boolean
  getHistory?: (
    semester: string,
    courseCode: string,
    options: { sectionId?: string; from: string; to: string; resolution?: 'auto'; signal?: AbortSignal },
  ) => Promise<import('~/utils/scheduler').SchedulerPopularityHistoryResponse>
}>()
const { t } = useI18n()

const emit = defineEmits<{
  (e: 'toggle-course', code: string, currentEnabled: boolean): void
  (e: 'toggle-bundle', code: string, bundleId: number, layer: number, currentEnabled: boolean): void
  (e: 'toggle-layer', code: string, layer: number, enabled: boolean): void
  (e: 'preview-bundle', code: string, layer: number, bundleId: number): void
  (e: 'clear-preview'): void
  (e: 'show-history', code: string): void
}>()

function isBundleSelected(layer: number, bundleId: number): boolean {
  return props.currentSelectionKeys?.includes(`${layer}:${bundleId}`) || false
}

function creditColorVar(credit: number): string {
  if (props.course.counts_toward_term_load === false) return 'var(--credit-excluded)'
  const level = Math.min(6, Math.max(1, credit))
  return `var(--credit-level-${level})`
}

const moduleGroups = computed(() => {
  if (props.course.selection_policy?.kind !== 'module') return []
  const modules = new Map(props.course.selection_policy.modules.map(module => [module.code, module]))
  const bundles = Object.entries(props.course.layers).flatMap(([layer, layerBundles]) =>
    layerBundles.map(bundle => ({
      ...bundle,
      layer: Number(layer),
      moduleCode: bundle.sections[0]?.section_type?.trim().toUpperCase() || '',
    })),
  )
  return props.course.selection_policy.groups.map(group => ({
    ...group,
    modules: (group.module_codes || []).map(code => ({
      ...(modules.get(code) || { code, title: code, credit: null, available: false }),
      bundles: bundles.filter(bundle => bundle.moduleCode === code),
    })),
  }))
})

function isModuleSelected(bundles: Array<{ id: number; layer: number }>): boolean {
  return bundles.some(bundle => isBundleSelected(bundle.layer, bundle.id))
}
</script>

<template>
  <div class="course-card" :class="{ 'course-card--disabled': !course.enabled }">
    <!-- Header: one compact line of meta + title, click toggles the course -->
    <div class="course-card__header" @click="!mutationsDisabled && emit('toggle-course', course.course_code, course.enabled)">
      <div class="course-card__info">
        <div class="course-card__meta">
          <span class="course-card__code">{{ course.course_code }}</span>
          <span class="course-card__credits" :style="{ color: creditColorVar(course.credit) }">
            · {{ t('scheduler.credits', { count: course.credit }) }}
            <span v-if="course.counts_toward_term_load === false" class="course-card__credit-note">{{ t('scheduler.notCountedInTermLoad') }}</span>
          </span>
          <SchedulerPopularitySummary
            v-if="showPopularity && popularity"
            class="course-card__popularity"
            :counts="popularity"
            :course-code="course.course_code"
            :semester-id="semesterId"
            :can-show-history="canShowHistory"
            :get-history="getHistory"
            :on-show-full-history="() => emit('show-history', course.course_code)"
          />
        </div>
        <div class="course-card__title">{{ course.course_title }}</div>
      </div>
      <div class="course-card__actions">
        <SchedulerCourseInfoPopover
          :course-code="course.course_code"
          :course-title="course.course_title"
          :credit="course.credit"
          :counts-toward-term-load="course.counts_toward_term_load"
          :semester-id="semesterId"
        />
        <span class="course-card__dot" :class="{ 'course-card__dot--on': course.enabled }" />
      </div>
    </div>

    <div v-if="course.enabled && course.selection_policy?.kind === 'module'" class="course-card__modules">
      <section v-for="group in moduleGroups" :key="group.id" class="course-card__module-group">
        <div class="course-card__module-group-head">
          <span>{{ t(group.role === 'required' ? 'scheduler.requiredModules' : 'scheduler.electiveModules') }}</span>
          <span>{{ t('scheduler.chooseModules', { count: group.min_select }) }}</span>
        </div>
        <div
          v-for="module in group.modules"
          :key="module.code"
          class="course-card__module"
          :class="{ 'course-card__module--selected': isModuleSelected(module.bundles) }"
        >
          <div class="course-card__module-info">
            <div class="course-card__module-name">
              <span>{{ module.code }}</span>
              <span v-if="module.credit !== null">{{ t('scheduler.creditsShort', { count: module.credit }) }}</span>
            </div>
            <p>{{ module.title }}</p>
          </div>
          <div v-if="module.bundles.length" class="course-card__bundle-row">
            <button
              v-for="bundle in module.bundles"
              :key="`${bundle.layer}:${bundle.id}`"
              class="course-card__bundle"
              :class="{
                'course-card__bundle--active': bundle.enabled,
                'course-card__bundle--selected': isBundleSelected(bundle.layer, bundle.id),
              }"
              type="button"
              :disabled="mutationsDisabled"
              @click="emit('toggle-bundle', course.course_code, bundle.id, bundle.layer, bundle.enabled)"
              @mouseenter="emit('preview-bundle', course.course_code, bundle.layer, bundle.id)"
              @mouseleave="emit('clear-preview')"
            >
              {{ getSchedulerBundleLabel(bundle) }}
            </button>
          </div>
          <span v-else class="course-card__module-unavailable">{{ t('scheduler.moduleUnavailable') }}</span>
        </div>
      </section>
    </div>

    <!-- Standard courses keep the familiar one-row-per-layer controls. -->
    <div v-else-if="course.enabled" class="course-card__bundles">
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
            @mouseenter="emit('preview-bundle', course.course_code, Number(layer), bundle.id)"
            @mouseleave="emit('clear-preview')"
          >
            {{ getSchedulerBundleLabel(bundle) }}
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
    align-items: baseline;
    flex-wrap: wrap;
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

  &__credit-note {
    margin-left: 3px;
    padding: 1px 5px;
    border: 1px solid color-mix(in srgb, var(--credit-excluded) 35%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--credit-excluded) 9%, transparent);
    font-size: 0.64rem;
  }

  &__popularity {
    flex-shrink: 0;
    align-self: center;
    margin-left: 4px;
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

  &__modules {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-secondary);
  }

  &__module-group + &__module-group {
    margin-top: 10px;
  }

  &__module-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 5px;
    color: var(--text-secondary);
    font-size: 0.68rem;
    font-weight: 750;
  }

  &__module {
    display: grid;
    grid-template-columns: minmax(118px, 0.85fr) minmax(0, 1.15fr);
    align-items: center;
    gap: 8px;
    padding: 6px;
    border-radius: 9px;
    transition: background 0.16s ease;

    &--selected {
      background: color-mix(in srgb, var(--interactive-primary) 7%, transparent);
    }
  }

  &__module-info {
    min-width: 0;

    p {
      margin: 2px 0 0;
      color: var(--text-secondary);
      font-size: 0.66rem;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
  }

  &__module-name {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text-primary);
    font-size: 0.72rem;
    font-weight: 750;

    span:last-child:not(:first-child) {
      color: var(--text-muted);
      font-size: 0.62rem;
      font-weight: 650;
    }
  }

  &__module-unavailable {
    color: var(--semantic-warning);
    font-size: 0.68rem;
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

@media (max-width: 520px) {
  .course-card__module {
    grid-template-columns: 1fr;
    gap: 5px;
  }
}
</style>
