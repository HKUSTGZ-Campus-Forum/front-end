<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import UserAvatar from "~/components/user/UserAvatar.vue";
import AvatarUpload from "~/components/user/AvatarUpload.vue";
import IdentityBadge from "~/components/identity/IdentityBadge.vue";
import type { UserIdentity } from "~/types/identity";

definePageMeta({ layout: 'keguang' });

const { isLoggedIn, user, updateLocalUserData } = useAuth();
const { fetchWithAuth, getApiUrl } = useApi();
const route = useRoute();

interface UserInfo {
  id: number; username: string; email?: string; avatar?: string;
  profile_picture_url?: string; bio?: string; createdAt?: string;
  created_at?: string; role_name?: string; identities?: UserIdentity[];
}
interface UserStats {
  postCount: number; commentCount: number; likesReceived: number; viewCount: number; totalScore: number;
}

const userInfo = ref<UserInfo>({ id: 0, username: "" });
const userStats = ref<UserStats>({ postCount: 0, commentCount: 0, likesReceived: 0, viewCount: 0, totalScore: 0 });
const isLoading = ref(false);
const error = ref("");
const showAvatarUpload = ref(false);

const isEditingUsername = ref(false);
const editedUsername = ref("");
const usernameError = ref("");
const isSavingUsername = ref(false);

const userId = route.params.id;

const isOwnProfile = computed(() => isLoggedIn.value && user.value && String(user.value.id) === String(userId));
const approvedIdentities = computed(() => userInfo.value.identities?.filter(identity => identity.status === 'approved') || []);

const fetchUserInfo = async () => {
  try {
    isLoading.value = true; error.value = "";
    let response: Response;
    let statsResponse: Response;
    if (isLoggedIn.value) {
      [response, statsResponse] = await Promise.all([
        fetchWithAuth(getApiUrl(`/api/users/${userId}`)),
        fetchWithAuth(getApiUrl(`/api/users/${userId}/stats`))
      ]);
    } else {
      [response, statsResponse] = await Promise.all([
        fetch(getApiUrl(`/api/users/public/${userId}`)),
        fetch(getApiUrl(`/api/users/${userId}/stats`))
      ]);
    }
    if (!response.ok) {
      if (response.status === 404) throw new Error("用户不存在");
      else if (response.status === 401) {
        if (isLoggedIn.value) {
          const publicResponse = await fetch(getApiUrl(`/api/users/public/${userId}`));
          if (publicResponse.ok) { response = publicResponse; }
          else throw new Error("需要登录才能查看此用户信息");
        } else throw new Error("需要登录才能查看此用户信息");
      } else if (response.status === 403) throw new Error("没有权限查看此用户信息");
      else throw new Error(`获取用户信息失败 (${response.status})`);
    }
    const data = await response.json();
    const statsData = statsResponse.ok ? await statsResponse.json() : null;
    userInfo.value = {
      id: data.id, username: data.username, email: data.email,
      avatar: data.profile_picture_url, profile_picture_url: data.profile_picture_url,
      bio: data.bio, createdAt: data.created_at, created_at: data.created_at,
      role_name: data.role_name, identities: data.identities || [],
    };
    if (statsData) {
      userStats.value = {
        postCount: statsData.post_count || 0, commentCount: statsData.comment_count || 0,
        likesReceived: statsData.likes_received || 0, viewCount: statsData.view_count || 0,
        totalScore: statsData.total_score || 0,
      };
    }
  } catch (err: any) {
    error.value = err.message || "获取用户信息失败";
  } finally { isLoading.value = false; }
};

const retry = () => { fetchUserInfo(); };

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNjAiIGZpbGw9IiNmMGYwZjAiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ1IiByPSIyMCIgZmlsbD0iI2QwZDBkMCIvPjxwYXRoIGQ9Ik0yMCAxMDBjMC0yMiAxOC00MCA0MC00MHM0MCAxOCA0MCA0MCIgZmlsbD0iI2QwZDBkMCIvPjwvc3ZnPg==";
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "未知";
  try { return new Date(dateString).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }); }
  catch { return "日期格式错误"; }
};

const formatUID = (id: number) => id.toString().padStart(10, '0');

const handleAvatarUpdated = (newAvatarUrl: string) => {
  userInfo.value.profile_picture_url = newAvatarUrl;
  showAvatarUpload.value = false;
};

const startEditingUsername = () => {
  isEditingUsername.value = true;
  editedUsername.value = userInfo.value.username;
  usernameError.value = "";
};

const cancelEditingUsername = () => { isEditingUsername.value = false; editedUsername.value = ""; usernameError.value = ""; };

const validateUsername = (username: string): string | null => {
  if (!username.trim()) return "用户名不能为空";
  if (username.length < 2) return "用户名至少需要2个字符";
  if (username.length > 50) return "用户名不能超过50个字符";
  if (/[<>"'&/\\|?*:;]/.test(username)) return "用户名不能包含特殊符号";
  return null;
};

const saveUsername = async () => {
  const trimmedUsername = editedUsername.value.trim();
  const validationError = validateUsername(trimmedUsername);
  if (validationError) { usernameError.value = validationError; return; }
  if (trimmedUsername === userInfo.value.username) { cancelEditingUsername(); return; }
  try {
    isSavingUsername.value = true; usernameError.value = "";
    const response = await fetchWithAuth(getApiUrl(`/api/users/${userInfo.value.id}`), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedUsername })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `更新失败 (${response.status})`);
    }
    const responseData = await response.json();
    const updatedUserData = responseData.user || responseData;
    userInfo.value.username = updatedUserData.username || trimmedUsername;
    if (isOwnProfile.value && user.value) updateLocalUserData({ username: updatedUserData.username || trimmedUsername });
    isEditingUsername.value = false; editedUsername.value = "";
  } catch (err: any) { usernameError.value = err.message || '更新用户名失败，请稍后重试'; }
  finally { isSavingUsername.value = false; }
};

onMounted(() => {
  if (userId && userId !== "0") fetchUserInfo();
  else error.value = "无效的用户ID";
});

useHead({
  title: computed(() => `${userInfo.value.username || "用户"} - 个人信息`),
  meta: [{ name: "description", content: computed(() => `查看 ${userInfo.value.username || "用户"} 的个人信息和统计数据`) }],
});
</script>

<template>
  <div class="kg-user-profile">
    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div><span>加载中...</span>
    </div>

    <div v-else-if="error" class="kg-error-box">
      <p>{{ error }}</p>
      <button class="kg-btn-ghost" @click="retry">重试</button>
    </div>

    <template v-else>
      <!-- 用户卡片 -->
      <div class="kg-card kg-profile-card">
        <div class="kg-profile-top">
          <div class="kg-avatar-section">
            <div class="kg-avatar-wrap" @click="isOwnProfile && (showAvatarUpload = !showAvatarUpload)">
              <UserAvatar
                :user="{ id: userInfo.id, username: userInfo.username, profile_picture_url: userInfo.profile_picture_url }"
                :size="80"
              />
              <div v-if="isOwnProfile" class="kg-avatar-edit-overlay">编辑</div>
            </div>
          </div>
          <div class="kg-profile-info">
            <div class="kg-username-row">
              <template v-if="isEditingUsername">
                <input v-model="editedUsername" class="kg-username-input" type="text" @keydown.enter="saveUsername" @keydown.escape="cancelEditingUsername" />
                <button class="kg-save-btn" :disabled="isSavingUsername" @click="saveUsername">{{ isSavingUsername ? '保存...' : '保存' }}</button>
                <button class="kg-cancel-btn" @click="cancelEditingUsername">取消</button>
              </template>
              <template v-else>
                <h1 class="kg-username">{{ userInfo.username }}</h1>
                <button v-if="isOwnProfile" class="kg-edit-btn" @click="startEditingUsername">编辑</button>
              </template>
            </div>
            <p v-if="usernameError" class="kg-field-error">{{ usernameError }}</p>
            <div class="kg-profile-badges">
              <span v-if="userInfo.role_name" class="kg-role-badge">{{ userInfo.role_name }}</span>
              <IdentityBadge v-for="identity in approvedIdentities" :key="identity.id" :identity="identity" />
            </div>
            <p class="kg-uid">UID: {{ formatUID(userInfo.id) }}</p>
            <p class="kg-join-date">加入时间：{{ formatDate(userInfo.created_at) }}</p>
          </div>
        </div>

        <div v-if="userInfo.bio" class="kg-bio">
          <p>{{ userInfo.bio }}</p>
        </div>

        <!-- 头像上传 -->
        <div v-if="isOwnProfile && showAvatarUpload" class="kg-avatar-upload">
          <AvatarUpload :user-id="String(userInfo.id)" @avatar-updated="handleAvatarUpdated" />
        </div>
      </div>

      <!-- 统计数据 -->
      <div class="kg-card kg-stats-card">
        <h2 class="kg-section-title">数据统计</h2>
        <div class="kg-stats-grid">
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.postCount }}</span>
            <span class="kg-stat-label">发帖数</span>
          </div>
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.commentCount }}</span>
            <span class="kg-stat-label">评论数</span>
          </div>
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.likesReceived }}</span>
            <span class="kg-stat-label">获赞数</span>
          </div>
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.viewCount }}</span>
            <span class="kg-stat-label">被浏览数</span>
          </div>
          <div class="kg-stat-item kg-stat-item--highlight">
            <span class="kg-stat-num">{{ userStats.totalScore }}</span>
            <span class="kg-stat-label">积分</span>
          </div>
        </div>
      </div>

      <!-- 身份管理入口 -->
      <div v-if="isOwnProfile" class="kg-card kg-quick-links">
        <h2 class="kg-section-title">账号管理</h2>
        <div class="kg-link-list">
          <NuxtLink to="/setting/account" class="kg-link-item">
            <span class="kg-link-icon">⚙️</span>
            <span>账号设置</span>
            <span class="kg-link-arrow">→</span>
          </NuxtLink>
          <NuxtLink to="/setting/identity" class="kg-link-item">
            <span class="kg-link-icon">🎓</span>
            <span>身份认证</span>
            <span class="kg-link-arrow">→</span>
          </NuxtLink>
          <NuxtLink to="/setting/theme" class="kg-link-item">
            <span class="kg-link-icon">🎨</span>
            <span>主题设置</span>
            <span class="kg-link-arrow">→</span>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-user-profile {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px;
  color: #4a6080;
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.kg-error-box { text-align: center; padding: 60px 20px; color: #e05a5a; p { margin: 0 0 16px; } }

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
  padding: 24px 28px;
  margin-bottom: 16px;
}

.kg-profile-top {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.kg-avatar-section { flex-shrink: 0; }

.kg-avatar-wrap {
  position: relative;
  display: inline-block;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}

.kg-avatar-edit-overlay {
  position: absolute;
  inset: 0;
  background: rgba(40, 57, 101, 0.5);
  color: #fff;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
  .kg-avatar-wrap:hover & { opacity: 1; }
}

.kg-profile-info { flex: 1; min-width: 0; }

.kg-username-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.kg-username {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0;
}

.kg-username-input {
  padding: 6px 12px;
  border: 1.5px solid #26a4ff;
  border-radius: 10px;
  font-size: 1.2rem;
  font-weight: 600;
  color: #1a2a4a;
  background: #fff;
  outline: none;
  width: 200px;
}

.kg-save-btn {
  padding: 6px 14px;
  background: #26a4ff;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
}

.kg-cancel-btn, .kg-edit-btn {
  padding: 5px 12px;
  border: 1.5px solid #c8dff8;
  border-radius: 10px;
  background: transparent;
  color: #4a6080;
  font-size: 0.83rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; color: #26a4ff; }
}

.kg-field-error { color: #e05a5a; font-size: 0.82rem; margin: 0 0 6px; }

.kg-profile-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.kg-role-badge {
  padding: 2px 10px;
  background: rgba(158, 170, 244, 0.15);
  border: 1px solid #9EAAF4;
  border-radius: 10px;
  font-size: 0.75rem;
  color: #7b8ce8;
  font-weight: 600;
}

.kg-uid {
  font-size: 0.8rem;
  color: #9ab0c6;
  margin: 0 0 4px;
  font-family: monospace;
}

.kg-join-date { font-size: 0.8rem; color: #9ab0c6; margin: 0; }

.kg-bio {
  border-top: 1px solid #e8f4fd;
  padding-top: 14px;
  margin-top: 14px;
  p { margin: 0; font-size: 0.9rem; color: #4a6080; line-height: 1.6; }
}

.kg-avatar-upload {
  border-top: 1px solid #e8f4fd;
  padding-top: 16px;
  margin-top: 16px;
}

.kg-section-title { font-size: 1rem; font-weight: 700; color: #1a2a4a; margin: 0 0 16px; }

.kg-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.kg-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px;
  background: rgba(40, 57, 101, 0.03);
  border-radius: 12px;
  border: 1px solid #e8f4fd;
  &--highlight { background: rgba(38, 164, 255, 0.06); border-color: rgba(38, 164, 255, 0.2); }
}

.kg-stat-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1a2a4a;
}

.kg-stat-label { font-size: 0.75rem; color: #6a85a0; }

.kg-link-list { display: flex; flex-direction: column; gap: 8px; }

.kg-link-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(40, 57, 101, 0.03);
  border: 1px solid #e8f4fd;
  border-radius: 12px;
  text-decoration: none;
  color: #1a2a4a;
  font-size: 0.9rem;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; background: rgba(38, 164, 255, 0.04); }
}

.kg-link-icon { font-size: 1.2rem; }
.kg-link-arrow { margin-left: auto; color: #9ab0c6; }

.kg-btn-ghost {
  padding: 8px 24px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: transparent;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.9rem;
  &:hover { background: #F5FBFE; border-color: #26a4ff; color: #26a4ff; }
}
</style>
