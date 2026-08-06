<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { CartCourse } from '~/utils/scheduler'

definePageMeta({ layout: 'keguang' })

const route = useRoute()
const { getCart } = useScheduler()
const { isLoggedIn, authInitialized } = useAuth()

const semesterId = route.params.semester as string
const courseList = ref<CartCourse[]>([])
const loading = ref(true)

watch([authInitialized, isLoggedIn], async ([ready, loggedIn]) => {
  if (!ready) return
  loading.value = true
  try {
    if (loggedIn) {
      courseList.value = await getCart(semesterId)
    } else {
      courseList.value = []
    }
  } finally {
    loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <SchedulerDashboard
    :semester-id="semesterId"
    :initial-course-list="courseList"
    :is-logged-in="isLoggedIn"
    :loading="loading"
  />
</template>
