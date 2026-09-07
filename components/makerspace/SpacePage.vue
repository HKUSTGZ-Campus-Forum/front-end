<script setup lang="ts">
import TeamUpHostPage from '~/components/teamup/TeamUpHostPage.vue'
import { makerSpaceUrl } from '~/utils/makerspaceUrl'
import type { MakerCapabilities, MakerDeployment, MakerDraft, MakerSpace } from '~/types/makerspace'
const route = useRoute()
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { isLoggedIn, authInitialized, user } = useAuth()
const { request, errorMessage, title, description } = useMakerSpace()
const slug = computed(() => encodeURIComponent(String(route.params.slug)))
const space = ref<MakerSpace | null>(null)
const isTeamUp = computed(() => space.value?.slug === 'teamup' && space.value.kind === 'external' && space.value.status === 'published')
const capability = ref<MakerCapabilities | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const editing = ref(false)
const draft = ref<MakerDraft>(emptyMakerDraft())
const credential = ref<{ public_key: string; webhook_secret: string; webhook_path: string } | null>(null)
const rotateConfirmed = ref(false)
const archiveConfirmed = ref(false)
const frame = ref('')
const frameLoading = ref(false)
const environmentName = ref('')
const environmentValue = ref('')
let timer: ReturnType<typeof setInterval> | undefined
const locked = computed(() => space.value?.deployments?.some(item => ['queued', 'building'].includes(item.status) || item.review_status === 'pending' || ['queued', 'publishing'].includes(item.publication_status)))
let loadSequence = 0
async function load() {
  const sequence = ++loadSequence
  error.value = ''
  try {
    const result = await request<MakerSpace>(`/${slug.value}`)
    if (sequence !== loadSequence) return
    space.value = result
    if (!editing.value) draft.value = structuredClone(result)
  } catch (cause) { if (sequence === loadSequence) error.value = errorMessage(cause) }
  finally { if (sequence === loadSequence) loading.value = false }
}
async function action(path: string, method = 'POST', body: unknown = {}) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await request(`/${slug.value}${path}`, method, body); notice.value = t('makerspace.saved'); await load() }
  catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
async function save() {
  await action('', 'PUT', { ...draft.value, version: space.value?.version })
  if (!error.value) editing.value = false
}
async function connect() {
  busy.value = true; error.value = ''
  try { credential.value = await request(`/${slug.value}/credentials`, 'POST', {}); rotateConfirmed.value = false; await load() }
  catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); notice.value = t('makerspace.copied') }
  catch { notice.value = t('makerspace.copyManually') }
}
function copyLink() { if (space.value) copy(makerSpaceUrl(space.value.slug)) }
async function launch(item?: MakerDeployment) {
  busy.value = true; error.value = ''; frame.value = ''
  try {
    const result = await request<{ url: string }>(`/${slug.value}/launch`, 'POST', item ? { deployment_id: item.id } : {})
    if (!/^\/api\/makerspace\/run\/[a-f0-9]{48}\/$/.test(result.url)) throw new Error('request_failed')
    frameLoading.value = true; frame.value = result.url
  } catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
async function saveEnvironment() {
  await action('/environment', 'PUT', { values: { [environmentName.value]: environmentValue.value } })
  if (!error.value) { environmentName.value = ''; environmentValue.value = '' }
}
async function archive() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    await request(`/${slug.value}/archive`, 'POST', {})
    await navigateTo(getLocalePath('/makerspace?view=mine'))
  } catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
onMounted(async () => {
  if (authInitialized.value) await load()
  capability.value = await request<MakerCapabilities>('/capabilities').catch(() => null)
  timer = setInterval(() => { if (locked.value && !busy.value && !editing.value) load() }, 10000)
})
watch([authInitialized, isLoggedIn, slug], () => {
  loadSequence++; frame.value = ''; space.value = null; credential.value = null
  editing.value = false; loading.value = true; notice.value = ''; error.value = ''
  rotateConfirmed.value = false; archiveConfirmed.value = false
  if (authInitialized.value) load()
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
useHead({ title: computed(() => space.value ? title(space.value) : t('makerspace.title')) })
</script>

<template>
  <main class="maker-page">
    <header class="maker-header"><div><h1>{{ space ? title(space) : t('makerspace.title') }}</h1><p v-if="space?.owner"><MakerspaceAuthorLink :owner="space.owner" /></p></div><NuxtLink class="maker-button" :to="getLocalePath('/makerspace')">{{ t('makerspace.back') }}</NuxtLink></header>
    <div v-if="error" class="maker-notice" role="alert">{{ error }} <button v-if="!space" class="maker-button" @click="load">{{ t('makerspace.retry') }}</button></div>
    <div v-if="notice" class="maker-notice" role="status">{{ notice }}</div>
    <div v-if="loading" class="maker-card" role="status">{{ t('makerspace.loading') }}</div>
    <template v-if="space">
      <section v-if="user?.role_name === 'admin' && !space.is_owner && space.deployments?.length" class="maker-card"><h2>{{ t('makerspace.review') }}</h2><div v-for="item in space.deployments.filter(value => value.review_status === 'pending')" :key="item.id" class="maker-actions"><code>{{ item.source_sha }}</code><button class="maker-button" :disabled="busy" @click="launch(item)">{{ t('makerspace.preview') }}</button><NuxtLink class="maker-button" :to="getLocalePath('/makerspace/review')">{{ t('makerspace.review') }}</NuxtLink></div></section>
      <section class="maker-card maker-overview"><MakerspaceSpaceCover v-if="space.cover_url" :url="space.cover_url" :title="title(space)" :private="space.status !== 'published'" /><div class="maker-overview-body"><div class="maker-card-top"><span class="maker-badge">{{ t(`makerspace.states.${space.status}`) }}</span><span class="maker-meta">{{ t(`makerspace.categories.${space.category}`) }}</span></div><p>{{ description(space) }}</p><div class="maker-actions"><button v-if="space.status === 'published' && !isTeamUp" class="maker-button maker-button--primary" :disabled="busy" @click="launch()">{{ t('makerspace.open') }}<Icon name="lucide:arrow-up-right" /></button><button v-if="space.is_owner && space.kind === 'hosted'" class="maker-button" :disabled="busy || locked" @click="editing = !editing">{{ t(editing ? 'makerspace.cancel' : 'makerspace.edit') }}</button><button class="maker-button" @click="copyLink">{{ t('makerspace.copyLink') }}</button><MakerspaceSpaceActions :space="space" @updated="space = $event" /></div></div></section>
      <MakerspaceCoverEditor v-if="space.is_owner" :space="space" @updated="url => { if (space) space.cover_url = url }" />
      <TeamUpHostPage v-if="isTeamUp" />
      <section v-if="frame" class="maker-card"><div class="maker-header"><div><h2>{{ t('makerspace.running') }}</h2><p>{{ t('makerspace.sessionHint') }}</p></div><button class="maker-button" @click="frame = ''">{{ t('makerspace.close') }}</button></div><p v-if="frameLoading" role="status">{{ t('makerspace.loading') }}</p><iframe class="maker-frame" :src="frame" :title="title(space)" sandbox="allow-scripts allow-forms allow-downloads" referrerpolicy="no-referrer" @load="frameLoading = false" /></section>
      <div v-if="space.is_owner && space.kind === 'external'" class="maker-notice">{{ t('makerspace.externalOwner') }} <NuxtLink :to="getLocalePath('/makerspace/guide')">{{ t('makerspace.guide') }}</NuxtLink></div>
      <template v-if="space.is_owner && space.kind === 'hosted'">
        <form v-if="editing" class="maker-card" @submit.prevent="save"><h2>{{ t('makerspace.edit') }}</h2><MakerspaceSpaceForm v-model="draft" editing :disabled="busy || locked" /><button class="maker-button maker-button--primary" :disabled="busy || locked">{{ t('makerspace.save') }}</button></form>
        <div v-if="capability && !capability.hosting_ready" class="maker-notice">{{ t('makerspace.hostingUnavailable') }}</div>
        <section class="maker-card"><h2>{{ t('makerspace.connect') }}</h2><p>{{ t('makerspace.connectIntro') }}</p><div class="maker-meta"><code>{{ space.repository }}</code><code>{{ space.branch }}</code></div>
          <template v-if="space.public_key"><label>{{ t('makerspace.publicKey') }}<textarea :value="space.public_key" readonly rows="3" /></label><div class="maker-actions"><button class="maker-button" @click="copy(space.public_key!)">{{ t('makerspace.copy') }}</button></div><p>{{ t('makerspace.keyHint') }}</p></template>
          <template v-if="credential"><div class="maker-notice"><strong>{{ t('makerspace.secretOnce') }}</strong></div><label>{{ t('makerspace.webhookUrl') }}<input :value="credential.webhook_path" readonly /></label><label>{{ t('makerspace.webhookSecret') }}<input :value="credential.webhook_secret" readonly autocomplete="off" /></label><div class="maker-actions"><button class="maker-button" @click="copy(credential.webhook_secret)">{{ t('makerspace.copySecret') }}</button><button class="maker-button" @click="credential = null">{{ t('makerspace.hideSecret') }}</button></div></template>
          <label v-if="space.public_key" class="maker-check"><input v-model="rotateConfirmed" type="checkbox" />{{ t('makerspace.rotateWarning') }}</label>
          <div class="maker-actions"><button class="maker-button" :disabled="busy || locked || (!rotateConfirmed && !!space.public_key) || !capability?.credentials_ready" @click="connect">{{ t(space.public_key ? 'makerspace.rotateKey' : 'makerspace.generateKey') }}</button><NuxtLink :to="getLocalePath('/makerspace/guide')">{{ t('makerspace.connectionSteps') }}</NuxtLink></div>
        </section>
        <section class="maker-card"><div class="maker-header"><div><h2>{{ t('makerspace.deployments') }}</h2><p>{{ t('makerspace.deployIntro') }}</p></div><button class="maker-button maker-button--primary" :disabled="busy || locked || !space.public_key || !capability?.hosting_ready" @click="action('/deployments')">{{ t('makerspace.deploy') }}</button></div>
          <p v-if="!space.deployments?.length">{{ t('makerspace.noDeployments') }}</p>
          <article v-for="item in space.deployments" :key="item.id" class="maker-card"><div class="maker-meta"><span class="maker-badge">{{ t(`makerspace.states.${item.status}`) }}</span><span>{{ t(`makerspace.states.${item.review_status}`) }}</span><span v-if="item.publication_status !== 'none'">{{ t('makerspace.publication') }} · {{ t(`makerspace.states.${item.publication_status}`) }}</span><time>{{ new Date(item.created_at).toLocaleString() }}</time></div><code>{{ item.source_sha || t('makerspace.resolvingCommit') }}</code><p v-if="item.review_note">{{ item.review_note }}</p><p v-if="item.error_code">{{ errorMessage(new Error(item.error_code)) }}</p><div class="maker-actions"><button v-if="item.status === 'ready'" class="maker-button" :disabled="busy" @click="launch(item)">{{ t('makerspace.preview') }}</button><button v-if="item.status === 'ready' && ['draft', 'rejected', 'withdrawn'].includes(item.review_status)" class="maker-button maker-button--primary" :disabled="busy || space.status === 'suspended'" @click="action(`/deployments/${item.id}/submit`)">{{ t('makerspace.submitReview') }}</button><button v-if="item.review_status === 'approved' && item.publication_status === 'failed'" class="maker-button" :disabled="busy || locked || !capability?.hosting_ready" @click="action(`/deployments/${item.id}/retry-publication`)">{{ t('makerspace.retryPublication') }}</button><button v-if="item.review_status === 'pending'" class="maker-button" :disabled="busy" @click="action(`/deployments/${item.id}/withdraw`)">{{ t('makerspace.withdraw') }}</button></div><details v-if="item.log"><summary>{{ t('makerspace.buildLog') }}</summary><pre>{{ item.log }}</pre></details></article>
        </section>
        <details class="maker-card"><summary>{{ t('makerspace.environment') }}</summary><p>{{ t('makerspace.environmentHint') }}</p><div class="maker-stack"><div v-for="name in space.environment_names" :key="name" class="maker-actions"><code>{{ name }}</code><button class="maker-button" :disabled="busy || locked" @click="action('/environment', 'PUT', { values: { [name]: null } })">{{ t('makerspace.remove') }}</button></div><form @submit.prevent="saveEnvironment"><div class="maker-fields"><label>{{ t('makerspace.variableName') }}<input v-model="environmentName" required pattern="[A-Z][A-Z0-9_]{0,63}" :disabled="busy || locked" /></label><label>{{ t('makerspace.variableValue') }}<input v-model="environmentValue" type="password" required autocomplete="new-password" :disabled="busy || locked" /></label></div><button class="maker-button" :disabled="busy || locked">{{ t('makerspace.save') }}</button></form></div></details>
        <details class="maker-card"><summary>{{ t('makerspace.archive') }}</summary><p>{{ t('makerspace.archiveHint') }}</p><label class="maker-check"><input v-model="archiveConfirmed" type="checkbox" />{{ t('makerspace.archiveConfirm') }}</label><div class="maker-actions"><button class="maker-button" :disabled="busy || !archiveConfirmed" @click="archive">{{ t('makerspace.archive') }}</button></div></details>
      </template>
    </template>
  </main>
</template>
<style src="~/assets/css/makerspace.scss" lang="scss" />
