<script setup lang="ts">
import MakerSpacePage from './index.vue'
// Only the reviewed TeamUp bridge exposes nested application routes here.
// Ordinary hosted spaces retain their session-authorized sandbox routing.
definePageMeta({ layout: 'keguang', validate: route => route.params.slug === 'teamup' })
</script>

<template>
  <MakerSpacePage />
</template>
