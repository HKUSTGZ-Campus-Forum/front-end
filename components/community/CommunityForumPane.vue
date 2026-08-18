<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useI18n, useLocalePath } from "#imports";
import { formatDate } from "~/utils/dateFormat";
import { useApi } from "~/composables/useApi";
import UserAvatar from "~/components/user/UserAvatar.vue";
import { getVisiblePostTags } from "~/utils/courseOffering";

const { t } = useI18n();
const localePath = useLocalePath();

const posts = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const sortBy = ref("latest");
const isLoadingMore = ref(false);
const loadMoreError = ref("");
const hasReachedEnd = ref(false);
const observer = ref(null);
const loadingTrigger = ref(null);

const showPagination = computed(() => {
  return typeof IntersectionObserver === "undefined" || hasReachedEnd.value;
});

const sortOptions = computed(() => [
  { value: "latest", label: t("forum.list.sort.latest") },
  { value: "hot", label: t("forum.list.sort.hot") },
]);

const sortMapping = {
  latest: { sort_by: "created_at", sort_order: "desc" },
  hot: { sort_by: "reaction_count", sort_order: "desc" },
};

function getTagKey(tag, index) {
  if (tag && typeof tag === "object") {
    return tag.id || tag.tag_id || tag.name || tag.tag_name || index;
  }
  return tag || index;
}

function getDisplayTags(tags) {
  return getVisiblePostTags(tags).slice(0, 3);
}

function getTagLabel(tag) {
  if (tag && typeof tag === "object") {
    return tag.name || tag.tag_name || "";
  }
  return String(tag || "");
}

function handleSortChange(value) {
  sortBy.value = value;
  currentPage.value = 1;
  posts.value = [];
  hasReachedEnd.value = false;
  loadMoreError.value = "";
  fetchPosts(true);
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchPosts(true);
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchPosts(true);
  }
}

async function fetchPosts(reset = false) {
  if (isLoadingMore.value) return;

  try {
    isLoadingMore.value = true;
    loadMoreError.value = "";

    const { sort_by, sort_order } = sortMapping[sortBy.value] || sortMapping.latest;
    const { getApiUrl } = useApi();
    const response = await fetch(
      getApiUrl("/api/posts?") +
        new URLSearchParams({
          page: currentPage.value.toString(),
          limit: "20",
          sort_by,
          sort_order,
        })
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || t("forum.list.errors.loadFailed"));
    }

    const newPosts = data.posts.map((post) => ({
      ...post,
      author_id: post.user_id,
      author: post.author || t("common.unknownAuthor"),
      author_avatar: post.author_avatar,
      comments: post.comment_count || 0,
      view_count: post.view_count || 0,
      views: post.view_count || 0,
      publishDate: post.created_at,
    }));

    if (reset) {
      posts.value = newPosts;
    } else {
      posts.value = [...posts.value, ...newPosts];
    }

    totalPages.value = data.total_pages;
    hasReachedEnd.value = currentPage.value >= totalPages.value;
  } catch (error) {
    console.error("Failed to load forum posts:", error);
    loadMoreError.value = error.message || t("forum.list.errors.retryable");
  } finally {
    isLoadingMore.value = false;
  }
}

async function loadMorePosts() {
  if (hasReachedEnd.value || isLoadingMore.value) return;
  currentPage.value++;
  await fetchPosts();
}

function setupIntersectionObserver() {
  if (typeof IntersectionObserver === "undefined") return;

  observer.value = new IntersectionObserver(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoadingMore.value && !hasReachedEnd.value) {
        loadMorePosts();
      }
    },
    { rootMargin: "100px", threshold: 0.1 }
  );

  if (loadingTrigger.value) {
    observer.value.observe(loadingTrigger.value);
  }
}

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect();
  }
});

onMounted(() => {
  fetchPosts(true);
  setupIntersectionObserver();
});
</script>

<template>
  <div class="community-forum-pane">
    <div class="community-forum-pane__sort-bar">
      <button
        v-for="opt in sortOptions"
        :key="opt.value"
        type="button"
        :class="['community-forum-pane__sort-btn', { active: sortBy === opt.value }]"
        @click="handleSortChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="community-forum-pane__post-list">
      <NuxtLink
        v-for="post in posts"
        :key="post.id"
        :to="localePath(`/forum/posts/${post.id}`)"
        class="community-forum-pane__post-card"
      >
        <div class="community-forum-pane__post-body">
          <h2 class="community-forum-pane__post-title">{{ post.title }}</h2>
          <p class="community-forum-pane__post-excerpt">
            {{ post.content?.slice(0, 100) }}{{ post.content?.length > 100 ? "..." : "" }}
          </p>
          <div
            v-if="getDisplayTags(post.tags).length"
            class="community-forum-pane__post-tags"
          >
            <span
              v-for="(tag, index) in getDisplayTags(post.tags)"
              :key="getTagKey(tag, index)"
              class="community-forum-pane__tag"
            >
              {{ getTagLabel(tag) }}
            </span>
          </div>
        </div>

        <div class="community-forum-pane__post-footer">
          <div class="community-forum-pane__post-author">
            <UserAvatar
              :avatar-url="post.author_avatar"
              :username="post.author"
              :user-id="post.user_id || post.author_id"
              size="sm"
              class="community-forum-pane__post-avatar"
            />
            <span class="community-forum-pane__post-author-name">{{ post.author }}</span>
          </div>

          <div class="community-forum-pane__post-stats">
            <span class="community-forum-pane__stat">
              <ForumUiIcon name="comment" class="community-forum-pane__stat-icon" />
              {{ post.comments }}
            </span>
            <span class="community-forum-pane__stat">
              <ForumUiIcon name="eye" class="community-forum-pane__stat-icon" />
              {{ post.view_count }}
            </span>
            <span class="community-forum-pane__stat community-forum-pane__stat--time">
              {{ formatDate(post.publishDate) }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-if="isLoadingMore && posts.length === 0" class="community-forum-pane__loading">
      <div class="community-forum-pane__spinner"></div>
      <span>{{ t("forum.list.loading") }}</span>
    </div>

    <div v-if="loadMoreError" class="community-forum-pane__error">
      <p>{{ loadMoreError }}</p>
      <button class="community-forum-pane__ghost-btn" type="button" @click="fetchPosts(true)">
        {{ t("common.retry") }}
      </button>
    </div>

    <div
      v-else-if="!isLoadingMore && posts.length === 0"
      class="community-forum-pane__empty"
    >
      <p>{{ t("forum.list.empty") }}</p>
    </div>

    <div ref="loadingTrigger" class="community-forum-pane__load-trigger">
      <div
        v-if="isLoadingMore && posts.length > 0"
        class="community-forum-pane__loading community-forum-pane__loading--inline"
      >
        <div class="community-forum-pane__spinner community-forum-pane__spinner--sm"></div>
        <span>{{ t("forum.list.loadMore") }}</span>
      </div>
      <div
        v-if="hasReachedEnd && posts.length > 0"
        class="community-forum-pane__end-label"
      >
        {{ t("forum.list.endReached") }}
      </div>
    </div>

    <div v-if="showPagination && totalPages > 1" class="community-forum-pane__pagination">
      <button
        class="community-forum-pane__page-btn"
        type="button"
        :disabled="currentPage <= 1"
        @click="prevPage"
      >
        {{ t("searchPage.pagination.previous") }}
      </button>
      <span class="community-forum-pane__page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button
        class="community-forum-pane__page-btn"
        type="button"
        :disabled="currentPage >= totalPages"
        @click="nextPage"
      >
        {{ t("searchPage.pagination.next") }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.community-forum-pane__sort-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.community-forum-pane__sort-btn {
  padding: 6px 18px;
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  background: var(--surface-primary);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--border-focus);
    color: var(--interactive-primary);
  }

  &.active {
    background: var(--btn-primary-bg);
    border-color: var(--interactive-primary);
    color: var(--text-inverse);
    font-weight: 600;
  }
}

.community-forum-pane__post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.community-forum-pane__post-card {
  display: block;
  background: var(--card-bg);
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  padding: 20px 24px 16px;
  text-decoration: none;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
  box-shadow: var(--card-shadow);

  &:hover {
    box-shadow: var(--shadow-medium);
    border-color: var(--border-focus);
    transform: translateY(-1px);
  }
}

.community-forum-pane__post-title {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.community-forum-pane__post-excerpt {
  margin: 0 0 10px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.community-forum-pane__post-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.community-forum-pane__tag {
  padding: 2px 10px;
  background: color-mix(in srgb, var(--interactive-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 30%, transparent);
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--interactive-primary);
}

.community-forum-pane__post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid var(--border-secondary);
}

.community-forum-pane__post-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.community-forum-pane__post-avatar {
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-small);
}

.community-forum-pane__post-author-name {
  color: var(--text-secondary);
  font-size: 0.825rem;
  font-weight: 500;
}

.community-forum-pane__post-stats {
  display: flex;
  align-items: center;
  gap: 14px;
}

.community-forum-pane__stat {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;

  &--time {
    color: var(--text-muted);
  }
}

.community-forum-pane__stat-icon {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

.community-forum-pane__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--text-secondary);

  &--inline {
    padding: 20px;
  }
}

.community-forum-pane__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;

  &--sm {
    width: 18px;
    height: 18px;
    border-width: 2px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.community-forum-pane__error,
.community-forum-pane__empty {
  text-align: center;
  padding: 32px;
}

.community-forum-pane__error {
  color: var(--semantic-error);

  p {
    margin: 0 0 12px;
  }
}

.community-forum-pane__empty {
  color: var(--text-secondary);
}

.community-forum-pane__ghost-btn {
  padding: 7px 20px;
  border: 1.5px solid var(--border-primary);
  border-radius: 14px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;

  &:hover {
    background: var(--bg-secondary);
  }
}

.community-forum-pane__load-trigger {
  min-height: 20px;
  margin-top: 16px;
}

.community-forum-pane__end-label {
  padding: 16px;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}

.community-forum-pane__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 0 0;
}

.community-forum-pane__page-btn {
  padding: 7px 20px;
  border: 1.5px solid var(--border-primary);
  border-radius: 14px;
  background: var(--surface-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--border-focus);
    color: var(--interactive-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.community-forum-pane__page-info {
  min-width: 60px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-align: center;
}
</style>
