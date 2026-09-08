<script setup lang="ts">
import { defaultProfileVisibility, type ProfileVisibility } from '~/types/profileVisibility'
const { t } = useI18n()
const { user, authInitialized } = useAuth()
const { fetchWithAuth } = useApi()
const { getLocalePath } = useAppLocale()
const keys = ['favorite_spaces', 'created_spaces', 'recent_posts'] as const
const draft = ref(defaultProfileVisibility())
const saved = ref<ProfileVisibility | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const success = ref(false)
const dirty = computed(() => saved.value && keys.some(key => draft.value[key] !== saved.value?.[key]))
let sequence = 0
function read(value: any): ProfileVisibility {
  if (!value || keys.some(key => typeof value[key] !== 'boolean')) throw new Error('invalid_response')
  return Object.fromEntries(keys.map(key => [key, value[key]])) as unknown as ProfileVisibility
}
async function load() {
  const current = ++sequence
  saved.value = null; loading.value = true; error.value = ''; success.value = false
  if (!authInitialized.value || !user.value?.id) return
  try {
    const response = await fetchWithAuth('/api/users/me/profile-visibility')
    if (!response.ok) throw new Error('load_failed')
    const result = read(await response.json())
    if (current !== sequence) return
    draft.value = { ...result }; saved.value = result
  } catch { if (current === sequence) error.value = t('profileVisibility.loadError') }
  finally { if (current === sequence) loading.value = false }
}
async function save() {
  if (!dirty.value || busy.value) return
  const current = sequence
  busy.value = true; error.value = ''; success.value = false
  try {
    const response = await fetchWithAuth('/api/users/me/profile-visibility', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft.value),
    })
    if (!response.ok) throw new Error('save_failed')
    const result = read(await response.json())
    if (current !== sequence) return
    draft.value = { ...result }; saved.value = result; success.value = true
  } catch { if (current === sequence) error.value = t('profileVisibility.saveError') }
  finally { busy.value = false }
}
onMounted(load)
watch([authInitialized, () => user.value?.id], load)
onBeforeUnmount(() => { sequence++ })
</script>

<template>
  <section class="profile-visibility" :aria-label="t('profileVisibility.title')">
    <header><h2>{{ t('profileVisibility.title') }}</h2><p>{{ t('profileVisibility.description') }}</p></header>
    <p v-if="loading" role="status">{{ t('profileVisibility.loading') }}</p>
    <div v-if="error" class="visibility-error" role="alert">{{ error }} <button v-if="!saved && !loading" type="button" @click="load">{{ t('profileVisibility.retry') }}</button></div>
    <form v-if="saved" @submit.prevent="save">
      <fieldset :disabled="busy">
        <legend class="sr-only">{{ t('profileVisibility.title') }}</legend>
        <label v-for="key in keys" :key="key" class="visibility-row" :for="`visibility-${key}`">
          <span><strong :id="`visibility-label-${key}`">{{ t(`profileVisibility.fields.${key}.label`) }}</strong><span :id="`visibility-hint-${key}`" class="visibility-hint">{{ t(`profileVisibility.fields.${key}.hint`) }}</span></span>
          <input :id="`visibility-${key}`" v-model="draft[key]" type="checkbox" role="switch" :aria-labelledby="`visibility-label-${key}`" :aria-describedby="`visibility-hint-${key}`" @change="success = false" />
        </label>
      </fieldset>
      <div class="visibility-actions"><button class="visibility-save" type="submit" :disabled="busy || !dirty">{{ t(busy ? 'profileVisibility.saving' : 'profileVisibility.save') }}</button><NuxtLink v-if="user?.id" :to="getLocalePath(`/users/${user.id}`)">{{ t('profileVisibility.viewProfile') }}</NuxtLink><span v-if="success" role="status">{{ t('profileVisibility.saved') }}</span></div>
    </form>
  </section>
</template>

<style scoped>
.profile-visibility { padding: 24px; border: 1px solid var(--border-primary); border-radius: 16px; background: var(--surface-primary); color: var(--text-primary); }
h2 { margin: 0 0 8px; font-size: 1.15rem; }
header p, .visibility-hint { color: var(--text-secondary); font-size: .9rem; line-height: 1.6; }
header p { margin: 0 0 16px; }
fieldset { padding: 0; margin: 0; border: 0; min-width: 0; }
.visibility-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 0; border-bottom: 1px solid var(--border-primary); cursor: pointer; }
.visibility-row > span { min-width: 0; }
.visibility-hint { display: block; margin-top: 4px; }
input[role=switch] { appearance: none; flex: 0 0 44px; width: 44px; height: 26px; margin: 0; border-radius: 999px; background: var(--text-secondary); border: 2px solid transparent; cursor: pointer; transition: background .15s; }
input[role=switch]::before { content: ''; display: block; width: 18px; height: 18px; margin: 2px; border-radius: 50%; background: white; transition: transform .15s; }
input[role=switch]:checked { background: var(--interactive-primary); }
input[role=switch]:checked::before { transform: translateX(18px); }
input:focus-visible, button:focus-visible, a:focus-visible { outline: 2px solid var(--interactive-primary); outline-offset: 4px; }
input:disabled, button:disabled { cursor: not-allowed; opacity: .6; }
.visibility-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 24px; font-size: .9rem; }
button { min-height: 44px; cursor: pointer; }
.visibility-save { border: 0; border-radius: 999px; padding: 10px 22px; background: var(--interactive-primary); color: var(--text-inverse); font-weight: 600; }
a { color: var(--interactive-primary); text-underline-offset: 3px; }
.visibility-error { color: var(--semantic-error); line-height: 1.6; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 480px) { .profile-visibility { padding: 20px 16px; } }
@media (prefers-reduced-motion: reduce) { input[role=switch], input[role=switch]::before { transition: none; } }
</style>
