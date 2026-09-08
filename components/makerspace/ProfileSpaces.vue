<script setup lang="ts">
import type { ProfileVisibility } from '~/types/profileVisibility'
import type { MakerSpace } from '~/types/makerspace'
const props = defineProps<{ userId: number; visibility: ProfileVisibility }>()
const { t } = useI18n()
const { user, isLoggedIn, authInitialized } = useAuth()
const { request, errorMessage } = useMakerSpace()
const own = computed(() => isLoggedIn.value && user.value?.id === props.userId)
const tabs = computed(() => (['created', 'favorites'] as const).filter(value => own.value || props.visibility[value === 'created' ? 'created_spaces' : 'favorite_spaces']))
const tab = ref<'created' | 'favorites'>('created')
const privateSection = computed(() => own.value && !props.visibility[tab.value === 'created' ? 'created_spaces' : 'favorite_spaces'])
const spaces = ref<MakerSpace[]>([])
const loading = ref(true)
const error = ref('')
let sequence = 0
async function load() {
  const version = ++sequence
  spaces.value = []; loading.value = true; error.value = ''
  if (!authInitialized.value || !props.userId || !tabs.value.length) { loading.value = false; return }
  if (!tabs.value.includes(tab.value)) tab.value = tabs.value[0]!
  try {
    const result = await request<{ spaces: MakerSpace[] }>(tab.value === 'favorites' ? `/users/${props.userId}/favorites` : `/users/${props.userId}`)
    if (version === sequence) spaces.value = result.spaces
  } catch (cause) { if (version === sequence) error.value = errorMessage(cause) }
  finally { if (version === sequence) loading.value = false }
}
function update(space: MakerSpace) {
  spaces.value = spaces.value.map(item => item.id === space.id ? space : item).filter(item => !own.value || tab.value !== 'favorites' || item.is_favorited)
}
onMounted(load)
watch([() => props.userId, authInitialized, () => user.value?.id, tab, () => props.visibility], load)
onBeforeUnmount(() => { sequence++ })
</script>
<template>
  <section v-if="tabs.length" class="maker-page maker-profile-spaces" :aria-label="t('makerspace.profile.title')">
    <header class="maker-header"><h2>{{ t('makerspace.profile.title') }}</h2></header>
    <nav class="maker-tabs" :aria-label="t('makerspace.views')"><button v-if="tabs.includes('created')" type="button" :aria-pressed="tab === 'created'" @click="tab = 'created'">{{ t(own ? 'makerspace.profile.createdMine' : 'makerspace.profile.created') }}</button><button v-if="tabs.includes('favorites')" type="button" :aria-pressed="tab === 'favorites'" @click="tab = 'favorites'">{{ t(own ? 'makerspace.profile.favorites' : 'profileVisibility.publicFavorites') }}</button></nav>
    <p v-if="privateSection" class="maker-profile-hint">{{ t('profileVisibility.onlyYou') }}</p>
    <p v-else-if="own && tab === 'created'" class="maker-profile-hint">{{ t('makerspace.profile.privateHint') }}</p>
    <p v-else-if="tab === 'favorites'" class="maker-profile-hint">{{ t('profileVisibility.publicFavoritesHint') }}</p>
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
