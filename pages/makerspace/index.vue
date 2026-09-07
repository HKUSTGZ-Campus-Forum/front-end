<script setup lang="ts">
import type { MakerCapabilities, MakerSpace } from '~/types/makerspace'
definePageMeta({ layout: 'keguang' })
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { request, errorMessage, title, description } = useMakerSpace()
const { isLoggedIn, user, authInitialized } = useAuth()
const route = useRoute()
const tab = ref(route.query.view === 'mine' ? 'mine' : 'discover')
const spaces = ref<MakerSpace[]>([])
const capability = ref<MakerCapabilities | null>(null)
const loading = ref(true)
const error = ref('')
const query = ref('')
const category = ref('')
const isAdmin = computed(() => user.value?.role_name === 'admin')
const visible = computed(() => spaces.value.filter(space => (!category.value || space.category === category.value) && `${title(space)} ${description(space)}`.toLowerCase().includes(query.value.toLowerCase())))
let sequence = 0
async function load() {
  const version = ++sequence
  loading.value = true
  error.value = ''
  spaces.value = []
  try {
    if (tab.value === 'mine' && !isLoggedIn.value) return
    const result = await request<{ spaces: MakerSpace[] }>(tab.value === 'mine' ? '/mine' : '')
    if (version === sequence) spaces.value = result.spaces
  } catch (cause) { if (version === sequence) error.value = errorMessage(cause) }
  finally { if (version === sequence) loading.value = false }
}
onMounted(async () => { if (authInitialized.value) await load(); capability.value = await request<MakerCapabilities>('/capabilities').catch(() => null) })
watch([tab, authInitialized, isLoggedIn], () => { if (authInitialized.value) load() })
useHead({ title: computed(() => t('makerspace.title')) })
</script>

<template>
  <main class="maker-page">
    <header class="maker-header"><div><h1>{{ t('makerspace.title') }}</h1><p>{{ t('makerspace.subtitle') }}</p></div><div class="maker-actions"><NuxtLink class="maker-button" :to="getLocalePath('/makerspace/guide')">{{ t('makerspace.guide') }}</NuxtLink><NuxtLink class="maker-button maker-button--primary" :to="getLocalePath('/makerspace/new')"><Icon name="lucide:plus" />{{ t('makerspace.create') }}</NuxtLink></div></header>
    <nav class="maker-tabs" :aria-label="t('makerspace.views')"><button :aria-pressed="tab === 'discover'" @click="tab = 'discover'">{{ t('makerspace.discover') }}</button><button :aria-pressed="tab === 'mine'" @click="tab = 'mine'">{{ t('makerspace.mine') }}</button><NuxtLink v-if="isAdmin" class="maker-button" :to="getLocalePath('/makerspace/review')">{{ t('makerspace.review') }}</NuxtLink></nav>
    <div v-if="tab === 'mine' && capability" class="maker-notice">{{ t('makerspace.quota', { count: capability.max_spaces, memory: capability.quota.memory_mb, storage: capability.quota.storage_mb }) }}</div>
    <div v-if="tab === 'mine' && !isLoggedIn && authInitialized" class="maker-card maker-empty"><h2>{{ t('makerspace.signInTitle') }}</h2><p>{{ t('makerspace.signInText') }}</p><NuxtLink class="maker-button maker-button--primary" :to="getLocalePath('/login')">{{ t('makerspace.signIn') }}</NuxtLink></div>
    <template v-else>
      <div class="maker-filter"><input v-model="query" type="search" :placeholder="t('makerspace.search')" :aria-label="t('makerspace.search')" /><select v-model="category" :aria-label="t('makerspace.form.category')"><option value="">{{ t('makerspace.allCategories') }}</option><option v-for="value in ['tools', 'learning', 'campus', 'games', 'other']" :key="value" :value="value">{{ t(`makerspace.categories.${value}`) }}</option></select></div>
      <div v-if="loading" class="maker-card maker-empty" role="status">{{ t('makerspace.loading') }}</div>
      <div v-else-if="error" class="maker-notice" role="alert">{{ error }} <button class="maker-button" @click="load">{{ t('makerspace.retry') }}</button></div>
      <div v-else-if="!visible.length" class="maker-card maker-empty"><h2>{{ t(query || category ? 'makerspace.noResults' : tab === 'mine' ? 'makerspace.emptyMine' : 'makerspace.emptyPublic') }}</h2><p>{{ t(query || category ? 'makerspace.changeSearch' : 'makerspace.startHint') }}</p><NuxtLink v-if="!query && !category" class="maker-button" :to="getLocalePath('/makerspace/new')">{{ t('makerspace.create') }}</NuxtLink></div>
      <div v-else class="maker-grid"><article v-for="space in visible" :key="space.id" class="maker-card"><div class="maker-card-top"><span class="maker-icon"><Icon :name="space.slug === 'teamup' ? 'lucide:users' : 'lucide:blocks'" /></span><span class="maker-badge">{{ t(`makerspace.states.${space.status}`) }}</span></div><h2>{{ title(space) }}</h2><p>{{ description(space) }}</p><div class="maker-meta"><span>{{ t(`makerspace.categories.${space.category}`) }}</span><span v-if="space.owner">{{ t('makerspace.by', { name: space.owner.username }) }}</span></div><div class="maker-actions"><NuxtLink class="maker-button maker-button--primary" :to="getLocalePath(`/makerspace/${space.slug}`)">{{ t(tab === 'mine' ? 'makerspace.manage' : 'makerspace.details') }}<Icon name="lucide:arrow-up-right" /></NuxtLink><a v-if="space.kind === 'external' && space.launch_path" class="maker-button" :href="space.launch_path">{{ t('makerspace.open') }}</a></div></article></div>
    </template>
  </main>
</template>
<style src="~/assets/css/makerspace.scss" lang="scss" />
