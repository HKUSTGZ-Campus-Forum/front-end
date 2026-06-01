<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { CartCourse } from '~/utils/scheduler'

definePageMeta({ layout: 'keguang' })

const route = useRoute()
const { getCart } = useScheduler()
const { isLoggedIn } = useAuth()

const semesterId = route.params.semester as string
const courseList = ref<CartCourse[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    if (isLoggedIn.value) {
      courseList.value = await getCart(semesterId)
    }
  } finally {
    loading.value = false
  }
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
