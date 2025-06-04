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
          :user_id="post.author"
          :title="post.title"
          :author="post.author"
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

    const response = await fetchWithAuth(
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

    // 转换数据格式前获取所有作者信息
    const authorPromises = data.posts.map((post) =>
      getUsernameById(post.user_id)
    );

    // 等待所有用户名获取完成
    const authorNames = await Promise.all(authorPromises);

    // 转换数据格式
    posts.value = data.posts.map((post, index) => ({
      ...post,
      author_id: post.user_id,
      author: authorNames[index], // 使用获取到的用户名
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
}

.page-title {
  margin-bottom: 1rem; // 减小与筛选栏的间距
  font-size: 2rem;
}

/* 新增筛选和操作栏样式 */
.filter-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.filter-options {
  display: flex;
  align-items: center;

  .filter-label {
    margin-right: 0.5rem;
    font-weight: 500;
    color: #555;
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    color: #333;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #3498db;
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

  &:hover {
    background-color: #2980b9;
  }

  i {
    font-size: 0.9rem;
  }
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 保留原有样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;

  button {
    padding: 0.5rem 1rem;
    border: none;
    background-color: #3498db;
    color: white;
    border-radius: 4px;
    cursor: pointer;

    &:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background-color: #2980b9;
    }
  }

  .page-number {
    font-weight: bold;
  }
}
</style>
