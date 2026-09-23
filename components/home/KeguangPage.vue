<script setup lang="ts">
import { computed, onMounted } from 'vue'
import CarouselBanner from '~/components/home/CarouselBanner.vue'
import AnnouncementCardGrid from '~/components/home/AnnouncementCardGrid.vue'

const { t } = useI18n()
const { announcements, loading, load } = useAnnouncements()
const relatedLinks = computed(() => [
  { key: 'sisNew', label: t('homePage.relatedLinks.sisNew'), href: 'http://sisn.hkust-gz.edu.cn' },
  { key: 'portal', label: t('homePage.relatedLinks.portal'), href: 'https://myportal.hkust-gz.edu.cn' },
  { key: 'canvas', label: t('homePage.relatedLinks.canvas'), href: 'https://hkust-gz.instructure.com' },
])

onMounted(load)
</script>

<template>
  <div class="kg-home">
    <div class="kg-card kg-top-card">
      <div class="kg-banner-row">
        <div class="kg-carousel-wrap">
          <CarouselBanner />
        </div>
        <div class="kg-links-panel">
          <p class="kg-links-title">{{ t('homePage.relatedLinks.title') }}</p>
          <a
            v-for="link in relatedLinks"
            :key="link.key"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            class="kg-link-btn"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>

    <section class="kg-card kg-posts-card">
      <AnnouncementCardGrid :announcements="announcements" :loading="loading" />
    </section>
  </div>
</template>

<style lang="scss" scoped>
.kg-home {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 24px 55px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.kg-card {
  background: var(--surface-primary);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

.kg-top-card {
  padding: 20px;
}

.kg-banner-row {
  display: grid;
  grid-template-columns: 1fr 196px;
  gap: 16px;
  align-items: stretch;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
}

.kg-carousel-wrap {
  min-width: 0;
  border-radius: 12px;
  overflow: hidden;

  :deep(.carousel-banner) {
    border-radius: 12px;
  }
}

.kg-links-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.kg-links-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-secondary);
}

.kg-link-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--surface-primary);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-focus);
    color: var(--interactive-active);
  }
}

.kg-posts-card {
  padding: 20px 20px 16px;
}

</style>
