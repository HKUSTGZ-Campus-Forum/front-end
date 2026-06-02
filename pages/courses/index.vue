<script setup lang="ts">
import CourseUniversePage from '~/components/courses/universe/CourseUniversePage.vue'

definePageMeta({ layout: 'keguang' })

useHead({
  title: 'Course Universe - UniKorn',
})
</script>

<template>
  <CourseUniversePage mode="universe" />
</template>
