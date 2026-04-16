<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { formatDate } from "~/utils/dateFormat";
import { useApi } from "~/composables/useApi";
import UserAvatar from "~/components/user/UserAvatar.vue";

definePageMeta({ layout: 'keguang' });

const posts = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const sortBy = ref("latest");
const sortOrder = ref("desc");
const errorMessage = ref("");
const isLoadingMore = ref(false);
const loadMoreError = ref("");
const hasReachedEnd = ref(false);
const observer = ref(null);
const loadingTrigger = ref(null);

const showPagination = computed(() => {
  return typeof IntersectionObserver === 'undefined' || hasReachedEnd.value;
});

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
    if (!response.ok) throw new Error(data.error || "获取文章列表失败");
    const newPosts = data.posts.map((post) => ({
      ...post,
      author_id: post.user_id,
      author: post.author || "匿名用户",
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
    console.error("获取文章列表失败:", error);
    loadMoreError.value = error.message || "获取文章列表失败，请稍后重试";
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
  if (typeof IntersectionObserver === 'undefined') return;
  observer.value = new IntersectionObserver(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoadingMore.value && !hasReachedEnd.value) {
        loadMorePosts();
      }
    },
    { rootMargin: '100px', threshold: 0.1 }
  );
  if (loadingTrigger.value) observer.value.observe(loadingTrigger.value);
}

onUnmounted(() => {
  if (observer.value) observer.value.disconnect();
});

onMounted(() => {
  fetchPosts(true);
  setupIntersectionObserver();
});
</script>

<template>
  <div class="kg-forum">
    <div class="kg-forum-header">
      <h1 class="kg-forum-title">论坛</h1>
      <NuxtLink to="/forum/postMessage" class="kg-btn-primary">
        <span>+</span> 发帖
      </NuxtLink>
    </div>

    <div class="kg-sort-bar">
      <button
        v-for="opt in [
          { value: 'latest', label: '最新' },
          { value: 'hot', label: '最热' },
          { value: 'oldest', label: '最早' },
        ]"
        :key="opt.value"
        :class="['kg-sort-btn', { active: sortBy === opt.value }]"
        @click="handleSortChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="kg-post-list">
      <NuxtLink
        v-for="post in posts"
        :key="post.id"
        :to="`/forum/posts/${post.id}`"
        class="kg-post-card"
      >
        <div class="kg-post-card__body">
          <h2 class="kg-post-card__title">{{ post.title }}</h2>
          <p class="kg-post-card__excerpt">{{ post.content?.slice(0, 100) }}{{ post.content?.length > 100 ? '...' : '' }}</p>
          <div class="kg-post-card__tags" v-if="post.tags?.length">
            <span v-for="tag in post.tags.slice(0, 3)" :key="tag.id || tag.name" class="kg-tag">
              {{ tag.name || tag }}
            </span>
          </div>
        </div>
        <div class="kg-post-card__footer">
          <div class="kg-post-card__author">
            <UserAvatar
              :avatar-url="post.author_avatar"
              :username="post.author"
              :user-id="post.user_id || post.author_id"
              size="sm"
              class="kg-post-card__avatar"
            />
            <span class="kg-post-card__author-name">{{ post.author }}</span>
          </div>
          <div class="kg-post-card__stats">
            <span class="kg-stat">
              <ForumUiIcon name="comment" class="kg-stat-icon" />
              {{ post.comments }}
            </span>
            <span class="kg-stat">
              <ForumUiIcon name="eye" class="kg-stat-icon" />
              {{ post.view_count }}
            </span>
            <span class="kg-stat kg-stat--time">{{ formatDate(post.publishDate) }}</span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-if="isLoadingMore && posts.length === 0" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-if="loadMoreError" class="kg-error">
      <p>{{ loadMoreError }}</p>
      <button class="kg-btn-ghost" @click="fetchPosts(true)">重试</button>
    </div>

    <div ref="loadingTrigger" class="kg-load-trigger">
      <div v-if="isLoadingMore && posts.length > 0" class="kg-loading kg-loading--inline">
        <div class="kg-spinner kg-spinner--sm"></div>
        <span>加载更多...</span>
      </div>
      <div v-if="hasReachedEnd && posts.length > 0" class="kg-end-label">已加载全部内容</div>
    </div>

    <div v-if="showPagination && totalPages > 1" class="kg-pagination">
      <button class="kg-page-btn" :disabled="currentPage <= 1" @click="prevPage">上一页</button>
      <span class="kg-page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="kg-page-btn" :disabled="currentPage >= totalPages" @click="nextPage">下一页</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-forum {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}

.kg-forum-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.kg-forum-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0;
}

.kg-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: #9EAAF4;
  color: #fff;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
  &:hover { background: #7b8ce8; }
}

.kg-sort-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.kg-sort-btn {
  padding: 6px 18px;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  background: #F5FBFE;
  color: #4a6080;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; color: #26a4ff; }
  &.active {
    background: #26a4ff;
    border-color: #26a4ff;
    color: #fff;
    font-weight: 600;
  }
}

.kg-post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kg-post-card {
  display: block;
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  padding: 20px 24px 16px;
  text-decoration: none;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
  box-shadow: 0 2px 12px rgba(40, 57, 101, 0.06);
  &:hover {
    box-shadow: 0 4px 20px rgba(40, 57, 101, 0.12);
    border-color: #26a4ff;
    transform: translateY(-1px);
  }
}

.kg-post-card__title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a2a4a;
  margin: 0 0 8px;
  line-height: 1.5;
}

.kg-post-card__excerpt {
  font-size: 0.875rem;
  color: #4a6080;
  margin: 0 0 10px;
  line-height: 1.6;
}

.kg-post-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.kg-tag {
  padding: 2px 10px;
  background: rgba(38, 164, 255, 0.1);
  border: 1px solid rgba(38, 164, 255, 0.3);
  border-radius: 10px;
  font-size: 0.75rem;
  color: #26a4ff;
}

.kg-post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #e8f4fd;
  padding-top: 12px;
  margin-top: 4px;
}

.kg-post-card__author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kg-post-card__avatar {
  border: 1px solid #c8dff8;
  box-shadow: 0 1px 3px rgba(40, 57, 101, 0.12);
}

.kg-post-card__author-name {
  font-size: 0.825rem;
  color: #4a6080;
  font-weight: 500;
}

.kg-post-card__stats {
  display: flex;
  align-items: center;
  gap: 14px;
}

.kg-stat {
  font-size: 0.8rem;
  color: #6a85a0;
  display: flex;
  align-items: center;
  gap: 4px;
  &--time { color: #9ab0c6; }
}

.kg-stat-icon {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #4a6080;
  &--inline { padding: 20px; }
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  &--sm { width: 18px; height: 18px; border-width: 2px; }
}

@keyframes spin { to { transform: rotate(360deg); } }

.kg-error {
  text-align: center;
  padding: 32px;
  color: #e05a5a;
  p { margin: 0 0 12px; }
}

.kg-btn-ghost {
  padding: 7px 20px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: transparent;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.875rem;
  &:hover { background: #F5FBFE; }
}

.kg-load-trigger {
  min-height: 20px;
  margin-top: 16px;
}

.kg-end-label {
  text-align: center;
  padding: 16px;
  font-size: 0.85rem;
  color: #9ab0c6;
}

.kg-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 0 0;
}

.kg-page-btn {
  padding: 7px 20px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: #F5FBFE;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  &:hover:not(:disabled) { border-color: #26a4ff; color: #26a4ff; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.kg-page-info {
  font-size: 0.875rem;
  color: #4a6080;
  min-width: 60px;
  text-align: center;
}
</style>
