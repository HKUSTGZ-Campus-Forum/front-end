<template>
  <div class="post-card-grid">
    <div class="grid-header">
      <h2 class="grid-title">{{ t("homePage.popularPosts.title") }}</h2>
      <NuxtLink :to="localePath('/forum')" class="view-all">
        {{ t("homePage.popularPosts.viewAll") }}
      </NuxtLink>
    </div>

    <div v-if="loading" class="grid-loading">
      <div class="skeleton-card" v-for="i in 3" :key="i"></div>
    </div>

    <div v-else class="grid">
      <NuxtLink
        v-for="post in posts"
        :key="post.id"
        :to="localePath(`/forum/posts/${post.id}`)"
        class="post-card"
      >
        <div class="card-top">
          <div class="card-user">
            <div class="avatar-wrap">
              <img
                v-if="post.author_avatar"
                :src="post.author_avatar"
                :alt="post.author"
                class="avatar"
              />
              <div v-else class="avatar avatar-placeholder">
                {{ post.author?.charAt(0)?.toUpperCase() || '?' }}
              </div>
            </div>
            <span class="username">{{ post.author || t("common.unknownAuthor") }}</span>
          </div>
        </div>

        <h3 class="card-title">{{ post.title }}</h3>
        <p class="card-excerpt">{{ stripHtml(post.content) }}</p>

        <div class="card-footer">
          <span class="post-date">{{ formatPostDate(post.created_at) }}</span>
          <div class="post-stats">
            <span class="stat" :title="t('homePage.popularPosts.commentCountTitle')">
              <ForumUiIcon name="comment" class="stat-icon" />
              {{ post.comment_count ?? 0 }}
            </span>
            <span class="stat" :title="t('homePage.popularPosts.reactionCountTitle')">
              <ForumUiIcon name="celebrate" class="stat-icon" />
              {{ post.reaction_count ?? 0 }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const { formatDate } = useDateFormat();

defineProps<{
  posts: any[]
  loading?: boolean
}>()

function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').slice(0, 80)
}

function formatPostDate(iso: string): string {
  return formatDate(iso, {
    month: "numeric",
    day: "numeric",
  })
}
</script>

<style lang="scss" scoped>
.post-card-grid {
  width: 100%;
}

.grid-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.grid-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary, #1a2a4a);
  margin: 0;
}

.view-all {
  font-size: 0.85rem;
  color: var(--interactive-primary, #26a4ff);
  text-decoration: none;
  font-weight: 500;
  &:hover { text-decoration: underline; }
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 900px)  { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 580px)  { grid-template-columns: 1fr; }
}

.post-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-primary, #bfd7fb);
  border-radius: 12px;
  padding: 0.92rem 0.92rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  text-decoration: none;
  transition: box-shadow 0.2s, transform 0.15s;
  color: var(--text-primary, #1a2a4a);
  min-height: 126px;

  &:hover {
    box-shadow: 0 4px 16px rgba(38, 164, 255, 0.15);
    transform: translateY(-2px);
  }
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar-wrap { width: 24px; height: 24px; flex-shrink: 0; }

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;

  &.avatar-placeholder {
    background: var(--interactive-secondary, #bfd7fb);
    color: var(--interactive-primary, #26a4ff);
    font-size: 0.7rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.username {
  font-size: 0.8rem;
  color: var(--text-secondary, #4a6080);
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-excerpt {
  font-size: 0.8rem;
  color: var(--text-secondary, #4a6080);
  margin: 0;
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.4rem;
  border-top: 1px solid var(--border-secondary, #daeef9);
}

.post-date {
  font-size: 0.88rem;
  color: var(--text-muted, #b3b3b3);
}

.post-stats {
  display: flex;
  gap: 0.75rem;

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    font-size: 0.88rem;
    color: var(--text-muted, #b3b3b3);
  }

  .stat-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }
}

.grid-loading { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.skeleton-card {
  height: 140px;
  border-radius: 12px;
  background: linear-gradient(90deg, #e8f4fd 25%, #d7edf9 50%, #e8f4fd 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
