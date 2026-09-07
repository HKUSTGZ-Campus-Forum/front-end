<script setup lang="ts">
defineProps<{ owner: { id: number; username: string } }>()
const { getLocalePath } = useAppLocale()
</script>
<template>
  <i18n-t keypath="makerspace.by" tag="span" scope="global"><template #name><NuxtLink class="maker-author" :to="getLocalePath(`/users/${owner.id}`)">{{ owner.username }}</NuxtLink></template></i18n-t>
</template>
<style scoped>
.maker-author { color: var(--interactive-primary); text-decoration: underline; text-underline-offset: 3px; font-weight: 600; overflow-wrap: anywhere; }
.maker-author:hover { text-decoration-thickness: 2px; }
</style>
