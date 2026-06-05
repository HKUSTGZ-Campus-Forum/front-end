<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CourseDetail } from '~/utils/scheduler'

defineProps<{
  visible: boolean
  course: CourseDetail | null
}>()

defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div v-if="visible && course" class="course-detail" @click.self="$emit('close')">
      <article class="course-detail__card">
        <header>
          <div>
            <strong>{{ course.course_code }}</strong>
            <h2>{{ course.course_title }}</h2>
          </div>
          <button type="button" @click="$emit('close')">{{ t('scheduler.close') }}</button>
        </header>
        <p>{{ t('scheduler.credits', { count: course.credit }) }}</p>
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
</style>
