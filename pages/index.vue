<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useHead } from "#imports";
import { hkustgz } from "~/config/hkustgz";
import { useApi } from "~/composables/useApi";
import { useRouter } from "vue-router";
import UserAvatar from "~/components/user/UserAvatar.vue";
import IdentityBadge from "~/components/identity/IdentityBadge.vue";
import type { UserIdentity } from "~/types/identity";

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
const recentGuguMessages = ref([]);
const isLoading = ref(true);
const isLoadingGugu = ref(true);
const isLoadingMoreGugu = ref(false);
const error = ref("");
const refreshInterval = ref(null);
const guguMessagesLimit = ref(10);
const guguMessagesOffset = ref(0);
const hasMoreMessages = ref(true);
const hasNewMessages = ref(false);

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
  display_identity?: UserIdentity | null; // Identity verification badge
}

// 获取热门帖子
const fetchHotPosts = async () => {
  try {
    const { getApiUrl } = useApi();
    const response = await fetchPublic(
      getApiUrl("/api/analytics/hot-posts?limit=8&hours=72")
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

// 跳转到咕咕聊天室
const goToGugu = () => {
  router.push("/gugu");
};

// 滚动到底部（显示最新消息）
const scrollToBottom = (container) => {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

// 处理点击新消息指示器
const handleNewMessagesClick = () => {
  const container = document.querySelector('.preview-messages.scrollable');
  if (container) {
    scrollToBottom(container);
    hasNewMessages.value = false;
  }
};

// 获取最近的咕咕消息
const fetchRecentGuguMessages = async (loadMore = false, isInitialLoad = false) => {
  if (loadMore) {
    if (!hasMoreMessages.value) return;
    isLoadingMoreGugu.value = true;
  } else {
    isLoadingGugu.value = true;
    guguMessagesOffset.value = 0;
    hasMoreMessages.value = true;
  }

  try {
    const { getApiUrl } = useApi();
    const response = await fetchPublic(
      getApiUrl(`/api/gugu/messages?limit=${guguMessagesLimit.value}&offset=${loadMore ? guguMessagesOffset.value : 0}`)
    );

    if (response.ok) {
      const data = await response.json();
      const newMessages = data.messages || [];
      
      if (loadMore) {
        // 在前面追加旧消息，避免重复
        const existingIds = new Set(recentGuguMessages.value.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        recentGuguMessages.value = [...uniqueNewMessages, ...recentGuguMessages.value];
        guguMessagesOffset.value += uniqueNewMessages.length;
        
        // 如果返回的消息数量少于请求的数量，说明没有更多消息了
        hasMoreMessages.value = newMessages.length === guguMessagesLimit.value;
      } else {
        const oldMessageIds = new Set(recentGuguMessages.value.map(m => m.id));
        recentGuguMessages.value = newMessages;
        guguMessagesOffset.value = newMessages.length;
        hasMoreMessages.value = newMessages.length === guguMessagesLimit.value;
        
        // 检查是否有新消息
        if (!isInitialLoad) {
          const hasNewContent = newMessages.some(m => !oldMessageIds.has(m.id));
          if (hasNewContent) {
            hasNewMessages.value = true;
          }
        }
        
        // 只在初次加载时滚动到底部，定时刷新时保持用户当前阅读位置
        if (isInitialLoad) {
          setTimeout(() => {
            const container = document.querySelector('.preview-messages.scrollable');
            if (container) {
              scrollToBottom(container);
            }
          }, 100);
        }
      }
    } else {
      console.log("咕咕消息获取失败，可能服务还未实现");
      if (!loadMore) recentGuguMessages.value = [];
    }
  } catch (err) {
    console.log("咕咕消息网络请求失败，可能服务还未实现");
    if (!loadMore) recentGuguMessages.value = [];
  } finally {
    isLoadingGugu.value = false;
    isLoadingMoreGugu.value = false;
  }
};

// 处理滚动到顶部加载更多
const handleScroll = (event) => {
  const container = event.target;
  const scrollTop = container.scrollTop;
  const scrollHeight = container.scrollHeight;
  const clientHeight = container.clientHeight;
  
  // 当滚动到距离顶部20px时开始加载更多（旧消息）
  if (scrollTop < 20 && hasMoreMessages.value && !isLoadingMoreGugu.value) {
    // 保存当前滚动位置，防止加载后跳动
    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;
    
    fetchRecentGuguMessages(true).then(() => {
      // 恢复滚动位置
      nextTick(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
      });
    });
  }
  
  // 当用户滚动到接近底部时，自动隐藏新消息指示器
  const nearBottom = scrollHeight - scrollTop - clientHeight < 50;
  if (nearBottom && hasNewMessages.value) {
    hasNewMessages.value = false;
  }
};

// 生命周期钩子
onMounted(() => {
  fetchHotPosts();
  fetchRecentGuguMessages(false, true); // 初次加载时传入 isInitialLoad = true
  
  // 设置定时刷新（每30秒）
  refreshInterval.value = setInterval(() => {
    fetchHotPosts();
    fetchRecentGuguMessages(false, false); // 定时刷新时传入 isInitialLoad = false
  }, 30 * 1000);
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
      <!-- 欢迎区域和外部链接 -->
      <div class="welcome-section">
        <div class="welcome-content">
          <h1 class="welcome-title">
            <i class="fas fa-graduation-cap"></i>
            欢迎来到UniKorn科广汇 - <br>科广学生自己的评课+生活社区
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
        
        <!-- 外部链接 -->
        <div class="external-links-sidebar">
          <h3 class="sidebar-title">快捷链接</h3>
          <div class="external-links-list">
            <a href="https://wiki.hkust-gz.top/en/home" target="_blank" class="external-link-sidebar">
              <i class="fas fa-book-open"></i>
              <span>科广学生编写的科广Wiki</span>
              <i class="fas fa-external-link-alt external-icon"></i>
            </a>
            <a href="https://myportal.hkust-gz.edu.cn" target="_blank" class="external-link-sidebar">
              <i class="fas fa-graduation-cap"></i>
              <span>myPortal</span>
              <i class="fas fa-external-link-alt external-icon"></i>
            </a>
            <a href="https://hkust-gz.instructure.com" target="_blank" class="external-link-sidebar">
              <i class="fas fa-chalkboard-teacher"></i>
              <span>Canvas</span>
              <i class="fas fa-external-link-alt external-icon"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- 咕咕聊天室快速预览 -->
      <div class="gugu-section">
        <h2 class="section-title">
          <span>💬</span>
          咕咕 - 聊点新鲜事儿～
          <span class="live-indicator">
            <span class="live-dot"></span>
            实时聊天
          </span>
        </h2>
        <div class="gugu-preview">
          <div class="gugu-content">
            <p class="gugu-description">与同学们实时交流，分享生活点滴，畅聊学习心得</p>
            <div class="gugu-actions">
              <button @click="goToGugu" class="btn btn-primary">
                <span>💬</span>
                进入咕咕聊天室
              </button>
            </div>
          </div>
          <div class="gugu-preview-messages">
            <!-- 加载状态 -->
            <div v-if="isLoadingGugu" class="gugu-loading">
              <div class="loading-spinner"></div>
              <p>正在加载最新消息...</p>
            </div>

            <!-- 有消息时显示 -->
            <div v-else-if="recentGuguMessages.length > 0" class="preview-messages-container">
              <div class="scrollable-wrapper">
                <div 
                  class="preview-messages scrollable" 
                  @scroll="handleScroll"
                >
                  <!-- 加载更多指示器（顶部） -->
                  <div v-if="isLoadingMoreGugu" class="loading-more-indicator top">
                    <div class="loading-spinner-small"></div>
                    <span>加载更多消息...</span>
                  </div>
                  
                  <!-- 没有更多消息指示器（顶部） -->
                  <div v-else-if="!hasMoreMessages && recentGuguMessages.length > 0" class="no-more-indicator top">
                    已显示全部消息
                  </div>

                  <div
                      v-for="message in recentGuguMessages"
                      :key="message.id"
                      class="preview-message"
                  >
                    <div class="message-header">
                      <span class="message-author">{{ message.author || '匿名用户' }}</span>
                      <span class="message-time">{{ formatTimeAgo(message.created_at) }}</span>
                    </div>
                    <div class="message-text">{{ message.content }}</div>
                  </div>
                </div>
                
                <!-- 新消息指示器 -->
                <div 
                  v-if="hasNewMessages" 
                  @click="handleNewMessagesClick"
                  class="new-messages-indicator"
                >
                  <i class="fas fa-arrow-down"></i>
                  <span>有新消息</span>
                </div>
                
                <!-- 顶部渐变遮罩 - 提示可向上滚动查看更多 -->
                <div 
                  v-if="hasMoreMessages || recentGuguMessages.length > 5" 
                  class="scroll-fade-indicator top"
                ></div>
                
                <!-- 底部渐变遮罩 - 只在有更多内容或正在加载时显示 -->
                <div 
                  v-if="hasMoreMessages || isLoadingMoreGugu" 
                  class="scroll-fade-indicator bottom"
                ></div>
              </div>
            </div>

            <!-- 无消息时显示 -->
            <div v-else class="no-messages">
              <span>💬</span>
              <p>还没有消息，快来开启第一条对话吧！</p>
            </div>
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
              每30秒更新
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
              <div class="author-details">
                <span class="author-name">{{ post.author }}</span>
                <IdentityBadge 
                  :identity="post.display_identity"
                  size="xs"
                  :show-tooltip="true"
                />
              </div>
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
                <span class="stat-label">点赞</span>
                {{ post.reaction_count }}
              </div>
              <div class="stat">
                <i class="fas fa-comment"></i>
                <span class="stat-label">评论</span>
                {{ post.comment_count }}
              </div>
              <div class="stat">
                <i class="fas fa-eye"></i>
                <span class="stat-label">浏览</span>
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
<!--          <NuxtLink to="/gugu" class="quick-link">-->
<!--            <span>💬</span>-->
<!--            <span>咕咕聊天</span>-->
<!--          </NuxtLink>-->
          <NuxtLink to="/forum/postMessage" class="quick-link">
            <i class="fas fa-edit"></i>
            <span>发布帖子</span>
          </NuxtLink>
          <!-- Temporarily disabled - 404 page not implemented yet
          <NuxtLink to="/users" class="quick-link">
            <i class="fas fa-users"></i>
            <span>用户中心</span>
          </NuxtLink>
          -->
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
  background: linear-gradient(135deg, var(--interactive-primary) 0%, var(--interactive-hover) 100%);
  border-radius: 20px;
  padding: 3rem 2rem;
  color: white;
  margin-bottom: 3rem;
  box-shadow: var(--shadow-large);
  display: grid;
  gap: 2rem;
  position: relative;
  overflow: hidden;
  
  // Add a subtle overlay to ensure text readability
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    z-index: 1;
  }
  
  // Ensure content is above the overlay
  // Desktop layout - side by side
  grid-template-columns: 2fr 1fr;
  align-items: start;
  
  > * {
    position: relative;
    z-index: 2;
  }
  
  // Tablet and mobile - stack vertically
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .welcome-content {
    text-align: center;
    
    // Left align on desktop when side-by-side
    @media (min-width: 1025px) {
      text-align: left;
    }
  }

  .welcome-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    line-height: 1.2;
    
    // Center on mobile/tablet, left on desktop
    justify-content: center;
    
    @media (min-width: 1025px) {
      justify-content: flex-start;
      margin-bottom: 2.5rem;
    }

    i {
      color: #ffd700;
      flex-shrink: 0;
    }
  }

  .welcome-subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 2.5rem;
    text-align: center;
    
    @media (min-width: 1025px) {
      text-align: left;
      margin-bottom: 3rem;
    }
  }

  .welcome-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    
    @media (min-width: 1025px) {
      justify-content: flex-start;
    }
  }

  // External links sidebar
  .external-links-sidebar {
    background: var(--surface-overlay);
    border-radius: 15px;
    padding: 1.5rem;
    backdrop-filter: var(--effect-blur);
    border: 1px solid var(--border-secondary);
    
    .sidebar-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 1rem;
      text-align: center;
      color: var(--text-primary);
      
      @media (min-width: 1025px) {
        text-align: left;
      }
    }

    .external-links-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .external-link-sidebar {
      background: var(--surface-secondary);
      padding: 0.75rem;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text-primary);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
      border: 1px solid var(--border-primary);
      backdrop-filter: blur(10px);
      box-shadow: var(--shadow-small);

      &:hover {
        background: var(--interactive-secondary);
        transform: translateY(-1px);
        border-color: var(--border-focus);
        box-shadow: var(--shadow-medium);
      }

      i:first-child {
        font-size: 1rem;
        color: var(--semantic-warning);
        flex-shrink: 0;
        width: 16px;
        text-align: center;
      }

      span {
        font-weight: 500;
        flex-grow: 1;
        font-size: 0.85rem;
        color: var(--text-primary);
      }

      .external-icon {
        font-size: 0.7rem;
        opacity: 0.8;
        flex-shrink: 0;
        color: var(--text-secondary);
      }

      // Subtle hover colors for visual consistency
      &:nth-child(1):hover {
        background: var(--surface-elevated);
        border-color: rgba(34, 197, 94, 0.3);
      }

      &:nth-child(2):hover {
        background: var(--surface-elevated);
        border-color: rgba(245, 158, 11, 0.3);
      }

      &:nth-child(3):hover {
        background: var(--surface-elevated);
        border-color: rgba(239, 68, 68, 0.3);
      }
    }
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
    background: var(--interactive-primary);
    color: var(--text-inverse);
    
    &:hover {
      background: var(--interactive-hover);
      transform: translateY(-2px);
      box-shadow: var(--shadow-medium);
    }
  }

  &.btn-secondary {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    
    &:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
    }
  }

  &.btn-outline {
    background: transparent;
    color: var(--interactive-primary);
    border: 2px solid var(--interactive-primary);
    
    &:hover {
      background: var(--interactive-primary);
      color: var(--text-inverse);
    }
  }
}

// 区域标题
.section-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  i {
    color: var(--interactive-primary);
  }

  .refresh-indicator {
    margin-left: auto;
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.25rem;

    i {
      color: var(--text-muted);
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
    background: var(--card-bg);
    border-radius: 15px;
    box-shadow: var(--shadow-medium);

    i {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border-secondary);
      border-top: 4px solid var(--interactive-primary);
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
    background: var(--card-bg);
    border-radius: 15px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: var(--card-shadow, var(--shadow-small));
    border: var(--card-border, 1px solid var(--border-primary));
    // Ensure proper touch targets
    min-height: 44px;

    &:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow-large);
    }

    // Reduce hover effects on mobile for better performance
    @media (max-width: 768px) {
      &:hover {
        transform: translateY(-2px);
      }
      
      // Add active state for better mobile feedback
      &:active {
        transform: translateY(0);
        box-shadow: var(--shadow-small);
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
        color: var(--text-primary);
        margin: 0;
        flex: 1;
        line-height: 1.4;
        // Improve text handling on mobile
        word-wrap: break-word;
        overflow-wrap: break-word;
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
      
      .author-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        
        @media (max-width: 480px) {
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
      }
      
      .author-name {
        color: var(--text-secondary);
        font-weight: 500;
        // Prevent text overflow on mobile
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .post-content {
      color: var(--text-secondary);
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
          background: var(--surface-secondary);
          color: var(--semantic-info);
        }

        &.user {
          background: var(--surface-elevated);
          color: var(--interactive-primary);
        }

        &.system {
          background: var(--surface-overlay);
          color: var(--semantic-success);
        }
      }
    }

    .post-stats {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      flex-wrap: wrap;

      .stat {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        // Ensure proper touch targets
        min-height: 24px;

        i {
          color: var(--text-muted);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }
      }

      .post-time {
        margin-left: auto;
        font-size: 0.8rem;
        color: var(--text-muted);
      }
    }
  }
}

// 咕咕聊天室区域
.gugu-section {
  margin-bottom: 3rem;

  .live-indicator {
    margin-left: auto;
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--semantic-success);
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .live-dot {
      width: 8px;
      height: 8px;
      background: var(--semantic-success);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
  }

  .gugu-preview {
    background: var(--card-bg);
    border-radius: 15px;
    padding: 0;
    box-shadow: var(--shadow-medium);
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 200px;

    // Mobile layout - stack vertically
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }

    .gugu-content {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      justify-content: center;

      @media (max-width: 768px) {
        padding: 1.5rem;
      }

      .gugu-description {
        font-size: 1.1rem;
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }

      .gugu-actions {
        display: flex;
        gap: 1rem;
      }
    }

    .gugu-preview-messages {
      background: var(--surface-secondary);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 200px;

      @media (max-width: 768px) {
        padding: 0.5rem;
        min-height: 180px;
      }

      .gugu-loading {
        text-align: center;
        color: var(--text-muted);

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-secondary);
          border-top: 2px solid var(--interactive-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 0.5rem;
        }

        p {
          font-size: 0.875rem;
          margin: 0;
        }
      }

      .preview-messages-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .scrollable-wrapper {
        position: relative;
        height: 100%;
      }

      .preview-messages {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        
        &.scrollable {
          max-height: 150px;
          overflow-y: auto;
          padding-right: 0.25rem;
          
          // 自定义滚动条样式
          &::-webkit-scrollbar {
            width: 4px;
          }
          
          &::-webkit-scrollbar-track {
            background: var(--surface-tertiary);
            border-radius: 2px;
          }
          
          &::-webkit-scrollbar-thumb {
            background: var(--border-primary);
            border-radius: 2px;
            
            &:hover {
              background: var(--text-muted);
            }
          }
        }
      }

      .loading-more-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem;
        color: var(--text-muted);
        font-size: 0.75rem;
        
        &.top {
          border-bottom: 1px solid var(--border-secondary);
          margin-bottom: 0.25rem;
        }
        
        .loading-spinner-small {
          width: 12px;
          height: 12px;
          border: 1px solid var(--border-secondary);
          border-top: 1px solid var(--interactive-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      }

      .no-more-indicator {
        text-align: center;
        padding: 0.5rem;
        color: var(--text-muted);
        font-size: 0.7rem;
        opacity: 0.8;
        
        &.top {
          border-bottom: 1px solid var(--border-secondary);
          margin-bottom: 0.25rem;
        }
      }

      .new-messages-indicator {
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--interactive-primary);
        color: var(--text-inverse);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        box-shadow: var(--shadow-medium);
        transition: all 0.3s ease;
        animation: pulse-glow 2s infinite;
        
        &:hover {
          background: var(--interactive-hover);
          transform: translateX(-50%) translateY(-2px);
          box-shadow: var(--shadow-large);
        }
        
        i {
          font-size: 0.7rem;
        }
      }

      .scroll-fade-indicator {
        position: absolute;
        left: 0;
        right: 0;
        height: 20px;
        pointer-events: none;
        z-index: 1;
        opacity: 0.8;
        
        &.top {
          top: 0;
          background: linear-gradient(
            to bottom,
            var(--surface-secondary),
            transparent
          );
        }
        
        &.bottom {
          bottom: 0;
          background: linear-gradient(
            to bottom,
            transparent,
            var(--surface-secondary)
          );
        }
      }

      .preview-message {
        background: var(--surface-primary);
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border-left: 2px solid var(--interactive-primary);

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.25rem;

          .message-author {
            font-weight: 600;
            color: var(--interactive-primary);
            font-size: 0.8rem;
          }

          .message-time {
            color: var(--text-muted);
            font-size: 0.7rem;
            flex-shrink: 0;
          }
        }

        .message-text {
          color: var(--text-primary);
          font-size: 0.85rem;
          line-height: 1.3;
          margin: 0;
        }
      }

      .no-messages {
        text-align: center;
        color: var(--text-muted);
        padding: 0.5rem;

        span {
          font-size: 1.5rem;
          display: block;
          margin-bottom: 0.25rem;
          opacity: 0.6;
        }

        p {
          font-size: 0.8rem;
          margin: 0;
          line-height: 1.3;
        }
      }
    }
  }
}

@keyframes pulse-glow {
  0% {
    box-shadow: var(--shadow-medium);
  }
  50% {
    box-shadow: var(--shadow-large), 0 0 20px rgba(59, 130, 246, 0.3);
  }
  100% {
    box-shadow: var(--shadow-medium);
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
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
      background: var(--card-bg);
      padding: 2rem 1rem;
      border-radius: 15px;
      text-decoration: none;
      color: var(--text-primary);
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: var(--shadow-small);
      // Ensure proper touch targets
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-medium);
        background: var(--surface-elevated);
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
        color: var(--interactive-primary);
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
    gap: 1.5rem;

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

    .external-links-sidebar {
      padding: 1.25rem;
      
      .sidebar-title {
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
      }

      .external-link-sidebar {
        padding: 0.6rem;
        gap: 0.6rem;
        
        i:first-child {
          font-size: 0.9rem;
          width: 14px;
        }
        
        span {
          font-size: 0.8rem;
        }
        
        .external-icon {
          font-size: 0.65rem;
        }
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
