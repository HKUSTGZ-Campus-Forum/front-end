<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useHead } from "#imports";
import { hkustgz } from "~/config/hkustgz";
import { useApi } from "~/composables/useApi";
import { useRouter } from "vue-router";
import UserAvatar from "~/components/user/UserAvatar.vue";

// 设置页面的元信息
useHead({
  title: "主页 - UniKorn 科广汇",
  meta: [
    {
      name: "description",
      content: hkustgz.description,
    },
  ],
  // link: [
  //   {
  //     rel: "icon",
  //     type: "image/x-icon",
  //     href: "/testico1.ico",
  //   },
  // ],
});

// Composables
const { fetchWithAuth, fetchPublic } = useApi();
const router = useRouter();

// 响应式数据
const hotPosts = ref([]);
const isLoading = ref(true);
const error = ref("");
const refreshInterval = ref(null);

// 接口类型定义
interface HotPost {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author: string;
  author_avatar?: string;
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  hot_score: number;
  tags: Array<{
    name: string;
    type: string;
  }>;
}

// 获取热门帖子
const fetchHotPosts = async () => {
  try {
    const { getApiUrl } = useApi();
    const response = await fetchPublic(
      getApiUrl("/analytics/hot-posts?limit=8&hours=72")
    );

    if (response.ok) {
      const data = await response.json();
      hotPosts.value = data.hot_posts || [];
      error.value = "";
    } else {
      console.error("❌ 获取热门帖子失败:", response.status);
      error.value = "获取热门帖子失败";
    }
  } catch (err) {
    console.error("❌ 获取热门帖子失败:", err);
    error.value = "网络连接失败";
  } finally {
    isLoading.value = false;
  }
};

// 格式化时间
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN");
};

// 跳转到帖子详情
const goToPost = (postId: number) => {
  router.push(`/forum/posts/${postId}`);
};

// 跳转到论坛
const goToForum = () => {
  router.push("/forum");
};

// 跳转到发帖页面
const goToPostMessage = () => {
  router.push("/forum/postMessage");
};

// 跳转到用户个人页面
const goToUserProfile = (userId: number) => {
  router.push(`/users/${userId}`);
};

// 生命周期钩子
onMounted(() => {
  fetchHotPosts();
  
  // 设置定时刷新（每5分钟）
  refreshInterval.value = setInterval(() => {
    fetchHotPosts();
  }, 5 * 60 * 1000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<template>
  <HomeContainer>
    <div class="home-page">
      <!-- 欢迎区域 -->
      <div class="welcome-section">
        <div class="welcome-content">
          <h1 class="welcome-title">
            <i class="fas fa-graduation-cap"></i>
            欢迎来到校园论坛
          </h1>
          <p class="welcome-subtitle">连接校园，分享知识，共同成长</p>
          <div class="welcome-actions">
            <button @click="goToForum" class="btn btn-primary">
              <i class="fas fa-comments"></i>
              浏览论坛
            </button>
            <button @click="goToPostMessage" class="btn btn-secondary">
              <i class="fas fa-edit"></i>
              发布帖子
            </button>
          </div>
        </div>
      </div>

      <!-- 热门帖子区域 -->
      <div class="hot-posts-section">
        <div class="section-header">
          <h2 class="section-title">
            <i class="fas fa-fire"></i>
            热门帖子
            <span class="refresh-indicator" v-if="!isLoading">
              <i class="fas fa-sync-alt"></i>
              每5分钟更新
            </span>
          </h2>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在加载热门帖子...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{ error }}</p>
          <button @click="fetchHotPosts" class="btn btn-outline">重试</button>
        </div>

        <!-- 热门帖子列表 -->
        <div v-else-if="hotPosts.length > 0" class="hot-posts-grid">
          <div
            v-for="post in hotPosts"
            :key="post.id"
            class="post-card"
            @click="goToPost(post.id)"
          >
            <div class="post-header">
              <h3 class="post-title">{{ post.title }}</h3>
              <div class="post-score">
                <i class="fas fa-fire"></i>
                {{ post.hot_score }}
              </div>
            </div>

            <div class="post-author" v-if="post.author">
              <UserAvatar 
                :avatar-url="post.author_avatar"
                :username="post.author"
                :user-id="post.author_id"
                size="xs"
                :clickable="true"
                @click.stop="goToUserProfile(post.author_id)"
              />
              <span class="author-name">{{ post.author }}</span>
            </div>

            <p class="post-content">{{ post.content }}</p>

            <div class="post-tags" v-if="post.tags && post.tags.length > 0">
              <span
                v-for="tag in post.tags.slice(0, 2)"
                :key="tag.name"
                class="tag"
                :class="tag.type"
              >
                {{ tag.name }}
              </span>
            </div>

            <div class="post-stats">
              <div class="stat">
                <i class="fas fa-heart"></i>
                {{ post.reaction_count }}
              </div>
              <div class="stat">
                <i class="fas fa-comment"></i>
                {{ post.comment_count }}
              </div>
              <div class="stat">
                <i class="fas fa-eye"></i>
                {{ post.view_count }}
              </div>
              <div class="post-time">
                {{ formatTimeAgo(post.created_at) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>暂无热门帖子</h3>
          <p>成为第一个发帖的人吧！</p>
          <button @click="goToPostMessage" class="btn btn-primary">
            <i class="fas fa-plus"></i>
            发布帖子
          </button>
        </div>
      </div>

      <!-- 快捷入口 -->
      <div class="quick-links-section">
        <h2 class="section-title">
          <i class="fas fa-compass"></i>
          快捷入口
        </h2>
        <div class="quick-links-grid">
          <NuxtLink to="/forum" class="quick-link">
            <i class="fas fa-comments"></i>
            <span>论坛讨论</span>
          </NuxtLink>
          <NuxtLink to="/courses" class="quick-link">
            <i class="fas fa-book"></i>
            <span>课程评价</span>
          </NuxtLink>
          <NuxtLink to="/forum/postMessage" class="quick-link">
            <i class="fas fa-edit"></i>
            <span>发布帖子</span>
          </NuxtLink>
          <NuxtLink to="/users" class="quick-link">
            <i class="fas fa-users"></i>
            <span>用户中心</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<style lang="scss" scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: calc(100vh - 120px);
}

// 欢迎区域
.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  color: white;
  margin-bottom: 3rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  .welcome-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;

    i {
      color: #ffd700;
    }
  }

  .welcome-subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 2rem;
  }

  .welcome-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
}

// 通用按钮样式
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  // Mobile touch target optimization
  min-height: 44px;
  min-width: 44px;

  &.btn-primary {
    background: #ff6b6b;
    color: white;
    
    &:hover {
      background: #ff5252;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
    }
  }

  &.btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }
  }

  &.btn-outline {
    background: transparent;
    color: #667eea;
    border: 2px solid #667eea;
    
    &:hover {
      background: #667eea;
      color: white;
    }
  }
}

// 区域标题
.section-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  i {
    color: #ff6b6b;
  }

  .refresh-indicator {
    margin-left: auto;
    font-size: 0.875rem;
    font-weight: 400;
    color: #666;
    display: flex;
    align-items: center;
    gap: 0.25rem;

    i {
      color: #666;
      font-size: 0.75rem;
    }
  }
}

// 热门帖子区域
.hot-posts-section {
  margin-bottom: 3rem;

  .loading-state, .error-state, .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 15px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

    i {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
  }

  .hot-posts-grid {
    display: grid;
    gap: 1.5rem;
    
    // Desktop - 2 columns for large screens, 1 for medium
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    
    // Tablet - ensure proper column behavior
    @media (max-width: 1024px) and (min-width: 769px) {
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    
    // Mobile - single column with optimized spacing
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    // Small mobile - tighter spacing
    @media (max-width: 480px) {
      gap: 0.75rem;
    }
  }

  .post-card {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 15px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    // Ensure proper touch targets
    min-height: 44px;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    // Reduce hover effects on mobile for better performance
    @media (max-width: 768px) {
      &:hover {
        transform: translateY(-2px);
      }
      
      // Add active state for better mobile feedback
      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;

      .post-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #2c3e50;
        margin: 0;
        flex: 1;
        line-height: 1.4;
        // Improve text handling on mobile
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      .post-score {
        background: linear-gradient(45deg, #ff6b6b, #ffa726);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;
        // Ensure proper touch target size
        min-height: 28px;
      }
    }

    .post-author {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.85rem;
      // Ensure proper touch target for avatar
      min-height: 32px;
      
      .author-name {
        color: #555;
        font-weight: 500;
        // Prevent text overflow on mobile
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .post-content {
      color: #555;
      line-height: 1.5;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      // Improved text handling on mobile
      word-wrap: break-word;
      overflow-wrap: break-word;
      // Limit content height to prevent overly long cards
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .post-tags {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;

      .tag {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
        // Ensure minimum touch target
        min-height: 28px;
        display: inline-flex;
        align-items: center;

        &.course {
          background: #e3f2fd;
          color: #1565c0;
        }

        &.user {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        &.system {
          background: #e8f5e8;
          color: #2e7d32;
        }
      }
    }

    .post-stats {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
      color: #666;
      flex-wrap: wrap;

      .stat {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        // Ensure proper touch targets
        min-height: 24px;

        i {
          color: #999;
        }
      }

      .post-time {
        margin-left: auto;
        font-size: 0.8rem;
        color: #999;
      }
    }
  }
}

// 快捷入口区域
.quick-links-section {
  .quick-links-grid {
    display: grid;
    gap: 1rem;
    
    // Desktop - 4 columns
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    
    // Tablet - adjust for better fit
    @media (max-width: 1024px) and (min-width: 769px) {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    
    // Mobile - 2 columns for better touch targets
    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    
    // Small mobile - maintain 2 columns but smaller
    @media (max-width: 480px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .quick-link {
      background: rgba(255, 255, 255, 0.8);
      padding: 2rem 1rem;
      border-radius: 15px;
      text-decoration: none;
      color: #2c3e50;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      // Ensure proper touch targets
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        background: rgba(255, 255, 255, 0.95);
      }

      // Reduce hover effects on mobile
      @media (max-width: 768px) {
        padding: 1.5rem 0.75rem;
        min-height: 100px;
        
        &:hover {
          transform: translateY(-1px);
        }
        
        &:active {
          transform: translateY(0);
        }
      }

      i {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: #667eea;
        display: block;
        
        // Smaller icons on mobile
        @media (max-width: 480px) {
          font-size: 1.5rem;
        }
      }

      span {
        font-weight: 600;
        font-size: 1rem;
        
        // Smaller text on mobile
        @media (max-width: 480px) {
          font-size: 0.875rem;
        }
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 响应式设计 - 移动端优化
// Tablet landscape (1024px)
@media (max-width: 1024px) and (min-width: 769px) {
  .home-page {
    padding: 1.5rem;
  }
  
  .welcome-section {
    padding: 2.5rem 1.5rem;
    
    .welcome-title {
      font-size: 2.25rem;
    }
    
    .welcome-subtitle {
      font-size: 1.1rem;
    }
  }
  
  .section-title {
    font-size: 1.7rem;
  }
}

// Tablet portrait and mobile (768px)
@media (max-width: 768px) {
  .home-page {
    padding: 1rem;
    min-height: calc(100vh - 100px);
  }

  .welcome-section {
    padding: 2rem 1rem;
    margin-bottom: 2rem;
    border-radius: 15px;

    .welcome-title {
      font-size: 2rem;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .welcome-subtitle {
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }

    .welcome-actions {
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      
      .btn {
        width: 100%;
        max-width: 280px;
        justify-content: center;
      }
    }
  }

  .section-title {
    font-size: 1.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1rem;

    .refresh-indicator {
      margin-left: 0;
      font-size: 0.8rem;
    }
  }

  .hot-posts-section {
    margin-bottom: 2rem;
    
    .loading-state, .error-state, .empty-state {
      padding: 2rem 1rem;
      border-radius: 12px;
      
      i {
        font-size: 2.5rem;
      }
      
      .btn {
        margin-top: 1rem;
      }
    }
    
    .post-card {
      padding: 1.25rem;
      border-radius: 12px;
      
      .post-header {
        margin-bottom: 0.75rem;
        
        .post-title {
          font-size: 1rem;
          line-height: 1.3;
        }
        
        .post-score {
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
        }
      }
      
      .post-author {
        margin-bottom: 0.75rem;
        font-size: 0.8rem;
      }
      
      .post-content {
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
        line-height: 1.4;
      }
      
      .post-tags {
        margin-bottom: 0.75rem;
        gap: 0.4rem;
        
        .tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.6rem;
        }
      }
      
      .post-stats {
        gap: 0.75rem;
        font-size: 0.8rem;
        
        .post-time {
          font-size: 0.75rem;
        }
      }
    }
  }
}

// Small mobile devices (480px)
@media (max-width: 480px) {
  .home-page {
    padding: 0.75rem;
  }

  .welcome-section {
    padding: 1.5rem 0.75rem;
    margin-bottom: 1.5rem;

    .welcome-title {
      font-size: 1.75rem;
      margin-bottom: 0.75rem;
      
      i {
        font-size: 1.5rem;
      }
    }

    .welcome-subtitle {
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
    }

    .welcome-actions {
      gap: 0.6rem;
      
      .btn {
        padding: 0.6rem 1.25rem;
        font-size: 0.9rem;
        max-width: 240px;
      }
    }
  }

  .section-title {
    font-size: 1.3rem;
    margin-bottom: 0.75rem;
    
    i {
      font-size: 1.2rem;
    }
    
    .refresh-indicator {
      font-size: 0.75rem;
      
      i {
        font-size: 0.7rem;
      }
    }
  }

  .hot-posts-section {
    margin-bottom: 1.5rem;
    
    .loading-state, .error-state, .empty-state {
      padding: 1.5rem 0.75rem;
      
      i {
        font-size: 2rem;
      }
      
      h3 {
        font-size: 1.1rem;
        margin: 0.5rem 0;
      }
      
      p {
        font-size: 0.9rem;
        margin: 0.5rem 0;
      }
    }
    
    .post-card {
      padding: 1rem;
      
      .post-header {
        gap: 0.75rem;
        
        .post-title {
          font-size: 0.95rem;
        }
      }
      
      .post-author {
        font-size: 0.75rem;
        
        .author-name {
          max-width: 120px;
        }
      }
      
      .post-content {
        font-size: 0.8rem;
        -webkit-line-clamp: 2;
      }
      
      .post-stats {
        gap: 0.5rem;
        font-size: 0.75rem;
        
        .stat {
          gap: 0.2rem;
          
          i {
            font-size: 0.7rem;
          }
        }
        
        .post-time {
          font-size: 0.7rem;
          margin-left: 0.5rem;
        }
      }
    }
  }
  
  // Improve button touch targets on very small screens
  .btn {
    min-height: 48px;
    padding: 0.75rem 1rem;
  }
  
  // Optimize quick links for small screens
  .quick-links-section {
    .quick-links-grid {
      .quick-link {
        padding: 1.25rem 0.5rem;
        min-height: 90px;
        border-radius: 12px;
        
        i {
          font-size: 1.25rem;
          margin-bottom: 0.4rem;
        }
        
        span {
          font-size: 0.8rem;
          line-height: 1.2;
        }
      }
    }
  }
}

// Ultra-small screens (360px and below)
@media (max-width: 360px) {
  .home-page {
    padding: 0.5rem;
  }
  
  .welcome-section {
    padding: 1.25rem 0.5rem;
    
    .welcome-title {
      font-size: 1.5rem;
    }
    
    .welcome-actions {
      .btn {
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        max-width: 200px;
      }
    }
  }
  
  .post-card {
    .post-content {
      -webkit-line-clamp: 2;
    }
    
    .post-stats {
      .post-time {
        margin-left: 0;
        width: 100%;
        margin-top: 0.5rem;
        text-align: center;
      }
    }
  }
  
  // Stack post stats vertically on very small screens
  .post-stats {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    
    .stat {
      &:first-child {
        align-self: flex-start;
      }
      
      &:not(:first-child) {
        margin-left: 0;
      }
    }
    
    .post-time {
      align-self: flex-end;
      margin-left: 0;
      margin-top: 0.25rem;
    }
  }
}

// Touch device optimizations
@media (hover: none) and (pointer: coarse) {
  .btn:hover {
    transform: none;
  }
  
  .post-card:hover {
    transform: none;
  }
  
  .quick-link:hover {
    transform: none;
  }
  
  // Add touch feedback
  .btn:active {
    transform: scale(0.98);
  }
  
  .post-card:active {
    transform: scale(0.99);
  }
  
  .quick-link:active {
    transform: scale(0.98);
  }
}
</style>
