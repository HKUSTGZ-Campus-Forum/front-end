<script setup lang="ts">
import { buildSyncHandoff, syncGatewayUrl, type SyncHandoffGrant } from '~/utils/makerspaceSyncHandoff'
const props = defineProps<{ grant: SyncHandoffGrant }>()
const { t } = useI18n()
const config = useRuntimeConfig()
const browserOrigin = ref(''), notice = ref(''), copying = ref(false), manual = ref(false)
const manualInput = ref<HTMLTextAreaElement | null>(null)
onMounted(() => { browserOrigin.value = window.location.origin })
const endpoint = computed(() => {
  if (!browserOrigin.value) return ''
  try { return syncGatewayUrl(props.grant.id, browserOrigin.value, String(config.public.apiBaseUrl || '')) }
  catch { return '' }
})
const guide = computed(() => buildSyncHandoff(props.grant, endpoint.value, t))
async function copyGuide() {
  if (!endpoint.value || copying.value) return
  copying.value = true; notice.value = ''; manual.value = false
  try { await navigator.clipboard.writeText(guide.value.document); notice.value = t('makerspace.sync.handoff.copied') }
  catch { manual.value = true; notice.value = t('makerspace.sync.handoff.copyFailed'); await nextTick(); manualInput.value?.focus(); manualInput.value?.select() }
  finally { copying.value = false }
}
</script>
<template>
  <section class="sync-handoff">
    <header class="maker-header">
      <div><h3>{{ t('makerspace.sync.handoff.title') }}</h3><p>{{ t('makerspace.sync.handoff.intro') }}</p></div>
      <button type="button" class="maker-button" :disabled="!endpoint || copying" @click="copyGuide">{{ t('makerspace.sync.handoff.copy') }}</button>
    </header>
    <p v-if="grant.status !== 'approved'" class="maker-notice">{{ t('makerspace.sync.handoff.unapproved') }}</p>
    <p v-else-if="!grant.credential_issued" class="maker-notice">{{ t('makerspace.sync.handoff.noCredential') }}</p>
    <p v-if="notice" role="status" aria-live="polite">{{ notice }}</p>
    <label v-if="manual">{{ t('makerspace.sync.handoff.manualCopy') }}<textarea ref="manualInput" :value="guide.document" readonly rows="10" spellcheck="false" /></label>
    <p v-if="!endpoint" role="status">{{ t('makerspace.sync.handoff.endpointUnavailable') }}</p>
    <template v-else>
      <div class="sync-handoff-endpoint"><span>POST</span><code>{{ endpoint }}</code></div>
      <p>{{ t('makerspace.sync.handoff.authentication') }}</p>
      <details v-for="section in guide.sections" :key="section.key" :open="section.key === (grant.policy.direction === 'export' ? 'exportFirst' : 'importFirst')">
        <summary>{{ section.title }}</summary><p>{{ section.text }}</p><pre v-if="section.code" tabindex="0"><code>{{ section.code }}</code></pre>
      </details>
    </template>
  </section>
</template>
<style scoped lang="scss">
.sync-handoff { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-primary); min-width: 0; }
.sync-handoff .maker-header { gap: 16px; margin-bottom: 16px; }
.sync-handoff .maker-header > div { min-width: 0; }
.sync-handoff .maker-button { flex-shrink: 0; }
.sync-handoff p { max-width: 72ch; }
.sync-handoff-endpoint { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.sync-handoff-endpoint span { font-size: .8rem; font-weight: 700; color: var(--text-primary); }
.sync-handoff-endpoint code { min-width: 0; overflow-wrap: anywhere; }
.sync-handoff details { border-top: 1px solid var(--border-secondary); }
.sync-handoff pre { max-height: 360px; }
.sync-handoff textarea { font-family: monospace; }
</style>
