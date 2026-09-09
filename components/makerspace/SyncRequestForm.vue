<script setup lang="ts">
import type { SyncCatalog, SyncDirection } from '~/types/makerspace-sync'
import { selectSyncContract } from '~/utils/makerspaceSync'

const props = defineProps<{ slug: string; disabled?: boolean }>()
const emit = defineEmits<{ submitted: []; busy: [value: boolean] }>()
const { t } = useI18n()
const { request, errorMessage } = useMakerSpace()
const catalog = ref<SyncCatalog | null>(null)
const loading = ref(true), sending = ref(false), loadError = ref(''), submitError = ref('')
const resourceName = ref(''), direction = ref<SyncDirection>('export'), selected = ref<string[]>([])
const resource = computed(() => catalog.value?.resources[resourceName.value])
const resourceNames = computed(() => Object.keys(catalog.value?.resources || {}))
const form = reactive({ client_name: '', external_origin: '', purpose: '', retention_days: 7,
  deletion_policy: '', conflict_policy: '', expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })
let generation = 0
async function loadCatalog() {
  const current = ++generation
  loading.value = true; loadError.value = ''; catalog.value = null; resourceName.value = ''; selected.value = []
  try {
    const value = await request<SyncCatalog>(`/${props.slug}/sync/catalog`)
    if (current === generation) catalog.value = value
  } catch (cause) { if (current === generation) loadError.value = errorMessage(cause) }
  finally { if (current === generation) loading.value = false }
}
watch(resourceName, () => {
  selected.value = []
  direction.value = resource.value?.directions.includes('export') ? 'export' : 'import'
})
async function submit() {
  if (!catalog.value || sending.value || props.disabled || !selected.value.length) return
  const current = generation
  sending.value = true; emit('busy', true); submitError.value = ''
  try {
    const selection = selectSyncContract(catalog.value, resourceName.value, direction.value, selected.value)
    await request(`/${props.slug}/sync`, 'POST', { ...form, ...selection,
      expires_at: new Date(`${form.expires_at}T23:59:00`).toISOString() })
    if (current === generation) emit('submitted')
  } catch (cause) {
    if (current !== generation) return
    submitError.value = errorMessage(cause)
    if (cause instanceof Error && ['sync_catalog_changed', 'sync_invalid_contract', 'sync_published_sandbox_required'].includes(cause.message)) await loadCatalog()
  } finally { sending.value = false; emit('busy', false) }
}
watch(() => props.slug, () => { submitError.value = ''; loadCatalog() }, { immediate: true })
onBeforeUnmount(() => { generation++ })
</script>

<template>
  <div class="sync-request">
    <p class="sync-intro">{{ t('makerspace.sync.catalogIntro') }}</p>
    <div v-if="loading" class="sync-loading" role="status" aria-live="polite">
      <p>{{ t('makerspace.sync.catalogLoading') }}</p><div aria-hidden="true" class="sync-skeleton" /><div aria-hidden="true" class="sync-skeleton sync-skeleton--short" />
    </div>
    <div v-else-if="loadError" class="maker-notice" role="alert"><p>{{ loadError }}</p><button type="button" class="maker-button" @click="loadCatalog">{{ t('makerspace.sync.reloadCatalog') }}</button></div>
    <div v-else-if="!resourceNames.length" class="maker-notice"><h3>{{ t('makerspace.sync.catalogEmpty') }}</h3><p>{{ t('makerspace.sync.catalogEmptyHint') }}</p><button type="button" class="maker-button" @click="loadCatalog">{{ t('makerspace.sync.reloadCatalog') }}</button></div>
    <p v-if="submitError" class="maker-notice" role="alert">{{ submitError }}</p>
    <form v-if="catalog && resourceNames.length" @submit.prevent="submit">
      <fieldset :disabled="sending || disabled">
        <legend>{{ t('makerspace.sync.chooseData') }}</legend>
        <div class="maker-fields">
          <label>{{ t('makerspace.sync.resource') }}<select v-model="resourceName" required><option value="" disabled>{{ t('makerspace.sync.chooseResource') }}</option><option v-for="name in resourceNames" :key="name" :value="name">{{ name }}</option></select></label>
          <label>{{ t('makerspace.sync.direction') }}<select v-model="direction" :disabled="!resource" required><option v-for="value in resource?.directions || []" :key="value" :value="value">{{ t(`makerspace.sync.${value}`) }}</option></select></label>
        </div>
        <template v-if="resource">
          <div class="sync-scope"><h4>{{ t('makerspace.sync.scope') }}</h4><code>{{ resource.record_scope }}</code><p>{{ t('makerspace.sync.scopeFromCode') }}</p></div>
          <fieldset class="sync-fieldset"><legend>{{ t('makerspace.sync.fields') }}</legend><p>{{ t('makerspace.sync.selectFieldsHint') }}</p>
            <div class="sync-options"><label v-for="(kind, name) in resource.fields" :key="name" class="sync-option"><input v-model="selected" type="checkbox" :value="name" /><code>{{ name }}</code><span>{{ t(`makerspace.sync.types.${kind}`) }}</span></label></div>
            <p class="sync-count" aria-live="polite">{{ t('makerspace.sync.selectedFields', { count: selected.length }) }}</p>
          </fieldset>
          <details class="sync-protocol"><summary>{{ t('makerspace.sync.protocolFields') }}</summary>
            <p>{{ t(direction === 'export' ? 'makerspace.sync.exportMetadata' : 'makerspace.sync.importMetadata') }}</p>
            <div class="maker-meta"><code v-for="name in direction === 'export' ? ['id', 'version', 'deleted', 'next_cursor'] : ['record_id', 'event_id', 'expected_version', 'deleted']" :key="name">{{ name }}</code></div>
          </details>
        </template>
        <p class="sync-help">{{ t('makerspace.sync.missingFieldHint') }}</p>
      </fieldset>
      <fieldset v-if="resource" :disabled="sending || disabled" class="sync-usage">
        <legend>{{ t('makerspace.sync.describeUse') }}</legend>
        <div class="maker-fields">
          <label>{{ t('makerspace.sync.clientName') }}<input v-model="form.client_name" required maxlength="100" /></label>
          <label>{{ t('makerspace.sync.externalOrigin') }}<input v-model="form.external_origin" type="url" required placeholder="https://example.org" maxlength="253" /></label>
          <label>{{ t('makerspace.sync.expiry') }}<input v-model="form.expires_at" type="date" required /></label>
          <label>{{ t('makerspace.sync.retention') }}<input v-model.number="form.retention_days" type="number" min="1" max="90" required /></label>
          <label class="maker-wide">{{ t('makerspace.sync.purpose') }}<textarea v-model="form.purpose" required maxlength="2000" rows="2" /></label>
          <label class="maker-wide">{{ t('makerspace.sync.conflict') }}<textarea v-model="form.conflict_policy" required maxlength="1000" rows="2" /></label>
          <label class="maker-wide">{{ t('makerspace.sync.deletion') }}<textarea v-model="form.deletion_policy" required maxlength="2000" rows="2" /></label>
        </div>
        <p>{{ t('makerspace.sync.oneDirectionHint') }}</p>
        <div class="maker-actions"><button class="maker-button maker-button--primary" :disabled="!selected.length || sending || disabled">{{ t(sending ? 'makerspace.sync.submitting' : 'makerspace.sync.submit') }}</button></div>
      </fieldset>
      <details class="sync-version"><summary>{{ t('makerspace.sync.catalogVersion') }}</summary><p>{{ t('makerspace.sourceCommit') }}<br /><code>{{ catalog.source_sha }}</code></p><p>{{ t('makerspace.artifact') }}<br /><code>{{ catalog.artifact_digest }}</code></p></details>
    </form>
  </div>
</template>

<style scoped lang="scss">
.sync-request { margin-top: 24px; }
.sync-request fieldset { padding: 0; margin: 0; border: 0; min-width: 0; }
.sync-request legend { font-size: 1rem; font-weight: 650; margin-bottom: 16px; }
.sync-intro, .sync-help { max-width: 72ch; }
.sync-scope { margin-bottom: 24px; }
.sync-scope h4 { margin: 0 0 8px; font-size: .875rem; }
.sync-scope p { margin-top: 8px; }
.sync-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--border-secondary); }
.sync-option { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 12px 8px; border-bottom: 1px solid var(--border-secondary); cursor: pointer; }
.sync-option:has(input:checked) { background: var(--surface-secondary); }
.sync-option input { flex: 0 0 18px; width: 18px; height: 18px; accent-color: var(--interactive-primary); }
.sync-option code { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.sync-option span { color: var(--text-secondary); font-size: .8rem; font-weight: 400; }
.sync-count { margin-top: 12px; font-size: .875rem; }
.sync-protocol { margin-bottom: 16px; }
.sync-request .sync-usage { margin-top: 28px; border-top: 1px solid var(--border-secondary); padding-top: 24px; }
.sync-version { margin-top: 16px; }
.sync-skeleton { height: 44px; background: var(--surface-secondary); border-radius: 8px; margin-bottom: 12px; }
.sync-skeleton--short { width: 65%; }
@media(max-width: 640px) { .sync-options { grid-template-columns: minmax(0, 1fr); } }
</style>
