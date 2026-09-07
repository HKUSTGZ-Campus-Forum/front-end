<script setup lang="ts">
import type { MakerSpace } from '~/types/makerspace'
const props = defineProps<{ userId: number }>()
const { t } = useI18n()
const { user, isLoggedIn, authInitialized } = useAuth()
const { request, errorMessage } = useMakerSpace()
const own = computed(() => isLoggedIn.value && user.value?.id === props.userId)
const tab = ref<'created' | 'favorites'>('created')
const spaces = ref<MakerSpace[]>([])
const loading = ref(true)
const error = ref('')
let sequence = 0
async function load() {
  const version = ++sequence
  spaces.value = []; loading.value = true; error.value = ''
  if (!authInitialized.value || !props.userId) return
  try {
    const result = await request<{ spaces: MakerSpace[] }>(tab.value === 'favorites' && own.value ? '/favorites' : `/users/${props.userId}`)
    if (version === sequence) spaces.value = result.spaces
  } catch (cause) { if (version === sequence) error.value = errorMessage(cause) }
  finally { if (version === sequence) loading.value = false }
}
function update(space: MakerSpace) {
  spaces.value = spaces.value.map(item => item.id === space.id ? space : item).filter(item => tab.value !== 'favorites' || item.is_favorited)
}
onMounted(load)
watch([() => props.userId, authInitialized, () => user.value?.id, tab], () => { if (!own.value) tab.value = 'created'; load() })
onBeforeUnmount(() => { sequence++ })
</script>
<template>
  <section class="maker-page maker-profile-spaces" :aria-label="t('makerspace.profile.title')">
    <header class="maker-header"><h2>{{ t('makerspace.profile.title') }}</h2></header>
    <nav class="maker-tabs" :aria-label="t('makerspace.views')"><button type="button" :aria-pressed="tab === 'created'" @click="tab = 'created'">{{ t(own ? 'makerspace.profile.createdMine' : 'makerspace.profile.created') }}</button><button v-if="own" type="button" :aria-pressed="tab === 'favorites'" @click="tab = 'favorites'">{{ t('makerspace.profile.favorites') }}</button></nav>
    <p v-if="own" class="maker-profile-hint">{{ t(tab === 'favorites' ? 'makerspace.profile.favoritesHint' : 'makerspace.profile.privateHint') }}</p>
    <p v-if="loading" role="status">{{ t('makerspace.loading') }}</p>
    <div v-else-if="error" class="maker-notice" role="alert">{{ error }} <button type="button" class="maker-button" @click="load">{{ t('makerspace.retry') }}</button></div>
    <p v-else-if="!spaces.length">{{ t(tab === 'favorites' ? 'makerspace.profile.emptyFavorites' : 'makerspace.profile.emptyCreated') }}</p>
    <div v-else class="maker-grid"><MakerspaceSpaceCard v-for="space in spaces" :key="space.id" :space="space" :manage="own && tab === 'created'" @updated="update" /></div>
  </section>
</template>
<style src="~/assets/css/makerspace.scss" lang="scss" />
<style scoped>
.maker-profile-spaces { width: 100%; max-width: none; margin: 24px 0; padding: 0; }
.maker-profile-spaces > .maker-header { margin-bottom: 12px; }
.maker-profile-spaces > .maker-header h2 { font-size: 1.15rem; }
.maker-profile-hint { font-size: .875rem; }
</style>
