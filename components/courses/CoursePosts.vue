<!-- components/course/CoursePosts.vue -->
<template>
  <div class="course-posts-section">
    <!-- 学期选择 -->
    <div class="semester-section">
      <h3>
        <i class="fas fa-calendar-alt"></i>
        选择学期
      </h3>
      <div class="semester-tabs">
        <button
          v-for="semester in availableSemesters"
          :key="semester"
          @click="selectSemester(semester)"
          :class="['semester-tab', { active: selectedSemester === semester }]"
        >
          {{ semester }}
        </button>
        <button
          @click="selectSemester(null)"
          :class="['semester-tab', { active: selectedSemester === null }]"
        >
          全部学期
        </button>
      </div>
    </div>

    <!-- 评课帖子列表 -->
    <div class="posts-section">
      <div class="posts-header">
        <h3>
          <i class="fas fa-comments"></i>
          评课帖子
          <span v-if="selectedSemester">({{ selectedSemester }})</span>
          <span class="posts-count">({{ postsData.total_count || 0 }})</span>
        </h3>
        <NuxtLink
          :to="`/forum/create?course=${courseCode}&semester=${
            selectedSemester || ''
          }`"
          class="create-post-btn"
        >
          <i class="fas fa-plus"></i>
          发表评课
        </NuxtLink>
      </div>

      <!-- 帖子加载状态 -->
      <div v-if="isLoadingPosts" class="posts-loading">
        <div class="loading-spinner small"></div>
        <p>加载评课帖子中...</p>
      </div>

      <!-- 无帖子状态 -->
      <div v-else-if="!posts.length" class="no-posts">
        <i class="fas fa-comments"></i>
        <h4>暂无评课帖子</h4>
        <p>成为第一个评价这门课程的同学吧！</p>
        <NuxtLink
          :to="`/forum/create?course=${courseCode}&semester=${
            selectedSemester || ''
          }`"
          class="create-first-post-btn"
        >
          发表第一篇评课
        </NuxtLink>
      </div>

      <!-- 帖子列表 -->
      <div v-else class="posts-list">
        <div v-for="post in posts" :key="post.id" class="post-card">
          <div class="post-header">
            <h4 class="post-title">
              <NuxtLink :to="`/forum/posts/${post.id}`">
                {{ post.title }}
              </NuxtLink>
            </h4>
            <div class="post-meta">
              <span class="post-author">{{
                post.author?.username || "匿名"
              }}</span>
              <span class="post-date">{{ formatDate(post.created_at) }}</span>
            </div>
          </div>

          <div class="post-content">
            {{ truncateContent(post.content, 150) }}
          </div>

          <div class="post-tags" v-if="post.tags?.length">
            <span v-for="(tag, index) in post.tags" :key="tag.id || tag.tag_id || tag.name || tag.tag_name || index" class="post-tag">
              {{ tag.name || tag.tag_name }}
            </span>
          </div>

          <div class="post-stats">
            <span class="post-views">
              <i class="fas fa-eye"></i>
              {{ post.view_count || 0 }}
            </span>
            <span class="post-likes">
              <i class="fas fa-heart"></i>
              {{ post.like_count || 0 }}
            </span>
            <span class="post-comments">
              <i class="fas fa-comment"></i>
              {{ post.comment_count || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="postsData.total_pages > 1" class="pagination">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage <= 1"
          class="page-btn"
        >
          上一页
        </button>
        <span class="page-info">
          第 {{ currentPage }} 页，共 {{ postsData.total_pages }} 页
        </span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage >= postsData.total_pages"
          class="page-btn"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApi } from "~/composables/useApi";

// 🔥 Props 定义
interface Props {
  courseId: number;
  courseCode: string;
  courseName: string;
}

const props = defineProps<Props>();

// 🔥 接口定义
interface Post {
  id: number;
  title: string;
  content: string;
  author?: {
    username: string;
  };
  created_at: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  tags?: Array<{
    id?: number;
    tag_id?: number;
    name?: string;
    tag_name?: string;
  }>;
}

interface PostsData {
  posts: Post[];
  total_count: number;
  total_pages: number;
  current_page: number;
}

// 🔥 Composables
const { fetchWithAuth, getApiUrl } = useApi();

// 🔥 响应式数据
const postsData = ref<PostsData>({
  posts: [],
  total_count: 0,
  total_pages: 0,
  current_page: 1,
});

const posts = computed(() => postsData.value.posts);
const currentPage = ref(1);
const selectedSemester = ref<string | null>(null);
const availableSemesters = ref<string[]>(["2024春", "2024秋", "2025春"]);
const isLoadingPosts = ref(false);

// 🔥 核心业务逻辑

// 🔥 使用后端API获取课程帖子
const fetchCoursePosts = async () => {
  try {
    isLoadingPosts.value = true;

    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: "10",
    });

    if (selectedSemester.value) {
      params.append("semester", selectedSemester.value);
    }

    console.log("📤 获取课程帖子:", params.toString());

    // 🔥 使用后端提供的API端点
    const response = await fetchWithAuth(
      getApiUrl(`/api/courses/${props.courseId}/posts?${params}`)
    );

    if (response.ok) {
      const data = await response.json();
      postsData.value = data;
      console.log("✅ 课程帖子获取成功:", data);
    } else {
      console.error("❌ 获取课程帖子失败:", response.status);
      // 🔥 设置空数据，不影响页面显示
      postsData.value = {
        posts: [],
        total_count: 0,
        total_pages: 0,
        current_page: 1,
      };
    }
  } catch (error) {
    console.error("❌ 获取课程帖子失败:", error);
    // 🔥 设置空数据
    postsData.value = {
      posts: [],
      total_count: 0,
      total_pages: 0,
      current_page: 1,
    };
  } finally {
    isLoadingPosts.value = false;
  }
};

// 🔥 选择学期并重新加载帖子
const selectSemester = (semester: string | null) => {
  selectedSemester.value = semester;
  currentPage.value = 1; // 重置到第一页
  fetchCoursePosts();
};

// 分页处理
const changePage = (page: number) => {
  if (page >= 1 && page <= postsData.value.total_pages) {
    currentPage.value = page;
    fetchCoursePosts();
  }
};

// 🔥 工具函数
const formatDate = (dateString: string) => {
  if (!dateString) return "未知";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "日期格式错误";
  }
};

const truncateContent = (content: string, maxLength: number) => {
  if (!content) return "";
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
};

// 🔥 生命周期
onMounted(() => {
  console.log("🔄 课程帖子组件加载，课程ID:", props.courseId);
  fetchCoursePosts();
});
</script>

<style lang="scss" scoped>
.course-posts-section {
  border-top: 1px solid var(--border-secondary);
}

.semester-section,
.posts-section {
  padding: 2rem;
  border-bottom: 1px solid var(--border-secondary);

  &:last-child {
    border-bottom: none;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
    font-size: 1.25rem;
    flex-wrap: wrap;

    i {
      color: var(--interactive-primary);
      min-width: 20px;
    }

    .posts-count {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: normal;
    }
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    padding: 1.5rem;
    
    h3 {
      font-size: 1.125rem;
      margin-bottom: 1.25rem;
      
      .posts-count {
        font-size: 0.8125rem;
      }
    }
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    
    h3 {
      font-size: 1rem;
      margin-bottom: 1rem;
      
      .posts-count {
        font-size: 0.75rem;
      }
    }
  }
}

// 学期选择
.semester-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  // Mobile optimization
  @media (max-width: 480px) {
    gap: 0.375rem;
  }
}

.semester-tab {
  padding: 0.5rem 1rem;
  border: 2px solid var(--border-primary);
  background: var(--surface-primary);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  // Ensure touch-friendly sizing
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-size: 0.875rem;
  white-space: nowrap;

  &:hover {
    border-color: var(--interactive-primary);
    background: var(--interactive-hover);
  }

  &.active {
    background: var(--interactive-primary);
    color: var(--text-inverse);
    border-color: var(--interactive-primary);
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
    min-height: 40px;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    min-height: 36px;
    border-radius: 16px;
  }
}

// 帖子区域样式（与原来的保持一致）
.posts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    margin-bottom: 1.25rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .create-post-btn {
    background: var(--semantic-success);
    color: var(--text-inverse);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.3s ease;
    // Ensure touch-friendly sizing
    min-height: 44px;
    box-sizing: border-box;
    font-weight: 500;

    &:hover {
      background: var(--interactive-hover);
    }
    
    // Mobile optimization
    @media (max-width: 768px) {
      width: 100%;
      padding: 0.75rem 1rem;
    }
    
    @media (max-width: 480px) {
      padding: 0.875rem 1rem;
      font-size: 0.9375rem;
    }
  }
}

.posts-loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);

  .loading-spinner.small {
    width: 30px;
    height: 30px;
    border: 4px solid var(--border-secondary);
    border-top: 4px solid var(--interactive-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  p {
    font-size: 0.9375rem;
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    padding: 1.5rem;
    
    .loading-spinner.small {
      width: 24px;
      height: 24px;
      border-width: 3px;
    }
    
    p {
      font-size: 0.875rem;
    }
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
  }
}

.no-posts {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-muted);

  i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h4 {
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }
  
  p {
    margin-bottom: 1.5rem;
    font-size: 0.9375rem;
  }

  .create-first-post-btn {
    background: var(--interactive-primary);
    color: var(--text-inverse);
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    display: inline-block;
    margin-top: 1rem;
    transition: background 0.3s ease;
    // Ensure touch-friendly sizing
    min-height: 44px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--interactive-hover);
    }
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    
    i {
      font-size: 2.5rem;
    }
    
    h4 {
      font-size: 1.125rem;
    }
    
    p {
      font-size: 0.875rem;
    }
    
    .create-first-post-btn {
      width: 100%;
      max-width: 280px;
      padding: 1rem 1.5rem;
    }
  }
  
  @media (max-width: 480px) {
    padding: 1.5rem 1rem;
    
    i {
      font-size: 2rem;
    }
    
    h4 {
      font-size: 1rem;
    }
    
    p {
      font-size: 0.8125rem;
    }
  }
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 1.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: var(--card-border, 1px solid var(--border-primary));
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
    border-color: var(--border-focus);
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    padding: 1.25rem;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-small);
    }
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 6px;
    
    // Remove hover transform on small screens, add touch feedback
    &:hover {
      transform: none;
      box-shadow: var(--shadow-small);
    }
    
    // Add active state for touch feedback
    &:active {
      transform: scale(0.98);
      transition: transform 0.1s ease;
    }
  }
}

.post-header {
  margin-bottom: 1rem;

  .post-title {
    a {
      color: var(--text-primary);
      text-decoration: none;
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.4;
      display: block;
      // Ensure touch-friendly link
      min-height: 24px;

      &:hover {
        color: var(--interactive-primary);
      }
    }
  }

  .post-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
    flex-wrap: wrap;
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    .post-title a {
      font-size: 1.0625rem;
    }
    
    .post-meta {
      font-size: 0.8125rem;
      gap: 0.75rem;
    }
  }
  
  @media (max-width: 480px) {
    .post-title a {
      font-size: 1rem;
      line-height: 1.3;
    }
    
    .post-meta {
      font-size: 0.75rem;
      gap: 0.5rem;
      flex-direction: column;
      margin-top: 0.375rem;
    }
  }
}

.post-content {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.post-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;

  .post-tag {
    background: var(--surface-secondary);
    color: var(--text-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
  }
}

.post-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  flex-wrap: wrap;

  span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    // Ensure touch-friendly spacing
    min-height: 24px;
    
    i {
      width: 14px;
      flex-shrink: 0;
    }
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    font-size: 0.8125rem;
    gap: 0.75rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
    gap: 0.5rem;
    
    span {
      min-height: 20px;
      gap: 0.1875rem;
      
      i {
        width: 12px;
      }
    }
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;

  .page-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-primary);
    background: var(--surface-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s ease;
    color: var(--text-primary);
    // Ensure touch-friendly sizing
    min-height: 44px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;

    &:hover:not(:disabled) {
      background: var(--surface-elevated);
      border-color: var(--border-focus);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .page-info {
    color: var(--text-muted);
    font-size: 0.875rem;
    white-space: nowrap;
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    gap: 0.75rem;
    margin-top: 1.5rem;
    
    .page-btn {
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      min-height: 40px;
    }
    
    .page-info {
      font-size: 0.8125rem;
    }
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
    
    .page-btn {
      width: 100%;
      max-width: 200px;
      padding: 0.75rem 1rem;
      min-height: 44px;
    }
    
    .page-info {
      order: -1;
      font-size: 0.75rem;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
