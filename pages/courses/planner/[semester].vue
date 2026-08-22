<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()
const route = useRoute()
const { getCart } = useScheduler()
const { isLoggedIn, authInitialized } = useAuth()

useHead(() => ({
  title: t('scheduler.metaTitle'),
}))

const semesterId = route.params.semester as string
const { courseList, loading, loadError, reload } = useSchedulerCartLoader({
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
    :cart-load-error="loadError"
    @retry-cart-load="reload"
  />
</template>
