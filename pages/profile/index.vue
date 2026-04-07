<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UserAvatar from '~/components/user/UserAvatar.vue'

definePageMeta({
  layout: 'keguang',
  middleware: 'auth',
})

useHead({
  title: '个人中心 - UniKorn Campus',
})

const { t } = useI18n()
const { user, isLoggedIn, logout } = useAuth()
const { fetchWithAuth, fetchPublic, getApiUrl } = useApi()

const activeTab = ref('posts')
const stats = ref({ post_count: 0, comment_count: 0, likes_received: 0, view_count: 0, total_score: 0 })
const posts = ref<any[]>([])
const loading = ref(true)
const postsLoading = ref(false)

const tabs = [
  { key: 'posts', label: '我的帖子', icon: '📝' },
  { key: 'comments', label: '我的评论', icon: '💬' },
  { key: 'settings', label: '账号设置', icon: '⚙️' },
]

const roleBadge = computed(() => {
  if (!user.value) return ''
  const name = (user.value as any).role_name
  if (name === 'admin') return '管理员'
  if (name === 'moderator') return '版主'
  return '用户'
})

const joinDate = computed(() => {
  if (!user.value) return ''
  const d = (user.value as any).created_at
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
})

async function fetchStats() {
  if (!user.value) return
  try {
    const res = await fetchPublic(getApiUrl(`/api/users/${user.value.id}/stats`))
    if (res.ok) {
      stats.value = await res.json()
    }
  } catch (e) {
    console.warn('Failed to fetch user stats:', e)
  }
}

async function fetchPosts() {
  if (!user.value) return
  postsLoading.value = true
  try {
    const res = await fetchPublic(getApiUrl(`/api/posts?user_id=${user.value.id}&limit=20`))
    if (res.ok) {
      const data = await res.json()
      posts.value = data.posts || data || []
    }
  } catch (e) {
    console.warn('Failed to fetch user posts:', e)
  } finally {
    postsLoading.value = false
  }
}

function switchTab(key: string) {
  activeTab.value = key
  if (key === 'settings') {
    navigateTo('/setting/account')
  }
}

function handleLogout() {
  logout()
  navigateTo('/')
}

onMounted(async () => {
  loading.value = true
  await Promise.all([fetchStats(), fetchPosts()])
  loading.value = false
})
</script>

<template>
  <div class="profile-page">
    <!-- Cover Banner -->
    <div class="profile-cover">
      <div class="cover-gradient"></div>
      <div class="cover-pattern"></div>
    </div>

    <!-- Profile Header Card -->
    <div class="profile-header">
      <div class="profile-header__inner">
        <div class="profile-avatar-wrapper">
          <UserAvatar
            v-if="user"
            :avatar-url="(user as any).profile_picture_url"
            :username="user.username"
            :user-id="user.id"
            size="xl"
            class="profile-avatar"
          />
          <div v-else class="profile-avatar-placeholder"></div>
        </div>

        <div class="profile-info">
          <div class="profile-info__top">
            <h1 class="profile-name">{{ user?.username || '用户' }}</h1>
            <span v-if="roleBadge" class="profile-role-badge">{{ roleBadge }}</span>
          </div>
          <p class="profile-meta">
            <span v-if="joinDate" class="meta-item">📅 加入于 {{ joinDate }}</span>
            <span v-if="(user as any)?.email" class="meta-item">✉️ {{ (user as any).email }}</span>
          </p>
        </div>

        <div class="profile-actions">
          <NuxtLink to="/setting/account" class="btn-edit">编辑资料</NuxtLink>
          <button class="btn-logout" @click="handleLogout">退出登录</button>
        </div>
      </div>

      <!-- Stats Strip -->
      <div class="profile-stats">
        <div class="stat-item">
          <span class="stat-value">{{ stats.post_count }}</span>
          <span class="stat-label">帖子</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.comment_count }}</span>
          <span class="stat-label">评论</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.likes_received }}</span>
          <span class="stat-label">获赞</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.view_count }}</span>
          <span class="stat-label">浏览量</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.total_score }}</span>
          <span class="stat-label">积分</span>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="profile-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-text">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="profile-content">
      <!-- Posts Tab -->
      <div v-if="activeTab === 'posts'" class="tab-panel">
        <div v-if="postsLoading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="posts.length === 0" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>还没有发布过帖子</p>
          <NuxtLink to="/" class="btn-primary-sm">去发帖</NuxtLink>
        </div>
        <div v-else class="posts-list">
          <NuxtLink
            v-for="post in posts"
            :key="post.id"
            :to="`/posts/${post.id}`"
            class="post-card"
          >
            <h3 class="post-title">{{ post.title || '无标题' }}</h3>
            <p class="post-excerpt">{{ post.content?.substring(0, 120) || '' }}{{ (post.content?.length || 0) > 120 ? '...' : '' }}</p>
            <div class="post-meta">
              <span>👁️ {{ post.view_count || 0 }}</span>
              <span>💬 {{ post.comment_count || 0 }}</span>
              <span>❤️ {{ post.reaction_count || post.likes || 0 }}</span>
              <span class="post-date">{{ new Date(post.created_at).toLocaleDateString('zh-CN') }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Comments Tab -->
      <div v-if="activeTab === 'comments'" class="tab-panel">
        <div class="empty-state">
          <span class="empty-icon">💬</span>
          <p>评论功能开发中</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 0 16px 60px;
}

/* ── Cover Banner ── */
.profile-cover {
  position: relative;
  height: 200px;
  border-radius: 0 0 24px 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #1a73e8 0%, #4fc3f7 40%, #81d4fa 70%, #e1f5fe 100%);
}

.cover-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(245, 251, 253, 0.6) 100%);
}

.cover-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.08;
  background-image: radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px),
                     radial-gradient(circle at 80% 20%, #fff 1.5px, transparent 1.5px),
                     radial-gradient(circle at 50% 50%, #fff 1px, transparent 1px);
  background-size: 60px 60px, 80px 80px, 40px 40px;
}

/* ── Profile Header ── */
.profile-header {
  position: relative;
  margin-top: -48px;
  background: #f5fbfe;
  border: 1.5px solid #c8dff8;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(40, 57, 101, 0.08);
  padding: 0 28px 0;
  z-index: 2;
}

.profile-header__inner {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  padding-top: 0;
  padding-bottom: 20px;
  flex-wrap: wrap;
}

.profile-avatar-wrapper {
  margin-top: -40px;
  flex-shrink: 0;
}

.profile-avatar {
  width: 96px !important;
  height: 96px !important;
  border: 4px solid #fff;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(26, 115, 232, 0.18);

  :deep(.avatar-image),
  :deep(.avatar-placeholder) {
    width: 96px !important;
    height: 96px !important;
    font-size: 32px !important;
  }
}

.profile-avatar-placeholder {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #c8dff8;
  border: 4px solid #fff;
}

.profile-info {
  flex: 1;
  min-width: 0;
  padding-bottom: 4px;
}

.profile-info__top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0;
  line-height: 1.3;
}

.profile-role-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  background: linear-gradient(135deg, #1a73e8, #4fc3f7);
  color: #fff;
  padding: 2px 10px;
  border-radius: 12px;
  line-height: 1.6;
}

.profile-meta {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: #5a7a9a;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.profile-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  padding-bottom: 4px;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  padding: 6px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1a73e8;
  background: #e8f0fe;
  border: 1.5px solid #c8dff8;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: #d0e3ff;
    border-color: #1a73e8;
  }
}

.btn-logout {
  display: inline-flex;
  align-items: center;
  padding: 6px 18px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #e53e3e;
  background: #fff5f5;
  border: 1.5px solid #fed7d7;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fee2e2;
    border-color: #e53e3e;
  }
}

/* ── Stats Strip ── */
.profile-stats {
  display: flex;
  justify-content: space-around;
  border-top: 1px solid #e2edf8;
  padding: 16px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1a2a4a;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b8aaa;
}

/* ── Tabs ── */
.profile-tabs {
  display: flex;
  gap: 4px;
  margin-top: 20px;
  background: #f5fbfe;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #5a7a9a;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #1a73e8;
    background: rgba(26, 115, 232, 0.06);
  }

  &.active {
    color: #1a73e8;
    background: #fff;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(26, 115, 232, 0.1);
  }
}

.tab-icon {
  font-size: 1rem;
}

/* ── Tab Content ── */
.profile-content {
  margin-top: 16px;
}

.tab-panel {
  min-height: 200px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #6b8aaa;

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #c8dff8;
    border-top-color: #1a73e8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p { margin: 12px 0 0; font-size: 0.9rem; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #6b8aaa;

  .empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
  p { margin: 0 0 16px; font-size: 0.95rem; }
}

.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  padding: 6px 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #1a73e8, #4fc3f7);
  border-radius: 20px;
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover { opacity: 0.88; }
}

/* ── Posts List ── */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-card {
  display: block;
  background: #f5fbfe;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  padding: 18px 22px;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    border-color: #1a73e8;
    box-shadow: 0 2px 12px rgba(26, 115, 232, 0.1);
    transform: translateY(-1px);
  }
}

.post-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1a2a4a;
  margin: 0 0 6px;
  line-height: 1.4;
}

.post-excerpt {
  font-size: 0.85rem;
  color: #5a7a9a;
  margin: 0 0 10px;
  line-height: 1.5;
}

.post-meta {
  display: flex;
  gap: 14px;
  font-size: 0.78rem;
  color: #8a9fba;

  .post-date { margin-left: auto; }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .profile-cover { height: 140px; }

  .profile-header { margin-top: -36px; padding: 0 16px; }

  .profile-header__inner {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }

  .profile-avatar-wrapper { margin-top: -36px; }

  .profile-avatar {
    width: 80px !important;
    height: 80px !important;

    :deep(.avatar-image),
    :deep(.avatar-placeholder) {
      width: 80px !important;
      height: 80px !important;
      font-size: 28px !important;
    }
  }

  .profile-info__top { justify-content: center; }
  .profile-meta { justify-content: center; }
  .profile-actions { justify-content: center; }

  .profile-stats { padding: 12px 0; }

  .tab-btn {
    padding: 8px 10px;
    font-size: 0.82rem;
  }

  .post-card { padding: 14px 16px; }
}
</style>
