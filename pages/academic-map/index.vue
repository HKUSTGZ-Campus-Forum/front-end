<script setup lang="ts">
definePageMeta({ layout: 'keguang' })

const router = useRouter()
const { getLocalePath } = useAppLocale()

router.replace(getLocalePath('/courses/academic-map'))
</script>

<template>
  <div></div>
</template>
