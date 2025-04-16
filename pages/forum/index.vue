<template>
  <HomeContainer>
    <div class="posts-container">
      <h1 class="page-title">论坛文章</h1>

      <!-- 新增筛选和操作栏 -->
      <div class="filter-action-bar">
        <div class="filter-options">
          <span class="filter-label">排序方式：</span>
          <select v-model="sortBy" @change="fetchPosts" class="filter-select">
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
          :title="post.title"
          :author="post.author"
          :publish-date="post.publishDate"
          :excerpt="post.excerpt"
          :comment_count="post.comments"
          :reaction_count="post.likes"
          :views_count="post.views || 0"
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
import ForumPost from "~/components/forum/post.vue";
import { formatDate } from "~/utils/dateFormat";

const posts = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const sortBy = ref("latest"); // 默认按最新发布排序

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
    // 实际项目中替换为API调用
    const response = await fetch(
      `https://dev.unikorn.axfff.com/api/posts?page=${currentPage.value}&sort=${sortBy.value}`
    );
    const data = await response.json();
    posts.value = data.posts;
    totalPages.value = data.totalPages;

    // 模拟数据
    // posts.value = Array(10)
    //   .fill()
    //   .map((_, i) => ({
    //     id: i + 1 + (currentPage.value - 1) * 10,
    //     title: `文章标题 #${i + 1 + (currentPage.value - 1) * 10}`,
    //     author: "用户名",
    //     publishDate: new Date(Date.now() - i * 86400000).toISOString(), // 根据排序变化日期
    //     excerpt: "这是文章摘要，简单介绍文章的内容...",
    //     likes: Math.floor(Math.random() * 100),
    //     comments: Math.floor(Math.random() * 20),
    //     views: Math.floor(Math.random() * 500),
    //     tags: [
    //       { tag_id: 1, name: "标签1" },
    //       { tag_id: 2, name: "标签2" },
    //     ],
    //   }));

    // 根据排序方式调整数据顺序
    if (sortBy.value === "oldest") {
      posts.value.reverse();
    } else if (sortBy.value === "hot") {
      posts.value.sort(
        (a, b) => b.views + b.comments * 2 - (a.views + a.comments * 2)
      );
    }

    totalPages.value = 5;
  } catch (error) {
    console.error("获取文章列表失败:", error);
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
