<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CourseDetail } from '~/utils/scheduler'

defineProps<{
  visible: boolean
  course: CourseDetail | null
  status: 'loading' | 'ready' | 'error'
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'retry'): void
}>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="course-detail" @click.self="$emit('close')">
      <article class="course-detail__card">
        <header>
          <div v-if="status === 'ready' && course">
            <strong>{{ course.course_code }}</strong>
            <h2>{{ course.course_title }}</h2>
          </div>
          <h2 v-else>{{ t('scheduler.details') }}</h2>
          <button type="button" @click="$emit('close')">{{ t('scheduler.close') }}</button>
        </header>
        <div v-if="status === 'loading'" class="course-detail__state" role="status" aria-live="polite">
          {{ t('scheduler.loading') }}
        </div>
        <div v-else-if="status === 'error' || !course" class="course-detail__state course-detail__state--error" role="alert">
          <p>{{ t('scheduler.courseDetailLoadFailed') }}</p>
          <button type="button" @click="$emit('retry')">{{ t('common.retry') }}</button>
        </div>
        <template v-else>
          <p :style="{ color: course.counts_toward_term_load === false ? 'var(--credit-excluded)' : undefined }">
            {{ t('scheduler.credits', { count: course.credit }) }}
            <span v-if="course.counts_toward_term_load === false"> · {{ t('scheduler.notCountedInTermLoad') }}</span>
          </p>
          <section>
            <h3>{{ t('scheduler.description') }}</h3>
            <p>{{ course.course_desc || t('scheduler.notAvailable') }}</p>
          </section>
          <section>
            <h3>{{ t('scheduler.prerequisites') }}</h3>
            <p>{{ course.pre_requirement || t('scheduler.notAvailable') }}</p>
          </section>
          <section>
            <h3>{{ t('scheduler.corequisites') }}</h3>
            <p>{{ course.co_requirement || t('scheduler.notAvailable') }}</p>
          </section>
          <section>
            <h3>{{ t('scheduler.exclusions') }}</h3>
            <p>{{ course.exclusion || t('scheduler.notAvailable') }}</p>
          </section>
        </template>
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.course-detail {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--modal-backdrop);
}

.course-detail__card {
  width: min(640px, 100%);
  max-height: 80vh;
  overflow: auto;
  padding: 24px;
  border-radius: 16px;
  background: var(--surface-primary);
  color: var(--text-primary);
}

.course-detail header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.course-detail h2,
.course-detail h3 {
  margin: 6px 0;
}

.course-detail__state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.course-detail__state--error {
  color: var(--semantic-error);
}

.course-detail__state button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  background: var(--surface-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-weight: 700;
}
</style>
