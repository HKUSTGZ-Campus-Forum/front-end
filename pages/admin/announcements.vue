<script setup lang="ts">
import { ANNOUNCEMENT_TAG, type Announcement } from '~/composables/useAnnouncements'

definePageMeta({ middleware: 'admin', layout: 'admin' })

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { fetchWithAuth, getApiUrl } = useApi()
const { announcements, loading, error, load } = useAnnouncements()
const title = ref('')
const content = ref('')
const editingId = ref<number | null>(null)
const busy = ref(false)
const actionError = ref('')
const success = ref('')
const confirmingDelete = ref<number | null>(null)
const published = computed(() => announcements.value.filter(item => !item.archived))

useHead(() => ({ title: `${t('announcements.adminTitle')} - ${t('common.appName')}` }))
onMounted(load)

function edit(item: Announcement) {
  editingId.value = item.id
  title.value = item.title
  content.value = item.content
  actionError.value = ''
  success.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetForm() {
  editingId.value = null
  title.value = ''
  content.value = ''
  actionError.value = ''
}

async function save() {
  if (busy.value) return
  if (!title.value.trim() || !content.value.trim()) {
    actionError.value = t('announcements.required')
    return
  }
  busy.value = true
  actionError.value = ''
  success.value = ''
  try {
    const isEditing = editingId.value !== null
    const response = await fetchWithAuth(getApiUrl(isEditing ? `/api/posts/${editingId.value}` : '/api/posts'), {
      method: isEditing ? 'PUT' : 'POST',
      body: JSON.stringify({
        title: title.value.trim(),
        content: content.value.trim(),
        ...(!isEditing ? { tags: [ANNOUNCEMENT_TAG] } : {}),
      }),
    })
    if (!response.ok) throw new Error(`Save failed: ${response.status}`)
    resetForm()
    success.value = t(isEditing ? 'announcements.updated' : 'announcements.published')
    await load()
  } catch {
    actionError.value = t('announcements.saveError')
  } finally {
    busy.value = false
  }
}

async function remove(item: Announcement) {
  if (confirmingDelete.value !== item.id) {
    confirmingDelete.value = item.id
    return
  }
  busy.value = true
  actionError.value = ''
  success.value = ''
  try {
    const response = await fetchWithAuth(getApiUrl(`/api/posts/${item.id}`), { method: 'DELETE' })
    if (!response.ok) throw new Error(`Delete failed: ${response.status}`)
    if (editingId.value === item.id) resetForm()
    confirmingDelete.value = null
    success.value = t('announcements.deleted')
    await load()
  } catch {
    actionError.value = t('announcements.deleteError')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="announcement-admin">
    <header class="announcement-admin__head">
      <div>
        <h1>{{ t('announcements.adminTitle') }}</h1>
        <p>{{ t('announcements.adminDescription') }}</p>
      </div>
      <NuxtLink :to="getLocalePath('/announcements')">{{ t('announcements.viewPublic') }}</NuxtLink>
    </header>

    <form class="announcement-admin__panel" @submit.prevent="save">
      <h2>{{ editingId === null ? t('announcements.new') : t('announcements.edit') }}</h2>
      <label for="announcement-title">{{ t('announcements.titleLabel') }}</label>
      <input id="announcement-title" v-model="title" type="text" maxlength="255" required :disabled="busy" />
      <label for="announcement-content">{{ t('announcements.contentLabel') }}</label>
      <textarea id="announcement-content" v-model="content" rows="9" required :disabled="busy" />
      <p class="announcement-admin__hint">{{ t('announcements.markdownHint') }}</p>
      <p v-if="actionError" class="announcement-admin__error" role="alert">{{ actionError }}</p>
      <p v-if="success" class="announcement-admin__success" role="status">{{ success }}</p>
      <div class="announcement-admin__actions">
        <button type="submit" :disabled="busy">{{ busy ? t('actions.saving') : editingId === null ? t('announcements.publish') : t('actions.save') }}</button>
        <button v-if="editingId !== null" type="button" class="secondary" :disabled="busy" @click="resetForm">{{ t('actions.cancel') }}</button>
      </div>
    </form>

    <section class="announcement-admin__panel" :aria-label="t('announcements.publishedList')">
      <h2>{{ t('announcements.publishedList') }}</h2>
      <p v-if="loading && !published.length" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="error" role="alert">{{ t('announcements.loadError') }}</p>
      <p v-else-if="!published.length">{{ t('announcements.noPublished') }}</p>
      <ul v-else class="announcement-admin__list">
        <li v-for="item in published" :key="item.key">
          <div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.author }}</span>
          </div>
          <div class="announcement-admin__row-actions">
            <button type="button" class="secondary" :disabled="busy" @click="edit(item)">{{ t('announcements.edit') }}</button>
            <button type="button" class="danger" :disabled="busy" @click="remove(item)">
              {{ confirmingDelete === item.id ? t('announcements.confirmDelete') : t('announcements.delete') }}
            </button>
            <button v-if="confirmingDelete === item.id" type="button" class="secondary" :disabled="busy" @click="confirmingDelete = null">{{ t('actions.cancel') }}</button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.announcement-admin { display: grid; gap: 20px; max-width: 1000px; margin: 0 auto; }
.announcement-admin__head { display: flex; justify-content: space-between; align-items: start; gap: 20px; }
.announcement-admin__head h1 { margin: 0; color: var(--text-primary); font-size: 1.5rem; }
.announcement-admin__head p { color: var(--text-secondary); margin: 7px 0 0; line-height: 1.5; }
.announcement-admin__head a { color: var(--interactive-primary); white-space: nowrap; }
.announcement-admin__panel { display: grid; gap: 10px; padding: 24px; border: 1px solid var(--border-primary); border-radius: 18px; background: var(--surface-primary); }
.announcement-admin__panel h2 { margin: 0 0 6px; color: var(--text-primary); font-size: 1.1rem; }
.announcement-admin__panel label { color: var(--text-primary); font-weight: 700; font-size: .9rem; }
.announcement-admin__panel input, .announcement-admin__panel textarea { width: 100%; padding: 11px 12px; border: 1px solid var(--border-primary); border-radius: 10px; background: var(--surface-primary); color: var(--text-primary); font: inherit; }
.announcement-admin__panel input:focus-visible, .announcement-admin__panel textarea:focus-visible { outline: 2px solid var(--interactive-primary); outline-offset: 1px; }
.announcement-admin__hint { margin: 0; color: var(--text-secondary); font-size: .82rem; }
.announcement-admin__error { color: var(--semantic-error); margin: 0; }
.announcement-admin__success { color: var(--semantic-success); margin: 0; }
.announcement-admin__actions, .announcement-admin__row-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.announcement-admin button { min-height: 38px; border: 0; border-radius: 9px; padding: 0 14px; background: var(--interactive-primary); color: var(--surface-primary); font: inherit; font-weight: 700; cursor: pointer; }
.announcement-admin button.secondary { background: var(--surface-secondary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.announcement-admin button.danger { background: var(--semantic-error); }
.announcement-admin button:disabled { opacity: .6; cursor: wait; }
.announcement-admin__list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.announcement-admin__list li { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 13px 0; border-top: 1px solid var(--border-primary); }
.announcement-admin__list li > div:first-child { display: grid; min-width: 0; gap: 3px; }
.announcement-admin__list strong { color: var(--text-primary); overflow-wrap: anywhere; }
.announcement-admin__list span { color: var(--text-secondary); font-size: .8rem; }
@media (max-width: 680px) { .announcement-admin__head, .announcement-admin__list li { flex-direction: column; align-items: stretch; } .announcement-admin__panel { padding: 18px; } }
</style>
