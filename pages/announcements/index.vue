<script setup lang="ts">
import AnnouncementCardGrid from '~/components/home/AnnouncementCardGrid.vue'

definePageMeta({ layout: 'keguang' })
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { user } = useAuth()
const { announcements, loading, error, load } = useAnnouncements()

useHead(() => ({ title: `${t('announcements.title')} - ${t('common.appName')}` }))
onMounted(load)
</script>

<template>
  <div class="announcement-page">
    <div class="announcement-page__heading">
      <div>
        <h1>{{ t('announcements.title') }}</h1>
        <p>{{ t('announcements.description') }}</p>
      </div>
      <NuxtLink v-if="user?.role_name === 'admin'" :to="getLocalePath('/admin/announcements')" class="announcement-page__admin">
        {{ t('announcements.manage') }}
      </NuxtLink>
    </div>
    <p v-if="error" class="announcement-page__notice" role="status">{{ t('announcements.archiveOnly') }}</p>
    <section class="announcement-page__card">
      <AnnouncementCardGrid :announcements="announcements" :loading="loading" show-all />
    </section>
  </div>
</template>

<style scoped lang="scss">
.announcement-page { max-width: 1340px; margin: 0 auto; padding: 28px 24px 60px; }
.announcement-page__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.announcement-page__heading h1 { margin: 0; color: var(--text-primary); font-size: 1.55rem; }
.announcement-page__heading p { margin: 8px 0 0; color: var(--text-secondary); line-height: 1.6; }
.announcement-page__admin { flex: none; display: inline-flex; align-items: center; min-height: 38px; border-radius: 999px; padding: 0 16px; background: var(--interactive-primary); color: var(--surface-primary); text-decoration: none; font-weight: 700; }
.announcement-page__card { border-radius: 20px; background: var(--surface-primary); padding: 24px; box-shadow: var(--shadow-small); }
.announcement-page__notice { color: var(--semantic-warning); margin: 0 0 14px; }
@media (max-width: 680px) { .announcement-page { padding: 18px 14px 40px; } .announcement-page__heading { flex-direction: column; } .announcement-page__card { padding: 18px; } }
</style>
