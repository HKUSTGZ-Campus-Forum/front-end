<script setup lang="ts">
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'keguang' })

const route = useRoute()
const { getCart } = useScheduler()
const { isLoggedIn, authInitialized } = useAuth()

const semesterId = route.params.semester as string
const { courseList, loading } = useSchedulerCartLoader({
  semesterId,
  authInitialized,
  isLoggedIn,
  getCart,
})
</script>

<template>
  <SchedulerDashboard
    :semester-id="semesterId"
    :initial-course-list="courseList"
    :is-logged-in="isLoggedIn"
    :loading="loading"
  />
</template>
