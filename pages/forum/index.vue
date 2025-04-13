<template>
  <HomeContainer>
    <div class="posts-container">
      <h1 class="page-title">论坛文章</h1>

      <div class="posts-list">
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

      <div class="pagination">
        <button
          class="prev-page"
          :disabled="currentPage === 1"
          @click="prevPage"
        >
          上一页
        </button>
        <span class="page-number">{{ currentPage }}/{{ totalPages }}</span>
        <button
          class="next-page"
          :disabled="currentPage === totalPages"
          @click="nextPage"
        >
          下一页
        </button>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, onMounted } from "vue";
import ForumPost from "~/components/forum/Post.vue";
import { formatDate } from "~/utils/dateFormat";

const posts = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);

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
    // const response = await fetch(`/api/posts?page=${currentPage.value}`);
    // const data = await response.json();
    // posts.value = data.posts;
    // totalPages.value = data.totalPages;

    // 模拟数据
    posts.value = Array(10)
      .fill()
      .map((_, i) => ({
        id: i + 1 + (currentPage.value - 1) * 10,
        title: `文章标题 #${i + 1 + (currentPage.value - 1) * 10}`,
        author: "用户名",
        publishDate: new Date().toISOString(),
        excerpt: "这是文章摘要，简单介绍文章的内容...",
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20),
        views: Math.floor(Math.random() * 500),
        tags: [
          { tag_id: 1, name: "标签1" },
          { tag_id: 2, name: "标签2" },
        ],
      }));
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
  margin-bottom: 1.5rem;
  font-size: 2rem;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

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
