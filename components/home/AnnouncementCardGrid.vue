<script setup lang="ts">
import type { Announcement } from '~/composables/useAnnouncements'

const props = withDefaults(defineProps<{
  announcements: Announcement[]
  loading?: boolean
  showAll?: boolean
}>(), { loading: false, showAll: false })

const { t, locale } = useI18n()
const { getLocalePath } = useAppLocale()
const { formatDate } = useDateFormat()
const visible = computed(() => props.showAll ? props.announcements : props.announcements.slice(0, 3))

function excerpt(content: string) {
  return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)
}
</script>

<template>
  <div class="announcements-grid">
    <div class="announcements-grid__header">
      <h2>{{ t('announcements.title') }}</h2>
      <NuxtLink v-if="!showAll" :to="getLocalePath('/announcements')" class="announcements-grid__all">
        {{ t('announcements.viewAll') }} <Icon name="lucide:arrow-right" aria-hidden="true" />
      </NuxtLink>
    </div>

    <div v-if="loading && !visible.length" class="announcements-grid__cards" aria-live="polite">
      <div v-for="i in 3" :key="i" class="announcement-card announcement-card--skeleton" />
    </div>
    <p v-else-if="!visible.length" class="announcements-grid__empty">{{ t('announcements.empty') }}</p>
    <div v-else class="announcements-grid__cards">
      <NuxtLink
        v-for="announcement in visible"
        :key="announcement.key"
        :to="getLocalePath(`/announcements/${announcement.key}`)"
        class="announcement-card"
      >
        <div class="announcement-card__top">
          <span class="announcement-card__type">{{ announcement.archived ? t('announcements.archive') : t('announcements.official') }}</span>
          <span class="announcement-card__date">{{ formatDate(announcement.created_at, { year: 'numeric', month: 'numeric', day: 'numeric' }) }}</span>
        </div>
        <h3>{{ locale === 'en' && announcement.title_en ? announcement.title_en : announcement.title }}</h3>
        <p>{{ locale === 'en' && announcement.summary_en ? announcement.summary_en : excerpt(announcement.content) }}</p>
        <div class="announcement-card__footer">
          <span>{{ announcement.author }}</span>
          <span>{{ t('announcements.readMore') }} <Icon name="lucide:arrow-right" aria-hidden="true" /></span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped lang="scss">
.announcements-grid__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.announcements-grid__header h2 { margin: 0; color: var(--text-primary); font-size: 1.15rem; font-weight: 700; }
.announcements-grid__all { display: inline-flex; align-items: center; gap: 5px; color: var(--interactive-primary); font-size: 0.85rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
.announcements-grid__all:hover { text-decoration: underline; }
.announcements-grid__cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.announcement-card { display: flex; flex-direction: column; min-width: 0; min-height: 250px; padding: 16px 16px 12px; border: 1px solid var(--border-primary); border-radius: 12px; background: var(--surface-primary); color: inherit; text-decoration: none; transition: border-color .18s ease, box-shadow .18s ease; }
.announcement-card:hover, .announcement-card:focus-visible { border-color: var(--interactive-primary); box-shadow: var(--shadow-small); }
.announcement-card:focus-visible { outline: 2px solid var(--interactive-primary); outline-offset: 2px; }
.announcement-card__top { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 13px; }
.announcement-card__type { color: var(--interactive-primary); font-size: .78rem; font-weight: 700; }
.announcement-card__date { color: var(--text-secondary); font-size: .78rem; }
.announcement-card h3 { color: var(--text-primary); font-size: 1rem; line-height: 1.45; font-weight: 700; margin: 0 0 9px; overflow-wrap: anywhere; }
.announcement-card p { color: var(--text-secondary); font-size: .88rem; line-height: 1.55; margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.announcement-card__footer { margin-top: auto; padding-top: 13px; border-top: 1px solid var(--border-primary); display: flex; justify-content: space-between; align-items: center; gap: 10px; color: var(--text-secondary); font-size: .78rem; }
.announcement-card__footer span:last-child { display: inline-flex; align-items: center; gap: 4px; color: var(--interactive-primary); font-weight: 600; white-space: nowrap; }
.announcements-grid__empty { margin: 0; color: var(--text-secondary); padding: 24px 0; }
.announcement-card--skeleton { min-height: 250px; background: var(--surface-secondary); border-color: var(--border-primary); animation: announcement-pulse 1.2s ease-in-out infinite alternate; }
@keyframes announcement-pulse { to { opacity: .55; } }
@media (max-width: 900px) { .announcements-grid__cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 580px) { .announcements-grid__cards { grid-template-columns: 1fr; } .announcement-card { min-height: 210px; } }
@media (prefers-reduced-motion: reduce) { .announcement-card, .announcement-card--skeleton { transition: none; animation: none; } }
</style>
