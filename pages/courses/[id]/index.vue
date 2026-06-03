<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { AcademicCourseRecord, AcademicCourseStatus } from '~/types/academic-map'
import type { CourseOverviewPayload } from '~/types/course-overview'
import { buildCourseListBackQuery } from '~/utils/courseOffering'
import { compactCourseCode } from '~/utils/courseUniverse'

definePageMeta({ layout: 'keguang' })

const route = useRoute()
const { t } = useI18n()
const { locale, getLocalePath } = useAppLocale()
const { isLoggedIn } = useAuth()
const {
  fetchCourseOverview,
  markCourseInterested,
  cancelCourseInterest,
} = useCourseOverview()

const overview = ref<CourseOverviewPayload | null>(null)
const academicRecord = ref<AcademicCourseRecord | null>(null)
const isLoading = ref(true)
const isSavingInterest = ref(false)
const showAllOfferings = ref(false)
const error = ref('')
const statusMessage = ref('')

const courseCode = computed(() => compactCourseCode(String(route.params.id || '')))
const course = computed(() => overview.value?.course || null)
const offerings = computed(() => overview.value?.offerings || [])
const visibleOfferings = computed(() => showAllOfferings.value ? offerings.value : offerings.value.slice(0, 4))
const hasHiddenOfferings = computed(() => offerings.value.length > visibleOfferings.value.length)
const academicStatus = computed<AcademicCourseStatus | null>(() => academicRecord.value?.status || null)
const isInterested = computed(() => academicStatus.value === 'interested')
const isStrongStatus = computed(() => (
  academicStatus.value === 'completed'
  || academicStatus.value === 'in_progress'
  || academicStatus.value === 'planned'
))
const listBackQuery = computed(() => buildCourseListBackQuery(route.query as Record<string, unknown>))
const listBackTo = computed(() => getLocalePath({ path: '/courses/explore', query: listBackQuery.value }))

const ruleRows = computed(() => [
  { key: 'preRequirement', value: course.value?.pre_requirement },
  { key: 'coRequirement', value: course.value?.co_requirement },
  { key: 'exclusion', value: course.value?.exclusion },
].filter(item => item.value))

const refreshOverview = async () => {
  overview.value = await fetchCourseOverview(courseCode.value, locale.value)
  academicRecord.value = overview.value.academic_record
}

const loadPage = async () => {
  try {
    isLoading.value = true
    error.value = ''
    await refreshOverview()
  } catch (err: any) {
    error.value = err.message || t('courses.overviewPage.loadFailed')
  } finally {
    isLoading.value = false
  }
}

const saveInterest = async () => {
  if (!course.value || !isLoggedIn.value) return
  try {
    isSavingInterest.value = true
    statusMessage.value = ''
    const result = await markCourseInterested(course.value.code)
    academicRecord.value = result.record || null
    statusMessage.value = t('courses.overviewPage.interestSaved')
  } catch (err: any) {
    academicRecord.value = (err && err.record as AcademicCourseRecord) || academicRecord.value
    statusMessage.value = t('courses.overviewPage.interestFailed')
  } finally {
    isSavingInterest.value = false
  }
}

const removeInterest = async () => {
  if (!course.value || !isLoggedIn.value) return
  try {
    isSavingInterest.value = true
    statusMessage.value = ''
    await cancelCourseInterest(course.value.code)
    academicRecord.value = null
    statusMessage.value = t('courses.overviewPage.interestRemoved')
  } catch {
    statusMessage.value = t('courses.overviewPage.interestFailed')
  } finally {
    isSavingInterest.value = false
  }
}

const offeringHomeTo = (offeringTag: string) => getLocalePath({
  path: `/courses/${course.value?.code || courseCode.value}/offerings/${offeringTag}`,
  query: listBackQuery.value,
})

const offeringReviewTo = (offeringTag: string) => getLocalePath({
  path: `/courses/${course.value?.code || courseCode.value}/reviews/${offeringTag}`,
  query: listBackQuery.value,
})

const plannerTo = (semesterId?: string | null) => getLocalePath(
  semesterId ? `/courses/planner/${semesterId}` : '/courses/planner',
)

onMounted(loadPage)

useHead({
  title: computed(() => `${course.value?.display_code || courseCode.value} ${course.value?.title || ''} - ${t('courses.overviewPage.metaTitle')}`),
  meta: [{
    name: 'description',
    content: computed(() => t('courses.overviewPage.metaDescription', {
      course: course.value?.title || courseCode.value,
    })),
  }],
})
</script>

<template>
  <div class="kg-course-overview">
    <div class="kg-back-bar">
      <NuxtLink :to="listBackTo" class="kg-back-link">← {{ t('courses.backToCourses') }}</NuxtLink>
      <NuxtLink :to="getLocalePath('/courses')" class="kg-back-link kg-back-link--muted">
        {{ t('courseUniverse.title') }}
      </NuxtLink>
    </div>

    <div v-if="isLoading" class="kg-state-card">
      <div class="kg-spinner"></div>
      <span>{{ t('courses.loading') }}</span>
    </div>

    <div v-else-if="error" class="kg-state-card kg-state-card--error">
      <p>{{ error }}</p>
      <button type="button" class="kg-btn kg-btn--ghost" @click="loadPage">{{ t('common.retry') }}</button>
    </div>

    <template v-else-if="course">
      <section class="kg-card kg-hero">
        <div class="kg-hero__main">
          <p class="kg-eyebrow">{{ t('courses.overviewPage.eyebrow') }}</p>
          <h1>
            <span>{{ course.display_code }}</span>
            <span>{{ course.title }}</span>
          </h1>
          <p class="kg-description">{{ course.description || t('courses.overviewEmpty') }}</p>
        </div>
        <div class="kg-hero__meta">
          <span v-if="course.credits" class="kg-meta-chip">{{ t('courses.credits', { count: course.credits }) }}</span>
          <span :class="['kg-status-badge', course.is_active ? 'active' : 'inactive']">
            {{ course.is_active ? t('courses.statusActive') : t('courses.statusInactive') }}
          </span>
          <span v-if="course.course_title_abbr" class="kg-meta-chip">{{ course.course_title_abbr }}</span>
        </div>
      </section>

      <div class="kg-overview-grid">
        <main class="kg-main-stack">
          <section class="kg-card">
            <div class="kg-section-head">
              <div>
                <p class="kg-eyebrow">{{ t('courses.overviewPage.offeringsEyebrow') }}</p>
                <h2>{{ t('courses.overviewPage.offeringsTitle') }}</h2>
              </div>
              <button
                v-if="offerings.length > 4"
                type="button"
                class="kg-btn kg-btn--ghost"
                @click="showAllOfferings = !showAllOfferings"
              >
                {{ showAllOfferings ? t('courses.overviewPage.showRecent') : t('courses.overviewPage.showAll', { count: offerings.length }) }}
              </button>
            </div>

            <div v-if="offerings.length === 0" class="kg-empty-state">
              {{ t('courses.overviewPage.noOfferings') }}
            </div>

            <div v-else class="kg-offering-list">
              <article v-for="offering in visibleOfferings" :key="offering.offering_tag" class="kg-offering-item">
                <div class="kg-offering-item__body">
                  <h3>{{ offering.display_name }}</h3>
                  <p>
                    {{ t('courses.overviewPage.sectionsAndTeachers', {
                      sections: offering.section_count || 0,
                      teachers: offering.instructors?.length ? offering.instructors.join(', ') : t('courses.overviewPage.teacherTbd'),
                    }) }}
                  </p>
                </div>
                <div class="kg-offering-item__actions">
                  <NuxtLink :to="offeringHomeTo(offering.offering_tag)" class="kg-btn kg-btn--primary">
                    {{ t('courses.overviewPage.openOffering') }}
                  </NuxtLink>
                  <NuxtLink :to="offeringReviewTo(offering.offering_tag)" class="kg-btn kg-btn--ghost">
                    {{ t('courses.reviewsEntry') }}
                  </NuxtLink>
                  <NuxtLink :to="plannerTo(offering.scheduler_semester_id)" class="kg-btn kg-btn--ghost">
                    {{ t('courseUniverse.actions.openPlanner') }}
                  </NuxtLink>
                </div>
              </article>
            </div>

            <p v-if="hasHiddenOfferings" class="kg-inline-note">
              {{ t('courses.overviewPage.hiddenOfferings', { count: offerings.length - visibleOfferings.length }) }}
            </p>
          </section>

          <section class="kg-card">
            <div class="kg-section-head">
              <div>
                <p class="kg-eyebrow">{{ t('courses.overviewPage.rulesEyebrow') }}</p>
                <h2>{{ t('courses.overviewPage.rulesTitle') }}</h2>
              </div>
            </div>
            <div v-if="ruleRows.length" class="kg-rule-list">
              <div v-for="rule in ruleRows" :key="rule.key" class="kg-rule-row">
                <span>{{ t(`courses.overviewPage.rules.${rule.key}`) }}</span>
                <p>{{ rule.value }}</p>
              </div>
            </div>
            <div v-else class="kg-empty-state">
              {{ t('courses.overviewPage.noRules') }}
            </div>
          </section>
        </main>

        <aside class="kg-side-stack">
          <section class="kg-card">
            <p class="kg-eyebrow">{{ t('academicMap.eyebrow') }}</p>
            <h2>{{ t('courses.overviewPage.academicStatusTitle') }}</h2>
            <div v-if="academicStatus" class="kg-current-status">
              {{ t(`academicMap.status.${academicStatus}`) }}
            </div>
            <p v-else class="kg-side-copy">{{ t('courses.overviewPage.noAcademicStatus') }}</p>

            <template v-if="isLoggedIn">
              <button
                v-if="!academicStatus"
                type="button"
                class="kg-btn kg-btn--primary kg-btn--block"
                :disabled="isSavingInterest"
                @click="saveInterest"
              >
                {{ isSavingInterest ? t('actions.saving') : t('courses.overviewPage.markInterested') }}
              </button>
              <button
                v-else-if="isInterested"
                type="button"
                class="kg-btn kg-btn--ghost kg-btn--block"
                :disabled="isSavingInterest"
                @click="removeInterest"
              >
                {{ isSavingInterest ? t('actions.saving') : t('courses.overviewPage.cancelInterested') }}
              </button>
              <p v-else-if="isStrongStatus" class="kg-inline-note">
                {{ t('courses.overviewPage.strongStatusNote') }}
              </p>
              <p v-if="statusMessage" class="kg-inline-note">{{ statusMessage }}</p>
            </template>

            <NuxtLink v-else :to="getLocalePath('/login')" class="kg-btn kg-btn--primary kg-btn--block">
              {{ t('courses.overviewPage.loginToMark') }}
            </NuxtLink>
          </section>

          <section class="kg-card">
            <p class="kg-eyebrow">{{ t('courseUniverse.title') }}</p>
            <h2>{{ t('courses.overviewPage.mapTitle') }}</h2>
            <p class="kg-side-copy">{{ t('courses.overviewPage.mapCopy') }}</p>
            <NuxtLink
              :to="getLocalePath({ path: '/courses', query: { focus: course.code } })"
              class="kg-btn kg-btn--ghost kg-btn--block"
            >
              {{ t('courses.overviewPage.openInMap') }}
            </NuxtLink>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-course-overview {
  margin: 0 auto;
  max-width: 1180px;
  padding: 20px 20px 60px;
  width: 100%;
}

.kg-back-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.kg-back-link {
  color: var(--interactive-primary);
  font-size: 0.9rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.kg-back-link--muted {
  color: var(--text-secondary);
}

.kg-card,
.kg-state-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  min-width: 0;
}

.kg-card {
  padding: 22px 24px;
}

.kg-state-card {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  min-height: 240px;
  padding: 40px 20px;
}

.kg-state-card--error {
  color: var(--semantic-error);
}

.kg-spinner {
  animation: spin 0.7s linear infinite;
  border: 3px solid var(--border-primary);
  border-radius: 50%;
  border-top-color: var(--interactive-primary);
  height: 28px;
  width: 28px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.kg-hero {
  align-items: flex-start;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin-bottom: 18px;
}

.kg-hero__main {
  min-width: 0;

  h1 {
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    font-size: 1.62rem;
    gap: 4px;
    line-height: 1.25;
    margin: 0 0 12px;
  }
}

.kg-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  max-width: 360px;
}

.kg-eyebrow {
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  margin: 0 0 6px;
  text-transform: uppercase;
}

.kg-description,
.kg-side-copy,
.kg-inline-note {
  color: var(--text-secondary);
  line-height: 1.65;
}

.kg-description {
  font-size: 0.94rem;
  margin: 0;
}

.kg-overview-grid {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 320px;
}

.kg-main-stack,
.kg-side-stack {
  display: grid;
  gap: 18px;
}

.kg-section-head {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    color: var(--text-primary);
    font-size: 1.08rem;
    margin: 0;
  }
}

.kg-meta-chip,
.kg-status-badge,
.kg-current-status {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.82rem;
  font-weight: 700;
  min-height: 32px;
  padding: 0 12px;
}

.kg-meta-chip,
.kg-current-status {
  background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 25%, var(--border-primary));
  color: var(--interactive-active);
}

.kg-status-badge.active {
  background: color-mix(in srgb, var(--semantic-success) 12%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--semantic-success) 32%, var(--border-primary));
  color: var(--semantic-success);
}

.kg-status-badge.inactive {
  background: var(--surface-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
}

.kg-offering-list {
  display: grid;
  gap: 12px;
}

.kg-offering-item {
  align-items: center;
  background: var(--surface-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 16px;
}

.kg-offering-item__body {
  min-width: 0;

  h3 {
    color: var(--text-primary);
    font-size: 1rem;
    margin: 0 0 6px;
  }

  p {
    color: var(--text-secondary);
    font-size: 0.86rem;
    line-height: 1.55;
    margin: 0;
  }
}

.kg-offering-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.kg-btn {
  align-items: center;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  justify-content: center;
  min-height: 38px;
  padding: 0 13px;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.kg-btn--primary {
  background: var(--interactive-primary);
  border: 1px solid var(--interactive-primary);
  color: var(--text-inverse);

  &:hover:not(:disabled) {
    background: var(--interactive-hover);
    border-color: var(--interactive-hover);
  }
}

.kg-btn--ghost {
  background: transparent;
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);

  &:hover:not(:disabled) {
    border-color: var(--interactive-primary);
    color: var(--interactive-primary);
  }
}

.kg-btn--block {
  margin-top: 14px;
  width: 100%;
}

.kg-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.kg-empty-state {
  background: var(--surface-secondary);
  border: 1px dashed var(--border-primary);
  border-radius: 14px;
  color: var(--text-secondary);
  padding: 22px 16px;
  text-align: center;
}

.kg-inline-note {
  font-size: 0.82rem;
  margin: 12px 0 0;
}

.kg-side-copy {
  font-size: 0.9rem;
  margin: 8px 0 0;
}

.kg-current-status {
  margin-top: 8px;
}

.kg-rule-list {
  display: grid;
  gap: 12px;
}

.kg-rule-row {
  border-top: 1px solid var(--border-primary);
  padding-top: 12px;

  &:first-child {
    border-top: 0;
    padding-top: 0;
  }

  span {
    color: var(--text-primary);
    display: block;
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 5px;
  }

  p {
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.65;
    margin: 0;
  }
}

@media (max-width: 900px) {
  .kg-course-overview {
    padding: 16px 14px 48px;
  }

  .kg-hero,
  .kg-section-head {
    flex-direction: column;
  }

  .kg-hero__meta {
    justify-content: flex-start;
    max-width: none;
  }

  .kg-overview-grid {
    grid-template-columns: 1fr;
  }

  .kg-offering-item {
    grid-template-columns: 1fr;
  }

  .kg-offering-item__actions {
    justify-content: flex-start;
  }
}
</style>
