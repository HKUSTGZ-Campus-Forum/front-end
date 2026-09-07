<script setup lang="ts">
import type { MakerCapabilities, MakerSpace } from '~/types/makerspace'
definePageMeta({ layout: 'keguang' })
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { isLoggedIn, authInitialized } = useAuth()
const { request, errorMessage } = useMakerSpace()
const draft = ref(emptyMakerDraft())
const busy = ref(false)
const error = ref('')
const capability = ref<MakerCapabilities | null>(null)
const mounted = ref(false)
onMounted(async () => { mounted.value = true; capability.value = await request<MakerCapabilities>('/capabilities').catch(() => null) })
async function create() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { const space = await request<MakerSpace>('', 'POST', draft.value); await navigateTo(getLocalePath(`/makerspace/${space.slug}`)) }
  catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
useHead({ title: computed(() => t('makerspace.create')) })
</script>
<template>
  <main class="maker-page">
    <header class="maker-header"><div><h1>{{ t('makerspace.create') }}</h1><p>{{ t('makerspace.newIntro') }}</p></div><NuxtLink class="maker-button" :to="getLocalePath('/makerspace')">{{ t('makerspace.back') }}</NuxtLink></header>
    <div v-if="!mounted || !authInitialized" class="maker-card" role="status">{{ t('makerspace.loading') }}</div>
    <div v-else-if="!isLoggedIn" class="maker-card"><h2>{{ t('makerspace.signInTitle') }}</h2><p>{{ t('makerspace.signInText') }}</p><NuxtLink class="maker-button maker-button--primary" :to="getLocalePath('/login')">{{ t('makerspace.signIn') }}</NuxtLink></div>
    <form v-else class="maker-card" @submit.prevent="create">
      <div v-if="capability && !capability.hosting_ready" class="maker-notice">{{ t('makerspace.hostingUnavailable') }}</div>
      <MakerspaceSpaceForm v-model="draft" :disabled="busy" />
      <div v-if="error" class="maker-notice" role="alert">{{ error }}</div>
      <div class="maker-actions"><button class="maker-button maker-button--primary" :disabled="busy">{{ t(busy ? 'makerspace.saving' : 'makerspace.createPrivate') }}</button><NuxtLink :to="getLocalePath('/makerspace/guide')">{{ t('makerspace.guide') }}</NuxtLink></div>
    </form>
  </main>
</template>
<style src="~/assets/css/makerspace.scss" lang="scss" />
