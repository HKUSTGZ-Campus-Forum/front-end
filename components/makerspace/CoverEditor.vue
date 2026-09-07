<script setup lang="ts">
import type { MakerSpace } from '~/types/makerspace'
const props = defineProps<{ space: MakerSpace }>()
const emit = defineEmits<{ updated: [url: string | null] }>()
const { t } = useI18n()
const { uploadFile, deleteFile } = useCustomFileUpload()
const { request, errorMessage, title } = useMakerSpace()
const busy = ref(false)
const progress = ref(0)
const error = ref('')
const saved = ref(false)
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value) return
  error.value = ''; saved.value = false
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) { error.value = t('makerspace.cover.invalid'); return }
  busy.value = true; progress.value = 0
  let pendingId: number | undefined
  try {
    const uploaded = await uploadFile({ file, fileType: 'maker_cover', entityType: 'makerspace', maxUploadBytes: 5 * 1024 * 1024, enableCompression: false, onProgress: value => { progress.value = value } })
    if (!uploaded?.id) throw new Error('invalid_cover')
    pendingId = uploaded.id
    const result = await request<{ cover_url: string }>(`/${props.space.slug}/cover`, 'PUT', { file_id: uploaded.id })
    pendingId = undefined; emit('updated', result.cover_url); saved.value = true
  } catch (cause) {
    error.value = errorMessage(cause)
    if (pendingId) await deleteFile(pendingId).catch(() => {})
  } finally { busy.value = false }
}
async function remove() {
  if (busy.value) return
  busy.value = true; error.value = ''; saved.value = false
  try { await request(`/${props.space.slug}/cover`, 'PUT', { file_id: null }); emit('updated', null); saved.value = true }
  catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
</script>
<template>
  <details class="maker-card maker-cover-editor">
    <summary>{{ t('makerspace.cover.edit') }}</summary>
    <p>{{ t('makerspace.cover.hint') }}</p>
    <div class="maker-cover-editor__body">
      <MakerspaceSpaceCover v-if="space.cover_url" :url="space.cover_url" :title="title(space)" :private="space.status !== 'published'" />
      <div><label>{{ t('makerspace.cover.select') }}<input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" @change="upload" /></label><div class="maker-actions"><button v-if="space.cover_url" type="button" class="maker-button" :disabled="busy" @click="remove">{{ t('makerspace.cover.remove') }}</button></div></div>
    </div>
    <p v-if="busy" role="status">{{ t('makerspace.cover.uploading', { progress: Math.round(progress) }) }}</p>
    <p v-if="error" role="alert">{{ error }}</p><p v-else-if="saved" role="status">{{ t('makerspace.cover.saved') }}</p>
  </details>
</template>
<style scoped>
.maker-cover-editor__body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 20px; align-items: start; }
.maker-cover-editor__body > div:only-child { grid-column: 1 / -1; }
input[type=file] { max-width: 100%; }
@media(max-width:640px) { .maker-cover-editor__body { grid-template-columns: minmax(0,1fr); } }
</style>
