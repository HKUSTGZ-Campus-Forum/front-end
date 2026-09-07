<script setup lang="ts">
const props = defineProps<{ url: string; title: string; private?: boolean }>()
const { t } = useI18n()
const { fetchWithAuth } = useApi()
const src = ref('')
const failed = ref(false)
let objectUrl = ''
let sequence = 0
function release() { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = '' }
async function load() {
  const version = ++sequence
  release(); src.value = ''; failed.value = false
  if (!/^\/api\/makerspace\/[a-z][a-z0-9-]{2,39}\/cover\?v=\d+$/.test(props.url)) { failed.value = true; return }
  if (!props.private) { src.value = props.url; return }
  try {
    const response = await fetchWithAuth(props.url)
    if (!response.ok) throw new Error('cover_unavailable')
    const blob = await response.blob()
    if (version !== sequence) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || blob.size > 5 * 1024 * 1024) throw new Error('invalid_cover')
    objectUrl = URL.createObjectURL(blob); src.value = objectUrl
  } catch { if (version === sequence) failed.value = true }
}
onMounted(load)
watch(() => [props.url, props.private], load)
onBeforeUnmount(() => { sequence++; release() })
</script>
<template>
  <div class="maker-cover">
    <img v-if="src && !failed" :src="src" :alt="t('makerspace.cover.alt', { title })" loading="lazy" decoding="async" @error="failed = true" />
    <span v-else class="maker-cover__fallback"><Icon name="lucide:image" aria-hidden="true" />{{ t(failed ? 'makerspace.cover.unavailable' : 'makerspace.loading') }}</span>
  </div>
</template>
<style scoped>
.maker-cover { aspect-ratio: 16 / 9; background: var(--surface-secondary); border-radius: 12px; overflow: hidden; min-width: 0; }
img { display: block; width: 100%; height: 100%; object-fit: cover; }
.maker-cover__fallback { display: flex; height: 100%; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 16px; color: var(--text-secondary); font-size: .875rem; }
</style>
