<template>
  <HomeContainer>
    <div class="posts-container">
      <h1 class="page-title">论坛文章</h1>

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
          <i class="fas fa-plus"></i> 我要发帖
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
          :publish-date="post.publishDate"
          :excerpt="post.content"
          :content="post.content"
          :comment_count="post.comments"
          :view_count="post.view_count || 0"
          :tags="post.tags || []"
        />
      </div>

      <!-- 保持原有的分页部分 -->
      <div class="pagination">
        <!-- ... 现有的分页代码 ... -->
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, onMounted } from "vue";
import ForumPost from "~/components/forum/Post.vue";
import { formatDate } from "~/utils/dateFormat";
import { useUser } from "~/composables/useUser";
import { useApi } from "~/composables/useApi";

const { getUsernameById } = useUser();
const { fetchWithAuth } = useApi();
const posts = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const sortBy = ref("latest"); // Changed to match backend's sort_by field
const sortOrder = ref("desc"); // Added to match backend's sort_order parameter
const errorMessage = ref("");

// Map frontend sort options to backend sort fields
const sortMapping = {
  latest: { sort_by: "created_at", sort_order: "desc" },
  oldest: { sort_by: "created_at", sort_order: "asc" },
  hot: { sort_by: "reaction_count", sort_order: "desc" },
};

// Update sort handler
function handleSortChange(value) {
  // const { sort_by, sort_order } = sortMapping[value] || sortMapping.latest;
  sortBy.value = value;
  // sortOrder.value = sort_order;
  fetchPosts();
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchPosts();
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchPosts();
  }
}

async function fetchPosts() {
  try {
    const { sort_by, sort_order } =
      sortMapping[sortBy.value] || sortMapping.latest;

    const response = await fetch(
      `https://dev.unikorn.axfff.com/api/posts?` +
        new URLSearchParams({
          page: currentPage.value.toString(),
          limit: "20", // Using backend's default limit
          sort_by: sort_by, // ✅ 使用转换后的后端字段
          sort_order: sort_order,
        })
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "获取文章列表失败");
    }

    // 转换数据格式 - 使用后端提供的 author 和 author_avatar 字段
    posts.value = data.posts.map((post) => ({
      ...post,
      author_id: post.user_id,
      author: post.author || "匿名用户", // 使用后端提供的 author 字段
      author_avatar: post.author_avatar, // 使用后端提供的 author_avatar 字段
      comments: post.comment_count || 0,
      view_count: post.view_count || 0,
      views: post.view_count || 0,
      publishDate: post.created_at, // Map created_at to publishDate for the component
    }));

    totalPages.value = data.total_pages;
  } catch (error) {
    console.error("获取文章列表失败:", error);
    errorMessage.value = error.message || "获取文章列表失败，请稍后重试";
  }
}

onMounted(() => {
  fetchPosts();
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
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
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
    color: #555;
    
    // Hide label on very small screens to save space
    @media (max-width: 320px) {
      display: none;
    }
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    color: #333;
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
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
  }
}

.post-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
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
    background-color: #2980b9;
  }
  
  // Touch feedback for mobile
  &:active {
    transform: translateY(1px);
    background-color: #2574a9;
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
    background-color: #3498db;
    color: white;
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
      background-color: #ccc;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background-color: #2980b9;
    }
    
    // Touch feedback
    &:active:not(:disabled) {
      transform: translateY(1px);
      background-color: #2574a9;
    }
  }

  .page-number {
    font-weight: bold;
    
    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }
}
</style>
