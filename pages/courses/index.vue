<script setup lang="ts">
import CourseUniversePage from '~/components/courses/universe/CourseUniversePage.vue'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()

useHead(() => ({
  title: `${t('courseUniverse.hubTitle')} - ${t('common.appName')}`,
}))
</script>

<template>
  <CourseUniversePage mode="universe" />
</template>
