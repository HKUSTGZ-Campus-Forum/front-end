<script setup lang="ts">
interface Policy {
  direction: 'export' | 'import'; resource: string; fields: Record<string, string>; client_name: string;
  external_origin: string; purpose: string; record_scope: string; retention_days: number;
  deletion_policy: string; conflict_policy: string; expires_at: string; source_sha: string; artifact_digest: string;
}
interface Grant { id: string; slug: string; policy: Policy; policy_digest: string; status: string; requested_by: number; reviewed_by: number | null; review_note: string | null; credential_issued: boolean; gateway_path: string }
interface Audit { id: number; action: string; record_count: number; created_at: string }
const props = defineProps<{ slug?: string; hosted?: boolean; admin?: boolean }>()
const { t } = useI18n()
const { user } = useAuth()
const { request, errorMessage } = useMakerSpace()
const grants = ref<Grant[]>([])
const loading = ref(true), busy = ref(false), error = ref(''), notice = ref(''), ready = ref(false)
const creating = ref(false), secret = ref(''), secretGrant = ref('')
const notes = reactive<Record<string, string>>({}), confirmations = reactive<Record<string, boolean>>({})
const events = ref<Audit[]>([]), auditGrant = ref('')
const requestBusy = ref(false)
let generation = 0
async function load() {
  const current = ++generation
  loading.value = true; error.value = ''
  try {
    const value = await request<{ grants: Grant[]; runtime_ready: boolean }>(props.admin ? '/admin/sync' : `/${props.slug}/sync`)
    if (current === generation) { grants.value = value.grants; ready.value = value.runtime_ready }
  } catch (cause) { if (current === generation) error.value = errorMessage(cause) }
  finally { if (current === generation) loading.value = false }
}
async function execute(operation: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await operation() }
  catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
async function submitted() { creating.value = false; notice.value = t('makerspace.sync.submitted'); await load() }
async function review(grant: Grant, decision: string) {
  await execute(async () => {
    await request(`/admin/sync/${grant.id}/review`, 'POST', { decision, policy_digest: grant.policy_digest, note: notes[grant.id] })
    confirmations[grant.id] = false; notice.value = t('makerspace.saved'); await load()
  })
}
async function revoke(grant: Grant) {
  await execute(async () => {
    await request(`/sync/${grant.id}/revoke`, 'POST', {})
    confirmations[grant.id] = false; secret.value = ''; notice.value = t('makerspace.sync.revokedNotice'); await load()
  })
}
async function credential(grant: Grant) {
  await execute(async () => {
    const result = await request<{ token: string }>(`/sync/${grant.id}/credential`, 'POST', {})
    secret.value = result.token; secretGrant.value = grant.id; confirmations[grant.id] = false; await load()
  })
}
async function audit(grant: Grant) {
  await execute(async () => {
    events.value = (await request<{ events: Audit[] }>(`/sync/${grant.id}/audit`)).events; auditGrant.value = grant.id
  })
}
async function copySecret() {
  await execute(async () => { await navigator.clipboard.writeText(secret.value); notice.value = t('makerspace.copied') })
}
watch(() => [props.slug, props.admin], () => { secret.value = ''; grants.value = []; events.value = []; load() }, { immediate: true })
onBeforeUnmount(() => { generation++; secret.value = '' })
</script>

<template>
  <section class="maker-card maker-sync" aria-labelledby="sync-heading">
    <header class="maker-header"><div><h2 id="sync-heading">{{ t('makerspace.sync.title') }}</h2><p>{{ t('makerspace.sync.intro') }}</p></div><button v-if="!admin && hosted" class="maker-button maker-button--primary" :disabled="busy || requestBusy || loading" @click="creating = !creating">{{ t(creating ? 'makerspace.sync.cancel' : 'makerspace.sync.request') }}</button></header>
    <p v-if="!hosted && !admin" class="maker-notice">{{ t('makerspace.sync.migrationRequired') }}</p>
    <p v-else-if="!loading && !ready" class="maker-notice">{{ t('makerspace.sync.runtimeUnavailable') }}</p>
    <p class="maker-meta">{{ t('makerspace.sync.boundary') }}</p>
    <div v-if="error" class="maker-notice" role="alert">{{ error }} <button class="maker-button" :disabled="busy" @click="load">{{ t('makerspace.retry') }}</button></div>
    <p v-if="notice" class="maker-notice" role="status">{{ notice }}</p>
    <MakerspaceSyncRequestForm v-if="creating && slug" :slug="slug" :disabled="busy" @submitted="submitted" @busy="requestBusy = $event" />
    <p v-if="loading" role="status">{{ t('makerspace.loading') }}</p>
    <p v-else-if="!error && !grants.length">{{ t('makerspace.sync.empty') }}</p>
    <article v-for="grant in grants" :key="grant.id" class="maker-sync-grant">
      <div class="maker-header"><h3>{{ grant.policy.client_name }} · {{ grant.policy.resource }}</h3><div class="maker-meta"><span class="maker-badge">{{ t(`makerspace.sync.${grant.policy.direction}`) }}</span><span>{{ t(`makerspace.sync.statuses.${grant.status}`) }}</span></div></div>
      <p v-if="admin"><code>{{ grant.slug }}</code></p><p>{{ grant.policy.purpose }}</p>
      <dl class="maker-sync-definition">
        <dt>{{ t('makerspace.sync.externalOrigin') }}</dt><dd>{{ grant.policy.external_origin }}</dd>
        <dt>{{ t('makerspace.sync.scope') }}</dt><dd>{{ grant.policy.record_scope }}</dd>
        <dt>{{ t('makerspace.sync.fields') }}</dt><dd><span v-for="(kind, name) in grant.policy.fields" :key="name" class="maker-sync-field-tag"><code>{{ name }}</code> ({{ t(`makerspace.sync.types.${kind}`) }})</span></dd>
        <dt>{{ t('makerspace.sync.expiry') }}</dt><dd>{{ new Date(grant.policy.expires_at).toLocaleString() }}</dd>
        <dt>{{ t('makerspace.sync.retention') }}</dt><dd>{{ grant.policy.retention_days }}</dd>
        <dt>{{ t('makerspace.sync.conflict') }}</dt><dd>{{ grant.policy.conflict_policy }}</dd>
        <dt>{{ t('makerspace.sync.deletion') }}</dt><dd>{{ grant.policy.deletion_policy }}</dd>
      </dl>
      <details><summary>{{ t('makerspace.sync.version') }}</summary><p>{{ t('makerspace.sourceCommit') }}<br /><code>{{ grant.policy.source_sha }}</code></p><p>{{ t('makerspace.artifact') }}<br /><code>{{ grant.policy.artifact_digest }}</code></p><p>{{ t('makerspace.sync.digest') }}<br /><code>{{ grant.policy_digest }}</code></p><p>{{ t('makerspace.sync.endpoint') }}<br /><code>{{ grant.gateway_path }}</code></p></details>
      <p v-if="grant.review_note">{{ t('makerspace.sync.reviewNote') }}: {{ grant.review_note }}</p>
      <template v-if="admin && grant.status === 'pending'">
        <label>{{ t('makerspace.sync.reviewNote') }}<textarea v-model="notes[grant.id]" maxlength="2000" :disabled="busy" /></label>
        <label class="maker-check"><input v-model="confirmations[grant.id]" type="checkbox" :disabled="busy" />{{ t('makerspace.sync.reviewConfirm') }}</label>
        <p v-if="grant.requested_by === user?.id">{{ t('makerspace.errors.independent_review_required') }}</p>
        <div class="maker-actions"><button class="maker-button maker-button--primary" :disabled="busy || !ready || !confirmations[grant.id] || !notes[grant.id]?.trim() || grant.requested_by === user?.id" @click="review(grant, 'approve')">{{ t('makerspace.sync.approve') }}</button><button class="maker-button" :disabled="busy || !notes[grant.id]?.trim() || grant.requested_by === user?.id" @click="review(grant, 'reject')">{{ t('makerspace.sync.reject') }}</button></div>
      </template>
      <template v-if="['approved', 'pending', 'expired', 'inactive'].includes(grant.status) && !(admin && grant.status === 'pending')">
        <label class="maker-check"><input v-model="confirmations[grant.id]" type="checkbox" :disabled="busy" />{{ t('makerspace.sync.changeConfirm') }}</label>
        <div class="maker-actions"><button v-if="!admin && grant.status === 'approved'" class="maker-button" :disabled="busy || (grant.credential_issued && !confirmations[grant.id])" @click="credential(grant)">{{ t(grant.credential_issued ? 'makerspace.sync.rotate' : 'makerspace.sync.issue') }}</button><button class="maker-button" :disabled="busy || !confirmations[grant.id]" @click="revoke(grant)">{{ t('makerspace.sync.revoke') }}</button></div>
      </template>
      <div v-if="secret && secretGrant === grant.id" class="maker-notice"><p>{{ t('makerspace.sync.secretWarning') }}</p><label>{{ t('makerspace.sync.credential') }}<textarea :value="secret" readonly autocomplete="off" spellcheck="false" rows="2" /></label><div class="maker-actions"><button class="maker-button" @click="copySecret">{{ t('makerspace.copy') }}</button><button class="maker-button" @click="secret = ''">{{ t('makerspace.hideSecret') }}</button></div></div>
      <div class="maker-actions"><button class="maker-button" :disabled="busy" @click="audit(grant)">{{ t('makerspace.sync.audit') }}</button></div>
      <ol v-if="auditGrant === grant.id" class="maker-sync-events"><li v-for="event in events" :key="event.id"><time>{{ new Date(event.created_at).toLocaleString() }}</time> · {{ t(`makerspace.sync.events.${event.action}`) }} · {{ t('makerspace.sync.recordCount', { count: event.record_count }) }}</li></ol>
    </article>
  </section>
</template>
<style scoped lang="scss">
.maker-sync { min-width: 0; }
.maker-sync-form { margin-block: 1.5rem; }
.maker-sync fieldset { min-width: 0; padding: 0; border: 0; }
.maker-sync legend { font-weight: 600; margin-bottom: 1rem; }
.maker-sync-grant { border-top: 1px solid var(--border-primary); margin-top: 1.5rem; padding-top: 1.5rem; }
.maker-sync-field { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: end; gap: .75rem; margin-bottom: .75rem; }
.maker-sync-definition { display: grid; grid-template-columns: minmax(8rem, 1fr) minmax(0, 3fr); gap: .6rem 1rem; }
.maker-sync-definition dt { color: var(--text-secondary); }
.maker-sync-definition dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.maker-sync-field-tag { display: inline-block; margin-right: 1rem; }
.maker-sync-events { padding-left: 1.25rem; line-height: 1.8; }
.maker-sync code { overflow-wrap: anywhere; }
@media (max-width: 600px) { .maker-sync-field { grid-template-columns: minmax(0, 1fr); } .maker-sync-definition { grid-template-columns: minmax(0, 1fr); } .maker-sync-definition dd { margin-bottom: .5rem; } }
</style>
