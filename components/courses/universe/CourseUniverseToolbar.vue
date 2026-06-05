<script setup lang="ts">
import CourseToolsHeader from '~/components/courses/CourseToolsHeader.vue'
import type { CourseUniverseModeKey } from '~/utils/courseUniverse'

defineProps<{
  mode: CourseUniverseModeKey
}>()
</script>

<template>
  <CourseToolsHeader :mode="mode" />
</template>
