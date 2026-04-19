<template>
  <MyProjectsPanel :show-breadcrumbs="true" />
</template>

<script setup>
import MyProjectsPanel from '~/components/matching/MyProjectsPanel.vue'

definePageMeta({
  title: 'My Projects',
  requiresAuth: true,
  layout: 'keguang',
})
</script>
