<script setup lang="ts">
import type { MakerSpace } from '~/types/makerspace'
defineProps<{ space: MakerSpace; manage?: boolean }>()
defineEmits<{ updated: [space: MakerSpace] }>()
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { title, description } = useMakerSpace()
</script>
<template>
  <article class="maker-card maker-work-card">
    <MakerspaceSpaceCover v-if="space.cover_url" :url="space.cover_url" :title="title(space)" :private="space.status !== 'published'" />
    <div class="maker-card-top"><span v-if="!space.cover_url" class="maker-icon"><Icon :name="space.slug === 'teamup' ? 'lucide:users' : 'lucide:blocks'" aria-hidden="true" /></span><span class="maker-badge">{{ t(`makerspace.states.${space.status}`) }}</span><span class="maker-meta maker-work-category">{{ t(`makerspace.categories.${space.category}`) }}</span></div>
    <h2><NuxtLink class="maker-work-title" :to="getLocalePath(`/makerspace/${space.slug}`)">{{ title(space) }}</NuxtLink></h2>
    <p>{{ description(space) }}</p>
    <div v-if="space.owner" class="maker-meta"><MakerspaceAuthorLink :owner="space.owner" /></div>
    <div class="maker-work-footer"><MakerspaceSpaceActions :space="space" @updated="$emit('updated', $event)" /><NuxtLink class="maker-button maker-button--primary" :to="getLocalePath(`/makerspace/${space.slug}`)">{{ t(manage ? 'makerspace.manage' : 'makerspace.open') }}<Icon name="lucide:arrow-up-right" aria-hidden="true" /></NuxtLink></div>
  </article>
</template>
<style scoped>
.maker-work-card { display: flex; flex-direction: column; gap: 0; }
.maker-cover { margin-bottom: 18px; }
.maker-work-category { margin: 0 0 0 auto; }
.maker-work-title { color: var(--text-primary); text-decoration: none; overflow-wrap: anywhere; }
.maker-work-title:hover { color: var(--interactive-primary); }
.maker-work-footer { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 14px; margin-top: auto; padding-top: 8px; }
</style>
