<script setup lang="ts">
import { archivedAnnouncements, isAnnouncementPost, type Announcement } from '~/composables/useAnnouncements'

definePageMeta({ layout: 'keguang' })

const route = useRoute()
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { fetchPublic, getApiUrl } = useApi()
const { formatDate } = useDateFormat()
const key = computed(() => String(route.params.key || ''))
const announcement = ref<Announcement | null>(archivedAnnouncements.find(item => item.key === key.value) || null)
const loading = ref(false)
const failed = ref(false)

useHead(() => ({ title: `${announcement.value?.title || t('announcements.title')} - ${t('common.appName')}` }))

async function load() {
  if (announcement.value) return
  if (!/^post-\d+$/.test(key.value)) {
    failed.value = true
    return
  }
  loading.value = true
  failed.value = false
  try {
    const id = Number(key.value.slice(5))
    const response = await fetchPublic(getApiUrl(`/api/posts/${id}`))
    if (!response.ok) throw new Error('Post unavailable')
    const post = await response.json()
    if (!isAnnouncementPost(post)) throw new Error('Not an announcement')
    announcement.value = {
      key: key.value, id: post.id, title: post.title, content: post.content,
      author: post.author, created_at: post.created_at, archived: false,
    }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(key, () => {
  announcement.value = archivedAnnouncements.find(item => item.key === key.value) || null
  failed.value = false
  load()
})
</script>

<template>
  <div class="announcement-detail">
    <NuxtLink :to="getLocalePath('/announcements')" class="announcement-detail__back">
      <Icon name="lucide:arrow-left" aria-hidden="true" /> {{ t('announcements.backToList') }}
    </NuxtLink>
    <article v-if="announcement" class="announcement-detail__card">
      <div class="announcement-detail__meta">
        <span>{{ announcement.archived ? t('announcements.archive') : t('announcements.official') }}</span>
        <time :datetime="announcement.created_at">{{ formatDate(announcement.created_at, { year: 'numeric', month: 'long', day: 'numeric' }) }}</time>
      </div>
      <h1>{{ announcement.title }}</h1>
      <p class="announcement-detail__author">{{ announcement.author }}</p>
      <p v-if="announcement.archived" class="announcement-detail__archive-note">{{ t('announcements.archiveNote') }}</p>
      <CommonMarkdownContent :content="announcement.content" />
    </article>
    <div v-else-if="loading" class="announcement-detail__card" role="status">{{ t('common.loading') }}</div>
    <div v-else class="announcement-detail__card" role="alert">
      <p>{{ failed ? t('announcements.loadError') : t('announcements.notFound') }}</p>
      <button type="button" @click="load">{{ t('common.retry') }}</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.announcement-detail { max-width: 960px; margin: 0 auto; padding: 28px 24px 60px; }
.announcement-detail__back { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 18px; color: var(--interactive-primary); font-weight: 650; text-decoration: none; }
.announcement-detail__card { background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 20px; padding: 30px; box-shadow: var(--shadow-small); overflow-wrap: anywhere; }
.announcement-detail__meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--text-secondary); font-size: .84rem; }
.announcement-detail__meta span { color: var(--interactive-primary); font-weight: 700; }
.announcement-detail h1 { margin: 15px 0 8px; color: var(--text-primary); font-size: 1.7rem; line-height: 1.35; }
.announcement-detail__author { margin: 0 0 24px; color: var(--text-secondary); }
.announcement-detail__archive-note { color: var(--text-secondary); background: var(--surface-secondary); border-radius: 10px; padding: 10px 12px; margin: 0 0 24px; font-size: .86rem; }
.announcement-detail button { border: 0; background: var(--interactive-primary); color: var(--surface-primary); padding: 8px 16px; border-radius: 8px; cursor: pointer; }
@media (max-width: 680px) { .announcement-detail { padding: 18px 14px 40px; } .announcement-detail__card { padding: 20px; } .announcement-detail h1 { font-size: 1.35rem; } }
</style>
