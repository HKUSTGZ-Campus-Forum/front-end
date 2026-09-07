<script setup lang="ts">
import type { MakerDeployment, MakerSpace } from '~/types/makerspace'
definePageMeta({ layout: 'keguang', middleware: ['admin'] })
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { request, title, description, errorMessage } = useMakerSpace()
const { fetchWithAuth } = useApi()
const { user, authInitialized } = useAuth()
const reviews = ref<{ space: MakerSpace; deployment: MakerDeployment }[]>([])
const notes = reactive<Record<string, string>>({})
const checked = reactive<Record<string, boolean>>({})
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const notice = ref('')
async function load() {
  loading.value = true
  try { reviews.value = (await request<{ reviews: typeof reviews.value }>('/admin/reviews')).reviews }
  catch (cause) { error.value = errorMessage(cause) }
  finally { loading.value = false }
}
async function review(space: MakerSpace, item: MakerDeployment, decision: 'approve' | 'reject') {
  busy.value = true; error.value = ''
  try { await request(`/admin/${space.slug}/deployments/${item.id}/review`, 'POST', { decision, source_sha: item.source_sha, artifact_digest: item.artifact_digest, note: notes[item.id] || '' }); notice.value = t(decision === 'approve' ? 'makerspace.approvedNotice' : 'makerspace.rejectedNotice'); await load() }
  catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
async function source(space: MakerSpace, item: MakerDeployment) {
  busy.value = true; error.value = ''
  try {
    const response = await fetchWithAuth(`/api/makerspace/admin/${space.slug}/deployments/${item.id}/source`)
    if (!response.ok) throw new Error('source_unavailable')
    const href = URL.createObjectURL(await response.blob())
    const link = document.createElement('a'); link.href = href; link.download = `${space.slug}-${item.source_sha}.tar.gz`; link.click()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  } catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
onMounted(() => { if (authInitialized.value) load() })
watch(authInitialized, ready => { if (ready) load() })
useHead({ title: computed(() => t('makerspace.review')) })
</script>
<template>
  <main class="maker-page"><header class="maker-header"><div><h1>{{ t('makerspace.review') }}</h1><p>{{ t('makerspace.reviewIntro') }}</p></div><NuxtLink class="maker-button" :to="getLocalePath('/makerspace')">{{ t('makerspace.back') }}</NuxtLink></header>
    <div v-if="error" class="maker-notice" role="alert">{{ error }}<button class="maker-button" @click="load">{{ t('makerspace.retry') }}</button></div><div v-if="notice" class="maker-notice" role="status">{{ notice }}</div>
    <div v-if="loading" class="maker-card" role="status">{{ t('makerspace.loading') }}</div><div v-else-if="!error && !reviews.length" class="maker-card maker-empty"><h2>{{ t('makerspace.noReviews') }}</h2><p>{{ t('makerspace.noReviewsText') }}</p></div>
    <article v-for="{ space, deployment } in reviews" :key="deployment.id" class="maker-card"><h2>{{ title(deployment.snapshot.metadata) }}</h2><p>{{ description(deployment.snapshot.metadata) }}</p><div class="maker-meta"><span v-if="space.owner">{{ t('makerspace.by', { name: space.owner.username }) }}</span><code>{{ deployment.snapshot.repository }}</code></div><p><strong>{{ t('makerspace.sourceCommit') }}</strong><br /><code>{{ deployment.source_sha }}</code></p><p><strong>{{ t('makerspace.artifact') }}</strong><br /><code>{{ deployment.artifact_digest }}</code></p><pre>{{ JSON.stringify(deployment.snapshot.settings, null, 2) }}</pre><div class="maker-actions"><button class="maker-button" :disabled="busy" @click="source(space, deployment)">{{ t('makerspace.downloadSource') }}</button><NuxtLink class="maker-button" :to="getLocalePath(`/makerspace/${space.slug}`)">{{ t('makerspace.details') }}</NuxtLink></div><details><summary>{{ t('makerspace.buildLog') }}</summary><pre>{{ deployment.log }}</pre></details><label>{{ t('makerspace.reviewNote') }}<textarea v-model="notes[deployment.id]" maxlength="3000" /></label><label class="maker-check"><input v-model="checked[deployment.id]" type="checkbox" />{{ t('makerspace.reviewConfirm') }}</label><p v-if="space.owner?.id === user?.id">{{ t('makerspace.errors.independent_review_required') }}</p><div class="maker-actions"><button class="maker-button maker-button--primary" :disabled="busy || !checked[deployment.id] || space.owner?.id === user?.id" @click="review(space, deployment, 'approve')">{{ t('makerspace.approve') }}</button><button class="maker-button" :disabled="busy || !notes[deployment.id]?.trim() || space.owner?.id === user?.id" @click="review(space, deployment, 'reject')">{{ t('makerspace.reject') }}</button></div></article>
  </main>
</template>
<style src="~/assets/css/makerspace.scss" lang="scss" />
