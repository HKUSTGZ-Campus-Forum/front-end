<template>
  <HomeContainer>
    <div class="posts-container">
      <h1 class="page-title">社团活动</h1>

      <!-- 新增筛选和操作栏 -->
      <div class="filter-action-bar">
        <div class="filter-options">
          <span class="filter-label">排序方式：</span>
          <select
            v-model="sortBy"
            @change="handleSortChange($event.target.value)"
            class="filter-select"
          >
            <option value="latest">最新发布</option>
            <option value="oldest">最早发布</option>
            <option value="hot">热度优先</option>
          </select>
        </div>

        <NuxtLink to="/forum/postMessage" class="post-button">
          <i class="fas fa-plus"></i> 发布社团活动
        </NuxtLink>
      </div>

      <div class="posts-list">
        <!-- 现有的帖子列表 -->
        <ForumPost
          v-for="post in posts"
          :key="post.id"
          :id="post.id"
          :user_id="post.user_id"
          :title="post.title"
          :author="post.author"
          :author_avatar="post.author_avatar"
          :display_identity="post.display_identity"
          :publish-date="post.publishDate"
          :excerpt="post.content"
          :content="post.content"
          :comment_count="post.comments"
          :reaction_count="post.reaction_count || 0"
          :view_count="post.view_count || 0"
          :tags="post.tags || []"
        />

        <!-- Loading trigger element for infinite scroll -->
        <div ref="loadingTrigger" class="loading-trigger"></div>

        <!-- Loading indicator -->
        <div v-if="isLoadingMore" class="loading-more">
          <div class="loading-spinner"></div>
          <span>加载更多社团活动...</span>
        </div>

        <!-- Error message -->
        <div v-if="loadMoreError" class="load-more-error">
          <p>{{ loadMoreError }}</p>
          <button @click="loadMorePosts" class="retry-button">
            <i class="fas fa-redo"></i> 重试
          </button>
        </div>

        <!-- End of content message -->
        <div v-if="hasReachedEnd && !isLoadingMore" class="end-of-content">
          <span>已经到底啦 ~</span>
        </div>

        <!-- Empty state when no posts -->
        <div v-if="!isLoadingMore && posts.length === 0" class="empty-state">
          <div class="empty-icon">🏛️</div>
          <h3>暂无社团活动</h3>
          <p>还没有社团活动发布，快来发布第一个吧！</p>
        </div>
      </div>

      <!-- 保持原有的分页部分作为备选 -->
      <div v-if="showPagination" class="pagination">
        <button
          @click="prevPage"
          :disabled="currentPage <= 1"
          class="page-btn"
        >
          上一页
        </button>
        <span class="page-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        <button
          @click="nextPage"
          :disabled="currentPage >= totalPages"
          class="page-btn"
        >
          下一页
        </button>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import ForumPost from "~/components/forum/Post.vue";
import { formatDate } from "~/utils/dateFormat";
import { useUser } from "~/composables/useUser";
import { useApi } from "~/composables/useApi";

const { getUsernameById } = useUser();
const { fetchWithAuth } = useApi();
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

// Show pagination as fallback when infinite scroll is not supported
const showPagination = computed(() => {
  return typeof IntersectionObserver === 'undefined' || hasReachedEnd.value;
});

// Map frontend sort options to backend sort fields
const sortMapping = {
  latest: { sort_by: "created_at", sort_order: "desc" },
  oldest: { sort_by: "created_at", sort_order: "asc" },
  hot: { sort_by: "reaction_count", sort_order: "desc" },
};

// Update sort handler
function handleSortChange(value) {
  sortBy.value = value;
  // Reset pagination state
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
    
    // Add tag filter for "club" using fetchWithAuth
    const response = await fetchWithAuth("/api/posts?" +
      new URLSearchParams({
        page: currentPage.value.toString(),
        limit: "20",
        sort_by: sort_by,
        sort_order: sort_order,
        tags: "club", // Filter posts with "club" tag
      })
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "获取社团活动失败");
    }

    const data = await response.json();

    // Transform data format
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
    console.error("获取社团活动失败:", error);
    loadMoreError.value = error.message || "获取社团活动失败，请稍后重试";
  } finally {
    isLoadingMore.value = false;
  }
}

// Load more posts when scrolling
async function loadMorePosts() {
  if (hasReachedEnd.value || isLoadingMore.value) return;
  
  currentPage.value++;
  await fetchPosts();
}

// Setup intersection observer
function setupIntersectionObserver() {
  if (typeof IntersectionObserver === 'undefined') return;
  
  observer.value = new IntersectionObserver(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoadingMore.value && !hasReachedEnd.value) {
        loadMorePosts();
      }
    },
    {
      rootMargin: '100px', // Start loading before reaching the bottom
      threshold: 0.1
    }
  );

  if (loadingTrigger.value) {
    observer.value.observe(loadingTrigger.value);
  }
}

// Cleanup observer on component unmount
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

<style lang="scss" scoped>
.posts-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem;
  
  // Mobile responsiveness
  @media (max-width: 480px) {
    padding: 0 0.75rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 0 1rem;
  }
  
  @media (min-width: 769px) and (max-width: 1024px) {
    padding: 0 1.5rem;
  }
}

.page-title {
  margin-bottom: 1rem;
  font-size: 2rem;
  text-align: center;
  color: var(--text-primary);
  
  // Responsive typography
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 1.75rem;
    margin-bottom: 0.875rem;
  }
}

/* Mobile-optimized filter and action bar */
.filter-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--surface-secondary);
  border-radius: 8px;
  box-shadow: var(--shadow-small);
  
  // Mobile layout - stack vertically on small screens
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 0.875rem;
    gap: 0.75rem;
  }
}

.filter-options {
  display: flex;
  align-items: center;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }

  .filter-label {
    margin-right: 0.5rem;
    font-weight: 500;
    color: var(--text-secondary);
    
    // Hide label on very small screens to save space
    @media (max-width: 320px) {
      display: none;
    }
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background-color: var(--surface-primary);
    color: var(--text-primary);
    cursor: pointer;
    min-height: 44px; // Touch-friendly minimum height
    
    // Mobile optimizations
    @media (max-width: 480px) {
      padding: 0.75rem;
      font-size: 1rem;
      min-width: 180px;
    }

    &:focus {
      outline: none;
      border-color: var(--interactive-primary);
      box-shadow: 0 0 0 2px var(--interactive-focus);
    }
  }
}

.post-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--interactive-primary);
  color: var(--text-inverse);
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
  min-height: 44px; // Touch-friendly minimum height
  
  // Mobile optimizations
  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 0.625rem 1.25rem;
  }

  &:hover {
    background-color: var(--interactive-hover);
  }
  
  // Touch feedback for mobile
  &:active {
    transform: translateY(1px);
    background-color: var(--interactive-active);
  }

  i {
    font-size: 0.9rem;
    
    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    gap: 1rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    gap: 1.25rem;
  }
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
  
  p {
    font-size: 1rem;
    opacity: 0.8;
  }
  
  @media (max-width: 480px) {
    padding: 3rem 1rem;
    
    .empty-icon {
      font-size: 3rem;
    }
    
    h3 {
      font-size: 1.25rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
}

/* Mobile-optimized pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    gap: 0.5rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    background-color: var(--interactive-primary);
    color: var(--text-inverse);
    border-radius: 4px;
    cursor: pointer;
    min-height: 44px; // Touch-friendly minimum height
    transition: all 0.2s ease;
    
    // Mobile optimizations
    @media (max-width: 480px) {
      padding: 0.75rem 1rem;
      font-size: 1rem;
      min-width: 44px;
    }

    &:disabled {
      background-color: var(--interactive-disabled);
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background-color: var(--interactive-hover);
    }
    
    // Touch feedback
    &:active:not(:disabled) {
      transform: translateY(1px);
      background-color: var(--interactive-active);
    }
  }

  .page-number {
    font-weight: bold;
    color: var(--text-primary);
    
    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-secondary);
  gap: 1rem;
  
  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--border-primary);
    border-top: 3px solid var(--interactive-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

.load-more-error {
  text-align: center;
  padding: 1.5rem;
  color: var(--status-error);
  background-color: var(--status-error-bg);
  border-radius: 8px;
  margin: 1rem 0;
  
  p {
    margin-bottom: 1rem;
  }
  
  .retry-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--interactive-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: var(--interactive-hover);
    }
    
    i {
      font-size: 0.9rem;
    }
  }
}

.end-of-content {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  border-top: 1px solid var(--border-primary);
  margin-top: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Mobile optimizations
@media (max-width: 480px) {
  .loading-more {
    padding: 1.5rem;
    
    .loading-spinner {
      width: 20px;
      height: 20px;
      border-width: 2px;
    }
  }
  
  .load-more-error {
    padding: 1rem;
    margin: 0.75rem 0;
    
    .retry-button {
      width: 100%;
      justify-content: center;
      padding: 0.75rem;
    }
  }
  
  .end-of-content {
    padding: 1.5rem;
    font-size: 0.85rem;
  }
}

.loading-trigger {
  height: 1px;
  width: 100%;
  margin: 1rem 0;
  visibility: hidden;
}
</style>