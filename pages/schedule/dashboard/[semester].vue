<script setup lang="ts">
definePageMeta({ layout: 'keguang' })

const route = useRoute()
const router = useRouter()
const { getLocalePath } = useAppLocale()

router.replace(getLocalePath(`/courses/planner/${route.params.semester}`))
</script>

<template>
  <div></div>
</template>
