<!-- /pages/users/[id].vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import HomeContainer from "~/components/home/HomeContainer.vue";
import UserAvatar from "~/components/user/UserAvatar.vue";
import AvatarUpload from "~/components/user/AvatarUpload.vue";

const { isLoggedIn, user, updateLocalUserData } = useAuth();
const { fetchWithAuth, getApiUrl } = useApi();
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
const showAvatarUpload = ref(false);

// Username editing state
const isEditingUsername = ref(false);
const editedUsername = ref("");
const usernameError = ref("");
const isSavingUsername = ref(false);

const userId = route.params.id;

// Check if this is the current user's profile
const isOwnProfile = computed(() => {
  return isLoggedIn.value && user.value && String(user.value.id) === String(userId);
});

// 🔥 修复：获取用户信息，根据登录状态选择API
const fetchUserInfo = async () => {
  try {
    isLoading.value = true;
    error.value = "";

    // console.log("📤 获取用户信息，用户ID:", userId);
    // console.log("🔍 用户登录状态:", isLoggedIn.value);

    let response;
    let statsResponse;

    if (isLoggedIn.value) {
      // 🔥 已登录：使用认证API获取完整信息
      //   console.log("🔐 使用认证API");
      [response, statsResponse] = await Promise.all([
        fetchWithAuth(getApiUrl(`/api/users/${userId}`)),
        fetchWithAuth(getApiUrl(`/api/users/${userId}/stats`))
      ]);
    } else {
      // 🔥 未登录：使用公开API获取基本信息
      console.log("🌐 使用公开API");
      [response, statsResponse] = await Promise.all([
        fetch(getApiUrl(`/api/users/public/${userId}`)),
        fetch(getApiUrl(`/api/users/${userId}/stats`))
      ]);
    }

    console.log("📡 响应状态:", response.status, statsResponse.status);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("用户不存在");
      } else if (response.status === 401) {
        // 🔥 如果认证失败，尝试公开API
        if (isLoggedIn.value) {
          console.log("🔄 认证失败，尝试公开API");
          const publicResponse = await fetch(
            getApiUrl(`/api/users/public/${userId}`)
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

    if (!statsResponse.ok) {
      console.warn("获取用户统计数据失败:", statsResponse.status);
      // Don't throw error for stats, just use default values
    }

    const data = await response.json();
    const statsData = statsResponse.ok ? await statsResponse.json() : null;
    // console.log("📥 获取到的用户数据:", data);
    // console.log("📊 获取到的统计数据:", statsData);

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
      role_name: data.role_name,
    };

    // 🔥 使用新的统计数据API
    if (statsData) {
      userStats.value = {
        postCount: statsData.post_count || 0,
        commentCount: statsData.comment_count || 0,
        likesReceived: statsData.likes_received || 0,
        viewCount: statsData.view_count || 0,
        totalScore: statsData.total_score || 0,
      };
    }
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

// Add a function to format UID
const formatUID = (id: number) => {
  return id.toString().padStart(10, '0');
};

// Handle avatar update
const handleAvatarUpdated = (newAvatarUrl: string) => {
  // Update local user info
  userInfo.value.profile_picture_url = newAvatarUrl;
  
  // Close avatar upload section
  showAvatarUpload.value = false;
};

// Username editing functions
const startEditingUsername = () => {
  isEditingUsername.value = true;
  editedUsername.value = userInfo.value.username;
  usernameError.value = "";
};

const cancelEditingUsername = () => {
  isEditingUsername.value = false;
  editedUsername.value = "";
  usernameError.value = "";
};

const validateUsername = (username: string): string | null => {
  if (!username.trim()) {
    return "用户名不能为空";
  }
  if (username.length < 2) {
    return "用户名至少需要2个字符";
  }
  if (username.length > 50) {
    return "用户名不能超过50个字符";
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return "用户名只能包含字母、数字、下划线和中文字符";
  }
  return null;
};

const saveUsername = async () => {
  const trimmedUsername = editedUsername.value.trim();
  
  // Validate username
  const validationError = validateUsername(trimmedUsername);
  if (validationError) {
    usernameError.value = validationError;
    return;
  }
  
  // Check if username actually changed
  if (trimmedUsername === userInfo.value.username) {
    cancelEditingUsername();
    return;
  }
  
  try {
    isSavingUsername.value = true;
    usernameError.value = "";
    
    const response = await fetchWithAuth(getApiUrl(`/api/users/${userInfo.value.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: trimmedUsername
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `更新失败 (${response.status})`);
    }
    
    const responseData = await response.json();
    const updatedUserData = responseData.user || responseData;
    
    // Update local user info
    userInfo.value.username = updatedUserData.username || trimmedUsername;
    
    // Update auth user data if this is current user
    if (isOwnProfile.value && user.value) {
      updateLocalUserData({ username: updatedUserData.username || trimmedUsername });
    }
    
    // Close editing mode
    isEditingUsername.value = false;
    editedUsername.value = "";
    
  } catch (err: any) {
    console.error('Failed to update username:', err);
    usernameError.value = err.message || '更新用户名失败，请稍后重试';
  } finally {
    isSavingUsername.value = false;
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
              <UserAvatar 
                :avatar-url="userInfo.profile_picture_url"
                :username="userInfo.username"
                :user-id="userInfo.id"
                size="xl"
                :clickable="false"
              />
              
              <!-- Edit Avatar Button for Own Profile -->
              <button 
                v-if="isOwnProfile" 
                @click="showAvatarUpload = !showAvatarUpload"
                class="edit-avatar-btn"
                :class="{ active: showAvatarUpload }"
              >
                <span class="icon-fallback">📷</span>
                {{ showAvatarUpload ? '取消' : '更换头像' }}
              </button>
            </div>

            <div class="user-basic-info">
              <!-- Username Display/Edit Section -->
              <div class="username-section">
                <!-- View Mode -->
                <div v-if="!isEditingUsername" class="username-display">
                  <h1 class="user-name">{{ userInfo.username || "匿名用户" }}</h1>
                  <button 
                    v-if="isOwnProfile" 
                    @click="startEditingUsername"
                    class="edit-username-btn"
                    title="编辑用户名"
                  >
                    <!-- Fallback text icon until Font Awesome loads or custom icons are added -->
                    <span class="icon-fallback">✏️</span>
                  </button>
                </div>
                
                <!-- Edit Mode -->
                <div v-else class="username-edit">
                  <div class="username-input-group">
                    <input
                      v-model="editedUsername"
                      type="text"
                      class="username-input"
                      :class="{ 'error': usernameError }"
                      placeholder="输入新用户名"
                      :disabled="isSavingUsername"
                      @keyup.enter="saveUsername"
                      @keyup.escape="cancelEditingUsername"
                      maxlength="50"
                    />
                    <div class="username-actions">
                      <button 
                        @click="saveUsername"
                        class="save-btn"
                        :disabled="isSavingUsername"
                        title="保存"
                      >
                        <!-- Fallback icons until Font Awesome loads or custom icons are added -->
                        <span class="icon-fallback" v-if="!isSavingUsername">✓</span>
                        <span class="icon-fallback spinning" v-else>⟳</span>
                      </button>
                      <button 
                        @click="cancelEditingUsername"
                        class="cancel-btn"
                        :disabled="isSavingUsername"
                        title="取消"
                      >
                        <span class="icon-fallback">✕</span>
                      </button>
                    </div>
                  </div>
                  <div v-if="usernameError" class="username-error">
                    {{ usernameError }}
                  </div>
                  <div class="username-help">
                    按回车保存，按ESC取消
                  </div>
                </div>
              </div>
              
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

          <!-- Avatar Upload Section -->
          <div v-if="showAvatarUpload && isOwnProfile" class="avatar-upload-section">
            <AvatarUpload 
              :user-id="userInfo.id" 
              @avatar-updated="handleAvatarUpdated"
            />
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
              <span class="detail-label">UID</span>
              <span class="detail-value">{{ formatUID(userInfo.id) || "未知" }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">发布话题数</span>
              <span class="detail-value">{{ userStats.postCount || 0 }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">评论数</span>
              <span class="detail-value">{{ userStats.commentCount || 0 }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">注册时间</span>
              <span class="detail-value">{{ formatDate(userInfo.created_at) }}</span>
            </div>

            <!-- 🔥 只有登录用户查看自己信息时显示邮箱 -->
            <div
              class="detail-item"
              v-if="isLoggedIn && user?.id == String(userInfo.id) && userInfo.email"
            >
              <span class="detail-label">邮箱</span>
              <span class="detail-value">{{ userInfo.email }}</span>
            </div>
          </div>

          <!-- 用户简介 -->
          <div class="user-bio-section">
            <h3 class="bio-title">个人简介</h3>
            <div class="bio-content">
              This guy's not lazy, but developer haven't implement it yet XD
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

<!-- Mobile-optimized styles -->
<style lang="scss" scoped>
.user-profile-page {
  min-height: calc(100vh - 140px);
  background-color: #f8f9fa;
  padding: 0.5rem;

  @media (min-width: 768px) {
    padding: 1rem;
  }

  @media (min-width: 1024px) {
    padding: 2rem;
  }
}

.user-profile-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  max-width: 1000px;
  margin: 0 auto;

  @media (min-width: 480px) {
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  @media (min-width: 768px) {
    padding: 2rem;
  }
}

.user-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
  flex-direction: column;
  text-align: center;

  @media (min-width: 480px) {
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    text-align: left;
  }
}

.user-avatar-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;

  @media (min-width: 480px) {
    gap: 1rem;
  }
}

.edit-avatar-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: 2px solid #e0e0e0;
  border-radius: 25px;
  background: white;
  color: #666;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px; // Touch-friendly minimum size
  min-width: 120px;
  justify-content: center;

  @media (min-width: 480px) {
    padding: 0.5rem 1rem;
    min-height: auto;
    min-width: auto;
  }

  &:hover {
    border-color: #3498db;
    color: #3498db;
  }

  &.active {
    background: #3498db;
    border-color: #3498db;
    color: white;
  }

  .icon-fallback {
    font-size: 1rem;
    margin-right: 0.25rem;

    @media (min-width: 480px) {
      font-size: 0.875rem;
    }
  }
}

.avatar-upload-section {
  margin: 1rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #e0e0e0;

  @media (min-width: 480px) {
    margin: 1.5rem 0;
    padding: 1.5rem;
    border-radius: 12px;
  }

  @media (min-width: 768px) {
    margin: 2rem 0;
    padding: 2rem;
  }
}

.user-basic-info {
  flex: 1;
  min-width: 0; // Prevent flex overflow

  .username-section {
    margin-bottom: 0.5rem;

    @media (max-width: 767px) {
      text-align: center;
    }
  }

  .username-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;

    @media (min-width: 480px) {
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      justify-content: flex-start;
    }

    .user-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0;
      word-break: break-word;

      @media (min-width: 480px) {
        font-size: 1.75rem;
      }

      @media (min-width: 768px) {
        font-size: 2rem;
      }
    }

    .edit-username-btn {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 0.75rem;
      border-radius: 50%;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      min-width: 44px; // Touch-friendly minimum size

      @media (min-width: 480px) {
        padding: 0.5rem;
        width: 36px;
        height: 36px;
        min-width: 36px;
      }

      &:hover {
        background: #f0f0f0;
        color: #3498db;
        transform: scale(1.1);
      }

      .icon-fallback {
        font-size: 1.2rem;
        display: inline-block;

        @media (min-width: 480px) {
          font-size: 1rem;
        }
      }
    }
  }

  .username-edit {
    .username-input-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;

      @media (max-width: 479px) {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }

      .username-input {
        font-size: 1.25rem;
        font-weight: 700;
        color: #2c3e50;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 0.75rem;
        background: white;
        transition: border-color 0.2s ease;
        min-width: 200px;
        flex: 1;

        @media (min-width: 480px) {
          font-size: 1.5rem;
          padding: 0.5rem 0.75rem;
        }

        @media (min-width: 768px) {
          font-size: 2rem;
        }

        &:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        &.error {
          border-color: #e74c3c;
        }

        &:disabled {
          background: #f8f9fa;
          color: #999;
          cursor: not-allowed;
        }
      }

      .username-actions {
        display: flex;
        gap: 0.5rem;

        @media (max-width: 479px) {
          justify-content: center;
          width: 100%;
        }

        @media (min-width: 480px) {
          gap: 0.25rem;
        }

        button {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;

          @media (min-width: 480px) {
            width: 36px;
            height: 36px;
            border-radius: 6px;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .icon-fallback {
            font-size: 1.2rem;
            display: inline-block;

            @media (min-width: 480px) {
              font-size: 1rem;
            }
            
            &.spinning {
              animation: spin 1s linear infinite;
            }
          }
        }

        .save-btn {
          background: #27ae60;
          color: white;

          &:hover:not(:disabled) {
            background: #229954;
            transform: scale(1.05);
          }
        }

        .cancel-btn {
          background: #e74c3c;
          color: white;

          &:hover:not(:disabled) {
            background: #c0392b;
            transform: scale(1.05);
          }
        }
      }
    }

    .username-error {
      color: #e74c3c;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }

    .username-help {
      color: #666;
      font-size: 0.75rem;
      font-style: italic;
    }
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
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}

.stat-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  transition: transform 0.2s ease;

  @media (min-width: 480px) {
    padding: 1.25rem;
  }

  @media (min-width: 768px) {
    padding: 1.5rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  .stat-number {
    font-size: 1.25rem;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 0.25rem;

    @media (min-width: 480px) {
      font-size: 1.375rem;
    }

    @media (min-width: 768px) {
      font-size: 1.5rem;
    }
  }

  .stat-text {
    font-size: 0.8rem;
    color: #666;

    @media (min-width: 480px) {
      font-size: 0.875rem;
    }
  }
}

.user-details {
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    margin-bottom: 2rem;
  }
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.875rem 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 1rem;

  @media (min-width: 480px) {
    align-items: center;
    padding: 0.75rem 0;
  }

  &:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-weight: 500;
    color: #666;
    font-size: 0.9rem;
    flex-shrink: 0;

    @media (min-width: 480px) {
      font-size: 1rem;
    }
  }

  .detail-value {
    font-weight: 600;
    color: #2c3e50;
    text-align: right;
    word-break: break-all;
    font-size: 0.9rem;

    @media (min-width: 480px) {
      font-size: 1rem;
      word-break: break-word;
    }
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
