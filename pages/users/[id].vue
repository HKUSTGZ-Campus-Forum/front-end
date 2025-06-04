<!-- /pages/users/[id].vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import HomeContainer from "~/components/home/HomeContainer.vue";

const { isLoggedIn, user } = useAuth();
const { fetchWithAuth } = useApi();
const route = useRoute();

// 用户信息类型定义
interface UserInfo {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  profile_picture_url?: string; // 🔥 后端字段名
  bio?: string;
  createdAt?: string;
  created_at?: string;
  lastActiveAt?: string;
  last_active_at?: string;
  role_name?: string; // 🔥 后端返回的角色名
}

interface UserStats {
  postCount: number;
  commentCount: number;
  likesReceived: number;
  viewCount: number;
  totalScore: number;
}

// 响应式数据
const userInfo = ref<UserInfo>({
  id: 0,
  username: "",
});

const userStats = ref<UserStats>({
  postCount: 0,
  commentCount: 0,
  likesReceived: 0,
  viewCount: 0,
  totalScore: 0,
});

const isLoading = ref(false);
const error = ref("");

const userId = route.params.id;

// 🔥 修复：获取用户信息，根据登录状态选择API
const fetchUserInfo = async () => {
  try {
    isLoading.value = true;
    error.value = "";

    // console.log("📤 获取用户信息，用户ID:", userId);
    // console.log("🔍 用户登录状态:", isLoggedIn.value);

    let response;

    if (isLoggedIn.value) {
      // 🔥 已登录：使用认证API获取完整信息
      //   console.log("🔐 使用认证API");
      response = await fetchWithAuth(
        `https://dev.unikorn.axfff.com/api/users/${userId}`
      );
    } else {
      // 🔥 未登录：使用公开API获取基本信息
      console.log("🌐 使用公开API");
      response = await fetch(
        `https://dev.unikorn.axfff.com/api/users/public/${userId}`
      );
    }

    console.log("📡 响应状态:", response.status);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("用户不存在");
      } else if (response.status === 401) {
        // 🔥 如果认证失败，尝试公开API
        if (isLoggedIn.value) {
          console.log("🔄 认证失败，尝试公开API");
          const publicResponse = await fetch(
            `https://dev.unikorn.axfff.com/api/users/public/${userId}`
          );

          if (publicResponse.ok) {
            response = publicResponse;
          } else {
            throw new Error("需要登录才能查看此用户信息");
          }
        } else {
          throw new Error("需要登录才能查看此用户信息");
        }
      } else if (response.status === 403) {
        throw new Error("没有权限查看此用户信息");
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`获取用户信息失败 (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    // console.log("📥 获取到的用户数据:", data);

    // 🔥 适配后端返回的数据结构
    userInfo.value = {
      id: data.id,
      username: data.username,
      email: data.email,
      avatar: data.profile_picture_url, // 🔥 后端字段名
      profile_picture_url: data.profile_picture_url,
      bio: data.bio,
      createdAt: data.created_at,
      created_at: data.created_at,
      lastActiveAt: data.last_active_at,
      last_active_at: data.last_active_at,
      role_name: data.role_name,
    };

    // 🔥 统计数据（可能需要单独API获取）
    userStats.value = {
      postCount: data.post_count || 0,
      commentCount: data.comment_count || 0,
      likesReceived: data.likes_received || 0,
      viewCount: data.view_count || 0,
      totalScore: data.total_score || 0,
    };
  } catch (err: any) {
    console.error("获取用户信息失败:", err);
    error.value = err.message || "获取用户信息失败";
  } finally {
    isLoading.value = false;
  }
};

// 重试函数
const retry = () => {
  fetchUserInfo();
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNjAiIGZpbGw9IiNmMGYwZjAiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ1IiByPSIyMCIgZmlsbD0iI2QwZDBkMCIvPjxwYXRoIGQ9Ik0yMCAxMDBjMC0yMiAxOC00MCA0MC00MHM0MCAxOCA0MCA0MCIgZmlsbD0iI2QwZDBkMCIvPjwvc3ZnPg==";
};

// 格式化日期
const formatDate = (dateString?: string) => {
  if (!dateString) return "未知";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "日期格式错误";
  }
};

onMounted(() => {
  //   console.log("🔄 页面加载，用户ID:", userId);
  if (userId && userId !== "0") {
    fetchUserInfo();
  } else {
    error.value = "无效的用户ID";
  }
});

// SEO 元数据
useHead({
  title: computed(() => `${userInfo.value.username || "用户"} - 个人信息`),
  meta: [
    {
      name: "description",
      content: computed(
        () => `查看 ${userInfo.value.username || "用户"} 的个人信息和统计数据`
      ),
    },
  ],
});
</script>

<template>
  <HomeContainer>
    <div class="user-profile-page">
      <div class="container mx-auto px-4 py-8">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading">
          <div class="loading-spinner"></div>
          <p>加载用户信息中...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error">
          <h2>加载失败</h2>
          <p>{{ error }}</p>
          <button @click="retry" class="retry-btn">重试</button>
        </div>

        <!-- 用户信息 -->
        <div v-else class="user-profile-card">
          <!-- 用户头像和基本信息 -->
          <div class="user-header">
            <div class="user-avatar-section">
              <img
                :src="
                  userInfo.profile_picture_url ||
                  userInfo.avatar ||
                  '/image/default-avatar.jpg'
                "
                :alt="userInfo.username"
                class="user-avatar"
                @error="handleImageError"
              />
            </div>

            <div class="user-basic-info">
              <h1 class="user-name">{{ userInfo.username || "匿名用户" }}</h1>
              <div class="user-badges">
                <span class="badge badge-primary">{{
                  userInfo.role_name || "用户"
                }}</span>
                <span class="badge badge-success">正常</span>
              </div>
            </div>

            <div class="user-stats-summary">
              <div class="stat-item">
                <div class="stat-value">{{ userStats.totalScore || 0 }}</div>
                <div class="stat-label">积分</div>
              </div>
            </div>
          </div>

          <!-- 统计数据网格 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">{{ userStats.postCount || 0 }}</div>
              <div class="stat-text">发布话题</div>
            </div>

            <div class="stat-card">
              <div class="stat-number">{{ userStats.commentCount || 0 }}</div>
              <div class="stat-text">评论数</div>
            </div>

            <div class="stat-card">
              <div class="stat-number">{{ userStats.likesReceived || 0 }}</div>
              <div class="stat-text">获得点赞</div>
            </div>

            <div class="stat-card">
              <div class="stat-number">{{ userStats.viewCount || 0 }}</div>
              <div class="stat-text">被浏览</div>
            </div>
          </div>

          <!-- 详细信息 -->
          <div class="user-details">
            <div class="detail-item">
              <span class="detail-label">注册序号</span>
              <span class="detail-value">{{ userInfo.id || "未知" }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">发布话题数</span>
              <span class="detail-value">{{ userStats.postCount || 0 }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">评论数</span>
              <span class="detail-value">{{
                userStats.commentCount || 0
              }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">注册时间</span>
              <span class="detail-value">{{
                formatDate(userInfo.created_at)
              }}</span>
            </div>

            <div class="detail-item" v-if="userInfo.last_active_at">
              <span class="detail-label">最后活跃</span>
              <span class="detail-value">{{
                formatDate(userInfo.last_active_at)
              }}</span>
            </div>

            <!-- 🔥 只有登录用户查看自己信息时显示邮箱 -->
            <div
              class="detail-item"
              v-if="
                isLoggedIn && user?.id == String(userInfo.id) && userInfo.email
              "
            >
              <span class="detail-label">邮箱</span>
              <span class="detail-value">{{ userInfo.email }}</span>
            </div>
          </div>

          <!-- 用户简介 -->
          <div class="user-bio-section">
            <h3 class="bio-title">个人简介</h3>
            <div class="bio-content">
              {{ userInfo.bio || "这个用户很懒，什么都没有留下..." }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<!-- 样式保持不变 -->
<style lang="scss" scoped>
// 现有样式...
</style>

<!-- 样式保持不变 -->
<style lang="scss" scoped>
.user-profile-page {
  min-height: calc(100vh - 140px);
  background-color: #f8f9fa;
}

.user-profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
}

.user-avatar-section {
  flex-shrink: 0;
}

.user-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #f0f0f0;

  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
  }
}

.user-basic-info {
  flex: 1;

  .user-name {
    font-size: 2rem;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }

  .user-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      justify-content: center;
    }
  }
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;

  &.badge-primary {
    background-color: rgba(25, 118, 210, 0.2);
    color: #1976d2;
  }

  &.badge-success {
    background-color: rgba(76, 175, 80, 0.2);
    color: #4caf50;
  }
}

.user-stats-summary {
  text-align: right;

  @media (max-width: 768px) {
    text-align: center;
  }

  .stat-item {
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #3498db;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 0.25rem;
  }

  .stat-text {
    font-size: 0.875rem;
    color: #666;
  }
}

.user-details {
  margin-bottom: 2rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-weight: 500;
    color: #666;
  }

  .detail-value {
    font-weight: 600;
    color: #2c3e50;
  }
}

.user-bio-section {
  .bio-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 1rem;
  }

  .bio-content {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    color: #555;
    line-height: 1.6;
    font-style: italic;
  }
}

// 加载状态
.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
  gap: 1rem;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    font-size: 1.1rem;
    color: #666;
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

// 错误状态
.error {
  text-align: center;
  padding: 3rem 2rem;
  background-color: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 2rem auto;
  max-width: 500px;

  h2 {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  p {
    color: #7f1d1d;
    margin-bottom: 1.5rem;
  }

  .retry-btn {
    background-color: #dc2626;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;

    &:hover {
      background-color: #b91c1c;
    }
  }
}
</style>
