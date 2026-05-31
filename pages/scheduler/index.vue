<script setup lang="ts">
definePageMeta({ layout: 'keguang' })
const router = useRouter()
const { getLocalePath } = useAppLocale()
router.replace(getLocalePath('/scheduler/dashboard'))
</script>

<template>
  <div></div>
</template>
