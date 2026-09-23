<script setup lang="ts">
const route = useRoute()
const { getLocalePath } = useAppLocale()
await navigateTo(getLocalePath(`/courses/${String(route.params.id || '')}`), {
  replace: true,
  redirectCode: 302,
})
</script>

<template><div /></template>
