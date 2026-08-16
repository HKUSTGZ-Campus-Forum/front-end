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
const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();
const route = useRoute();
const { t, locale } = useI18n();

interface UserInfo {
  id: number; username: string; email?: string; avatar?: string;
  profile_picture_url?: string; bio?: string; createdAt?: string;
  created_at?: string; role_name?: string; identities?: UserIdentity[];
}
interface UserStats {
  postCount: number; commentCount: number; likesReceived: number; viewCount: number; totalScore: number;
}
interface UserPost {
  id: number;
  title: string;
  content?: string;
  created_at?: string;
  comment_count?: number;
  view_count?: number;
}

const userInfo = ref<UserInfo>({ id: 0, username: "" });
const userStats = ref<UserStats>({ postCount: 0, commentCount: 0, likesReceived: 0, viewCount: 0, totalScore: 0 });
const userPosts = ref<UserPost[]>([]);
const isLoading = ref(false);
const postsLoading = ref(false);
const error = ref("");
const postsError = ref("");
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
      if (response.status === 404) throw new Error(t("userProfile.errors.userNotFound"));
      else if (response.status === 401) {
        if (isLoggedIn.value) {
          const publicResponse = await fetch(getApiUrl(`/api/users/public/${userId}`));
          if (publicResponse.ok) { response = publicResponse; }
          else throw new Error(t("userProfile.errors.loginRequired"));
        } else throw new Error(t("userProfile.errors.loginRequired"));
      } else if (response.status === 403) throw new Error(t("userProfile.errors.forbidden"));
      else throw new Error(t("userProfile.errors.loadUserFailedWithStatus", { status: response.status }));
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
    error.value = err.message || t("userProfile.errors.loadUserFailed");
  } finally { isLoading.value = false; }
};

const retry = () => { fetchUserInfo(); };

const formatDate = (dateString?: string) => {
  if (!dateString) return t("userProfile.states.unknownDate");
  try {
    return new Date(dateString).toLocaleDateString(locale.value === "en" ? "en-US" : "zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return t("userProfile.states.invalidDate");
  }
};

const formatUID = (id: number) => id.toString().padStart(10, '0');

const buildPostExcerpt = (content?: string) => {
  if (!content) return t("userProfile.recentPosts.noContent");
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return t("userProfile.recentPosts.noContent");
  return normalized.length > 90 ? `${normalized.slice(0, 90)}...` : normalized;
};

const fetchUserPosts = async () => {
  if (!userId || userId === "0") return;

  try {
    postsLoading.value = true;
    postsError.value = "";

    const response = await fetchPublic(
      getApiUrl(`/api/posts?user_id=${userId}&limit=10&sort_by=created_at&sort_order=desc`)
    );

    if (!response.ok) {
      throw new Error(t("userProfile.errors.loadPostsFailedWithStatus", { status: response.status }));
    }

    const data = await response.json();
    const posts = Array.isArray(data) ? data : (data.posts || []);
    userPosts.value = posts.map((post: any) => ({
      id: post.id,
      title: post.title || t("userProfile.recentPosts.untitled"),
      content: post.content || "",
      created_at: post.created_at,
      comment_count: post.comment_count || 0,
      view_count: post.view_count || 0,
    }));
  } catch (err: any) {
    postsError.value = err.message || t("userProfile.errors.loadPostsFailed");
    userPosts.value = [];
  } finally {
    postsLoading.value = false;
  }
};

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
  if (!username.trim()) return t("userProfile.validation.usernameRequired");
  if (username.length < 2) return t("userProfile.validation.usernameTooShort");
  if (username.length > 50) return t("userProfile.validation.usernameTooLong");
  if (/[<>"'&/\\|?*:;]/.test(username)) return t("userProfile.validation.usernameInvalidCharacters");
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
      throw new Error(errorData.message || t("userProfile.errors.updateUsernameFailedWithStatus", { status: response.status }));
    }
    const responseData = await response.json();
    const updatedUserData = responseData.user || responseData;
    userInfo.value.username = updatedUserData.username || trimmedUsername;
    if (isOwnProfile.value && user.value) updateLocalUserData({ username: updatedUserData.username || trimmedUsername });
    isEditingUsername.value = false; editedUsername.value = "";
  } catch (err: any) { usernameError.value = err.message || t("userProfile.errors.updateUsernameFailed"); }
  finally { isSavingUsername.value = false; }
};

onMounted(async () => {
  if (userId && userId !== "0") {
    await Promise.all([fetchUserInfo(), fetchUserPosts()]);
  } else {
    error.value = t("userProfile.states.invalidUserId");
  }
});

useHead({
  title: computed(() => t("userProfile.pageTitle", { username: userInfo.value.username || t("common.user") })),
  meta: [{ name: "description", content: computed(() => t("userProfile.metaDescription", { username: userInfo.value.username || t("common.user") })) }],
});
</script>

<template>
  <div class="kg-user-profile">
    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div><span>{{ t("userProfile.states.loading") }}</span>
    </div>

    <div v-else-if="error" class="kg-error-box">
      <p>{{ error }}</p>
      <button class="kg-btn-ghost" @click="retry">{{ t("userProfile.states.retry") }}</button>
    </div>

    <template v-else>
      <div class="kg-card kg-profile-card">
        <div class="kg-profile-top">
          <div class="kg-avatar-section">
            <div class="kg-avatar-wrap" @click="isOwnProfile && (showAvatarUpload = !showAvatarUpload)">
              <UserAvatar
                :avatar-url="userInfo.profile_picture_url"
                :username="userInfo.username"
                :user-id="userInfo.id"
                size="xl"
              />
              <div v-if="isOwnProfile" class="kg-avatar-edit-overlay">{{ t("userProfile.actions.edit") }}</div>
            </div>
          </div>
          <div class="kg-profile-info">
            <div class="kg-username-row">
              <template v-if="isEditingUsername">
                <input v-model="editedUsername" class="kg-username-input" type="text" @keydown.enter="saveUsername" @keydown.escape="cancelEditingUsername" />
                <button class="kg-save-btn" :disabled="isSavingUsername" @click="saveUsername">
                  {{ isSavingUsername ? t("userProfile.actions.saving") : t("userProfile.actions.save") }}
                </button>
                <button class="kg-cancel-btn" @click="cancelEditingUsername">{{ t("actions.cancel") }}</button>
              </template>
              <template v-else>
                <h1 class="kg-username">{{ userInfo.username }}</h1>
                <button v-if="isOwnProfile" class="kg-edit-btn" @click="startEditingUsername">{{ t("userProfile.actions.edit") }}</button>
              </template>
            </div>
            <p v-if="usernameError" class="kg-field-error">{{ usernameError }}</p>
            <div class="kg-profile-badges">
              <span v-if="userInfo.role_name" class="kg-role-badge">{{ userInfo.role_name }}</span>
              <IdentityBadge v-for="identity in approvedIdentities" :key="identity.id" :identity="identity" />
            </div>
            <p class="kg-uid">{{ t("userProfile.uid", { uid: formatUID(userInfo.id) }) }}</p>
            <p class="kg-join-date">{{ t("userProfile.joinDate", { date: formatDate(userInfo.created_at) }) }}</p>
          </div>
        </div>

        <div v-if="userInfo.bio" class="kg-bio">
          <p>{{ userInfo.bio }}</p>
        </div>

        <div v-if="isOwnProfile && showAvatarUpload" class="kg-avatar-upload">
          <AvatarUpload :user-id="String(userInfo.id)" @avatar-updated="handleAvatarUpdated" />
        </div>
      </div>

      <div class="kg-card kg-stats-card">
        <h2 class="kg-section-title">{{ t("userProfile.stats.title") }}</h2>
        <div class="kg-stats-grid">
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.postCount }}</span>
            <span class="kg-stat-label">{{ t("userProfile.stats.posts") }}</span>
          </div>
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.commentCount }}</span>
            <span class="kg-stat-label">{{ t("userProfile.stats.comments") }}</span>
          </div>
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.likesReceived }}</span>
            <span class="kg-stat-label">{{ t("userProfile.stats.likes") }}</span>
          </div>
          <div class="kg-stat-item">
            <span class="kg-stat-num">{{ userStats.viewCount }}</span>
            <span class="kg-stat-label">{{ t("userProfile.stats.views") }}</span>
          </div>
          <div class="kg-stat-item kg-stat-item--highlight">
            <span class="kg-stat-num">{{ userStats.totalScore }}</span>
            <span class="kg-stat-label">{{ t("userProfile.stats.score") }}</span>
          </div>
        </div>
      </div>

      <div class="kg-card kg-posts-card">
        <h2 class="kg-section-title">{{ t("userProfile.recentPosts.title") }}</h2>

        <div v-if="postsLoading" class="kg-posts-state">{{ t("userProfile.recentPosts.loading") }}</div>
        <div v-else-if="postsError" class="kg-posts-state kg-posts-state--error">{{ postsError }}</div>
        <div v-else-if="userPosts.length === 0" class="kg-posts-state">{{ t("userProfile.recentPosts.empty") }}</div>

        <div v-else class="kg-post-list">
          <NuxtLink
            v-for="post in userPosts"
            :key="post.id"
            :to="`/forum/posts/${post.id}`"
            class="kg-post-item"
          >
            <p class="kg-post-title">{{ post.title }}</p>
            <p class="kg-post-excerpt">{{ buildPostExcerpt(post.content) }}</p>
            <div class="kg-post-meta">
              <span>
                <ForumUiIcon name="comment" class="kg-post-meta-icon" />
                {{ post.comment_count || 0 }}
              </span>
              <span>
                <ForumUiIcon name="eye" class="kg-post-meta-icon" />
                {{ post.view_count || 0 }}
              </span>
              <span>{{ formatDate(post.created_at) }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>

    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-user-profile {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px;
  color: var(--text-secondary);
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.kg-error-box { text-align: center; padding: 60px 20px; color: var(--semantic-error); p { margin: 0 0 16px; } }

.kg-card {
  background: var(--surface-primary);
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
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
  background: var(--modal-backdrop);
  color: var(--text-inverse);
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
  color: var(--text-primary);
  margin: 0;
}

.kg-username-input {
  padding: 6px 12px;
  border: 1.5px solid var(--border-focus);
  border-radius: 10px;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--surface-primary);
  outline: none;
  width: 200px;
}

.kg-save-btn {
  padding: 6px 14px;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
  border: none;
  border-radius: 10px;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
}

.kg-cancel-btn, .kg-edit-btn {
  padding: 5px 12px;
  border: 1.5px solid var(--border-primary);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.83rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: var(--interactive-primary); color: var(--interactive-primary); }
}

.kg-field-error { color: var(--semantic-error); font-size: 0.82rem; margin: 0 0 6px; }

.kg-profile-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.kg-role-badge {
  padding: 2px 10px;
  background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 38%, var(--border-primary));
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--interactive-active);
  font-weight: 600;
}

.kg-uid {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 4px;
  font-family: monospace;
}

.kg-join-date { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

.kg-bio {
  border-top: 1px solid var(--border-secondary);
  padding-top: 14px;
  margin-top: 14px;
  p { margin: 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; }
}

.kg-avatar-upload {
  border-top: 1px solid var(--border-secondary);
  padding-top: 16px;
  margin-top: 16px;
}

.kg-section-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 16px; }

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
  background: var(--surface-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-secondary);
  &--highlight {
    background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--interactive-primary) 28%, var(--border-primary));
  }
}

.kg-stat-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
}

.kg-stat-label { font-size: 0.75rem; color: var(--text-secondary); }

.kg-post-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kg-post-item {
  display: block;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-secondary);
  background: var(--surface-secondary);
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    border-color: var(--interactive-primary);
    background: color-mix(in srgb, var(--interactive-primary) 5%, var(--surface-primary));
  }
}

.kg-post-title {
  margin: 0 0 6px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.kg-post-excerpt {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.kg-post-meta {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  font-size: 0.76rem;
  color: var(--text-secondary);

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.kg-post-meta-icon {
  width: 14px;
  height: 14px;
  color: currentColor;
}

.kg-posts-state {
  padding: 16px 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.kg-posts-state--error {
  color: var(--semantic-error);
}

.kg-btn-ghost {
  padding: 8px 24px;
  border: 1.5px solid var(--border-primary);
  border-radius: 14px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  &:hover { background: var(--surface-secondary); border-color: var(--interactive-primary); color: var(--interactive-primary); }
}
</style>
