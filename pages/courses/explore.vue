<script setup lang="ts">
const { getLocalePath } = useAppLocale()
await navigateTo(getLocalePath('/courses/graph'), { replace: true, redirectCode: 302 })
</script>

<template><div /></template>
