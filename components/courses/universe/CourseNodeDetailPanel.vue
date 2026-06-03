<script setup lang="ts">
import type { AcademicCourseStatus } from '~/types/academic-map'
import type { CourseUniverseNode } from '~/utils/courseUniverse'

const props = defineProps<{
  node: CourseUniverseNode | null
  academicStatus: AcademicCourseStatus | null
  inPlanner: boolean
  selectedSemester: string
}>()

const emit = defineEmits<{
  (event: 'mark-interest'): void
  (event: 'cancel-interest'): void
}>()

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { isLoggedIn } = useAuth()

const overviewTo = computed(() => (
  props.node ? getLocalePath(`/courses/${props.node.code}`) : getLocalePath('/courses')
))
const isInterested = computed(() => props.academicStatus === 'interested')
const hasStrongStatus = computed(() => (
  props.academicStatus === 'completed'
  || props.academicStatus === 'in_progress'
  || props.academicStatus === 'planned'
))
</script>

<template>
  <aside class="cu-detail">
    <div v-if="!node" class="cu-detail__empty">
      {{ t('courseUniverse.selectCourse') }}
    </div>

    <template v-else>
      <section class="cu-detail__card">
        <p class="cu-detail__eyebrow">{{ t('courseUniverse.detail.overview') }}</p>
        <h2>{{ node.displayCode }}</h2>
        <p>{{ node.title || t('courseUniverse.detail.notAvailable') }}</p>
        <NuxtLink :to="overviewTo" class="cu-detail__primary">
          {{ t('courseUniverse.actions.openOverview') }}
        </NuxtLink>
      </section>

      <section class="cu-detail__card">
        <p class="cu-detail__eyebrow">{{ t('courseUniverse.detail.academicStatus') }}</p>
        <div v-if="academicStatus" class="cu-detail__current-status">
          {{ t(`academicMap.status.${academicStatus}`) }}
        </div>
        <p v-else>{{ t('courses.overviewPage.noAcademicStatus') }}</p>

        <template v-if="isLoggedIn">
          <button
            v-if="!academicStatus"
            type="button"
            class="cu-detail__primary"
            @click="emit('mark-interest')"
          >
            {{ t('courses.overviewPage.markInterested') }}
          </button>
          <button
            v-else-if="isInterested"
            type="button"
            class="cu-detail__link"
            @click="emit('cancel-interest')"
          >
            {{ t('courses.overviewPage.cancelInterested') }}
          </button>
          <p v-else-if="hasStrongStatus" class="cu-detail__note">
            {{ t('courses.overviewPage.strongStatusNote') }}
          </p>
        </template>
        <NuxtLink v-else :to="getLocalePath('/login')" class="cu-detail__primary">
          {{ t('courses.overviewPage.loginToMark') }}
        </NuxtLink>
      </section>

      <section class="cu-detail__card">
        <p class="cu-detail__eyebrow">{{ t('courseUniverse.detail.plannerStatus') }}</p>
        <p>
          {{ inPlanner ? t('courseUniverse.detail.plannerAdded') : t('courseUniverse.detail.plannerNotAdded') }}
        </p>
        <NuxtLink
          :to="getLocalePath(selectedSemester ? `/courses/planner/${selectedSemester}` : '/courses/planner')"
          class="cu-detail__primary"
        >
          {{ t('courseUniverse.actions.openPlanner') }}
        </NuxtLink>
      </section>

      <section class="cu-detail__card">
        <p class="cu-detail__eyebrow">{{ t('courseUniverse.detail.reviewSignal') }}</p>
        <p>{{ t('courses.reviewsCopy', { offering: selectedSemester || '-' }) }}</p>
        <NuxtLink :to="getLocalePath('/courses/explore')" class="cu-detail__link">
          {{ t('courseUniverse.actions.openReviews') }}
        </NuxtLink>
      </section>
    </template>
  </aside>
</template>

<style scoped lang="scss">
.cu-detail {
  display: grid;
  gap: 12px;
}

.cu-detail__empty,
.cu-detail__card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  padding: 16px;
}

.cu-detail__empty {
  color: var(--text-secondary);
  min-height: 160px;
}

.cu-detail__eyebrow {
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  margin: 0 0 6px;
}

.cu-detail h2 {
  color: var(--text-primary);
  font-size: 1.12rem;
  margin: 0 0 6px;
}

.cu-detail p {
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.55;
  margin: 0 0 12px;
}

.cu-detail__current-status {
  align-items: center;
  background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 25%, var(--border-primary));
  border-radius: 999px;
  color: var(--interactive-active);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  min-height: 32px;
  padding: 0 10px;
  margin-bottom: 12px;
}

.cu-detail__note {
  font-size: 0.82rem !important;
}

.cu-detail__primary,
.cu-detail__link {
  align-items: center;
  border-radius: 12px;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  justify-content: center;
  min-height: 38px;
  padding: 0 12px;
  text-decoration: none;
}

.cu-detail__primary {
  background: var(--interactive-primary);
  color: var(--text-inverse);
}

.cu-detail__link {
  border: 1px solid var(--border-primary);
  color: var(--interactive-primary);
}
</style>
