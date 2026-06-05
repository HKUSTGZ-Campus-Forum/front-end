<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useI18n, useLocalePath } from "#imports";
import { formatDate } from "~/utils/dateFormat";
import { useApi } from "~/composables/useApi";
import UserAvatar from "~/components/user/UserAvatar.vue";

const { t } = useI18n();
const localePath = useLocalePath();
const { fetchWithAuth } = useApi();

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
  { value: "oldest", label: t("forum.list.sort.oldest") },
]);

const sortMapping = {
  latest: { sort_by: "created_at", sort_order: "desc" },
  oldest: { sort_by: "created_at", sort_order: "asc" },
  hot: { sort_by: "reaction_count", sort_order: "desc" },
};

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
    const response = await fetchWithAuth(
      "/api/posts?" +
        new URLSearchParams({
          page: currentPage.value.toString(),
          limit: "20",
          sort_by,
          sort_order,
          tags: "club",
        })
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || t("community.activity.errors.loadFailed"));
    }

    const data = await response.json();
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
    console.error("Failed to load activity posts:", error);
    loadMoreError.value = error.message || t("community.activity.errors.retryable");
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
  <div class="community-activity-pane">
    <div class="community-activity-pane__sort-bar">
      <button
        v-for="opt in sortOptions"
        :key="opt.value"
        type="button"
        :class="['community-activity-pane__sort-btn', { active: sortBy === opt.value }]"
        @click="handleSortChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="community-activity-pane__post-list">
      <NuxtLink
        v-for="post in posts"
        :key="post.id"
        :to="localePath(`/forum/posts/${post.id}`)"
        class="community-activity-pane__post-card"
      >
        <div class="community-activity-pane__post-body">
          <div class="community-activity-pane__badge">
            {{ t("community.activity.badge") }}
          </div>
          <h2 class="community-activity-pane__post-title">{{ post.title }}</h2>
          <p class="community-activity-pane__post-excerpt">
            {{ post.content?.slice(0, 120) }}{{ post.content?.length > 120 ? "..." : "" }}
          </p>
        </div>

        <div class="community-activity-pane__post-footer">
          <div class="community-activity-pane__post-author">
            <UserAvatar
              :avatar-url="post.author_avatar"
              :username="post.author"
              :user-id="post.user_id || post.author_id"
              size="sm"
              class="community-activity-pane__post-avatar"
            />
            <span class="community-activity-pane__post-author-name">{{ post.author }}</span>
          </div>

          <div class="community-activity-pane__post-stats">
            <span class="community-activity-pane__stat">
              <ForumUiIcon name="comment" class="community-activity-pane__stat-icon" />
              {{ post.comments }}
            </span>
            <span class="community-activity-pane__stat">
              <ForumUiIcon name="eye" class="community-activity-pane__stat-icon" />
              {{ post.view_count }}
            </span>
            <span class="community-activity-pane__stat community-activity-pane__stat--time">
              {{ formatDate(post.publishDate) }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-if="isLoadingMore && posts.length === 0" class="community-activity-pane__loading">
      <div class="community-activity-pane__spinner"></div>
      <span>{{ t("forum.list.loading") }}</span>
    </div>

    <div v-if="loadMoreError" class="community-activity-pane__error">
      <p>{{ loadMoreError }}</p>
      <button class="community-activity-pane__ghost-btn" type="button" @click="fetchPosts(true)">
        {{ t("common.retry") }}
      </button>
    </div>

    <div
      v-else-if="!isLoadingMore && posts.length === 0"
      class="community-activity-pane__empty"
    >
      <p>{{ t("community.activity.empty") }}</p>
    </div>

    <div ref="loadingTrigger" class="community-activity-pane__load-trigger">
      <div
        v-if="isLoadingMore && posts.length > 0"
        class="community-activity-pane__loading community-activity-pane__loading--inline"
      >
        <div class="community-activity-pane__spinner community-activity-pane__spinner--sm"></div>
        <span>{{ t("forum.list.loadMore") }}</span>
      </div>

      <div
        v-else-if="hasReachedEnd && posts.length > 0"
        class="community-activity-pane__end-label"
      >
        {{ t("forum.list.endReached") }}
      </div>
    </div>

    <div v-if="showPagination && totalPages > 1" class="community-activity-pane__pagination">
      <button
        class="community-activity-pane__page-btn"
        type="button"
        :disabled="currentPage <= 1"
        @click="prevPage"
      >
        {{ t("forum.list.pagination.prev") }}
      </button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button
        class="community-activity-pane__page-btn"
        type="button"
        :disabled="currentPage >= totalPages"
        @click="nextPage"
      >
        {{ t("forum.list.pagination.next") }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.community-activity-pane__sort-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.community-activity-pane__sort-btn {
  padding: 6px 18px;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  background: #ffffff;
  color: #4a6080;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #26a4ff;
    color: #26a4ff;
  }

  &.active {
    background: #26a4ff;
    border-color: #26a4ff;
    color: #fff;
    font-weight: 600;
  }
}

.community-activity-pane__post-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.community-activity-pane__post-card {
  display: block;
  background: #ffffff;
  border: 2px solid #c8dff8;
  border-radius: 24px;
  padding: 28px 36px 24px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow: 0 8px 24px rgba(40, 57, 101, 0.08);

  &:hover {
    transform: translateY(-2px);
    border-color: #26a4ff;
    box-shadow: 0 14px 30px rgba(40, 57, 101, 0.12);
  }
}

.community-activity-pane__post-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.community-activity-pane__badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1.5px solid #9eaaf4;
  background: rgba(158, 170, 244, 0.14);
  color: #5261b3;
  font-size: 0.82rem;
  font-weight: 600;
}

.community-activity-pane__post-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1a2a4a;
}

.community-activity-pane__post-excerpt {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  color: #5f7698;
}

.community-activity-pane__post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid #e1eefc;
}

.community-activity-pane__post-author {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.community-activity-pane__post-author-name {
  font-size: 0.95rem;
  color: #3f5476;
  font-weight: 600;
}

.community-activity-pane__post-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  color: #7c96bb;
}

.community-activity-pane__stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
}

.community-activity-pane__stat-icon {
  width: 18px;
  height: 18px;
}

.community-activity-pane__stat--time {
  white-space: nowrap;
}

.community-activity-pane__loading,
.community-activity-pane__error,
.community-activity-pane__empty {
  margin-top: 24px;
  background: #ffffff;
  border: 2px solid #d9e9fb;
  border-radius: 24px;
  padding: 28px 32px;
  color: #4d6385;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.community-activity-pane__loading--inline {
  margin-top: 0;
  border: none;
  background: transparent;
  padding: 16px 0 0;
}

.community-activity-pane__spinner {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 3px solid rgba(38, 164, 255, 0.18);
  border-top-color: #26a4ff;
  animation: community-activity-pane-spin 0.8s linear infinite;
}

.community-activity-pane__spinner--sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.community-activity-pane__ghost-btn,
.community-activity-pane__page-btn {
  border: 1.5px solid #c8dff8;
  border-radius: 999px;
  background: #ffffff;
  color: #3f5476;
  font-size: 0.92rem;
  padding: 10px 18px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #26a4ff;
    color: #26a4ff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.community-activity-pane__load-trigger {
  min-height: 36px;
}

.community-activity-pane__end-label {
  padding-top: 16px;
  text-align: center;
  color: #7c96bb;
  font-size: 0.92rem;
}

.community-activity-pane__pagination {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #4d6385;
}

@keyframes community-activity-pane-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .community-activity-pane__sort-btn {
    padding: 10px 22px;
  }

  .community-activity-pane__post-card {
    padding: 22px 20px 18px;
    border-radius: 20px;
  }

  .community-activity-pane__post-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-activity-pane__post-stats {
    gap: 14px;
  }
}
</style>
