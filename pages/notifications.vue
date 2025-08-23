<template>
  <div class="notifications-page">
    <!-- Header with navigation -->
    <div class="page-nav-header">
      <div class="nav-content">
        <button @click="goBack" class="back-btn" title="返回">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="m19 12H5"/>
          </svg>
          <span>返回论坛</span>
        </button>
        
        <div class="breadcrumb">
          <NuxtLink to="/forum" class="breadcrumb-item">论坛</NuxtLink>
          <span class="breadcrumb-separator">></span>
          <span class="breadcrumb-current">通知中心</span>
        </div>
      </div>
    </div>
    
    <!-- Main content container -->
    <div class="main-container">
      <div class="page-header">
        <div class="header-title">
          <h1>🔔 通知中心</h1>
          <p class="header-subtitle">管理您的所有通知消息</p>
        </div>
        <div class="header-actions">
          <button 
            v-if="hasUnread" 
            @click="handleMarkAllRead" 
            class="mark-all-read-btn"
            :disabled="markingAllRead"
          >
            {{ markingAllRead ? '标记中...' : '全部已读' }}
          </button>
        </div>
      </div>
    
    <!-- Filter tabs -->
    <div class="filter-tabs">
      <button 
        class="filter-tab" 
        :class="{ active: currentFilter === 'all' }"
        @click="setFilter('all')"
      >
        全部通知 ({{ totalCount }})
      </button>
      <button 
        class="filter-tab" 
        :class="{ active: currentFilter === 'unread' }"
        @click="setFilter('unread')"
      >
        未读通知 ({{ unreadCount }})
      </button>
    </div>
    
    <!-- Content -->
    <div class="notifications-content">
      <!-- Loading state -->
      <div v-if="loading && notifications.length === 0" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      
      <!-- Error state -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="loadNotifications" class="retry-btn">重试</button>
      </div>
      
      <!-- Empty state -->
      <div v-else-if="notifications.length === 0" class="empty-state">
        <div class="empty-icon">🔔</div>
        <h3>{{ currentFilter === 'unread' ? '没有未读通知' : '暂无通知' }}</h3>
        <p>{{ currentFilter === 'unread' ? '所有通知都已阅读' : '当前没有任何通知' }}</p>
      </div>
      
      <!-- Notifications list -->
      <div v-else class="notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-card"
          :class="{ 'unread': !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <!-- Avatar and content -->
          <div class="notification-main">
            <div class="notification-avatar">
              <UserAvatar 
                :avatar-url="notification.sender?.avatar_url"
                :username="notification.sender?.username || '用户'"
                :user-id="notification.sender?.id"
                :size="'lg'"
              />
            </div>
            
            <div class="notification-content">
              <div class="notification-header">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-time">{{ formatNotificationTime(notification.created_at) }}</div>
              </div>
              
              <div class="notification-message">{{ notification.message }}</div>
              
              <!-- Additional context -->
              <div v-if="notification.post || notification.comment" class="notification-context">
                <span v-if="notification.post" class="context-item">
                  📝 {{ notification.post.title }}
                </span>
                <span v-if="notification.comment" class="context-item">
                  💬 {{ notification.comment.content }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="notification-actions">
            <button 
              v-if="!notification.read" 
              @click.stop="handleMarkAsRead(notification.id)"
              class="mark-read-btn"
              title="标记为已读"
            >
              ✓
            </button>
            <button 
              @click.stop="handleDelete(notification.id)"
              class="delete-btn"
              title="删除通知"
            >
              🗑️
            </button>
          </div>
          
          <!-- Unread indicator -->
          <div v-if="!notification.read" class="unread-indicator"></div>
        </div>
      </div>
      
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="previousPage" 
          :disabled="currentPage <= 1"
          class="page-btn"
        >
          上一页
        </button>
        
        <span class="page-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        
        <button 
          @click="nextPage" 
          :disabled="currentPage >= totalPages"
          class="page-btn"
        >
          下一页
        </button>
      </div>
      
      <!-- Load more loading -->
      <div v-if="loading && notifications.length > 0" class="load-more-loading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    </div>
    </div> <!-- Close main-container -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import { useRouter } from 'vue-router'

// SEO
useHead({
  title: '通知中心 - 校园论坛'
})

const { 
  notifications, 
  unreadCount, 
  loading, 
  error,
  hasUnread,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationUrl,
  formatNotificationTime 
} = useNotifications()

const router = useRouter()

// Navigation
const goBack = () => {
  // Try to go back in history first, fallback to forum
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/forum')
  }
}

// Component state
const currentFilter = ref<'all' | 'unread'>('all')
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const markingAllRead = ref(false)

// Methods
const setFilter = (filter: 'all' | 'unread') => {
  currentFilter.value = filter
  currentPage.value = 1
  loadNotifications()
}

const loadNotifications = async () => {
  try {
    const result = await fetchNotifications(
      currentPage.value, 
      20, 
      currentFilter.value === 'unread'
    )
    totalPages.value = result.total_pages
    totalCount.value = result.total_count
  } catch (err) {
    console.error('Failed to load notifications:', err)
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    loadNotifications()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadNotifications()
  }
}

const handleMarkAllRead = async () => {
  if (markingAllRead.value) return
  
  markingAllRead.value = true
  try {
    await markAllAsRead()
    // Reload if viewing unread filter
    if (currentFilter.value === 'unread') {
      await loadNotifications()
    }
  } catch (err) {
    console.error('Failed to mark all as read:', err)
  } finally {
    markingAllRead.value = false
  }
}

const handleMarkAsRead = async (notificationId: number) => {
  try {
    await markAsRead(notificationId)
    // Reload if viewing unread filter
    if (currentFilter.value === 'unread') {
      await loadNotifications()
    }
  } catch (err) {
    console.error('Failed to mark notification as read:', err)
  }
}

const handleDelete = async (notificationId: number) => {
  if (!confirm('确定要删除这条通知吗？')) return
  
  try {
    await deleteNotification(notificationId)
    await loadNotifications() // Reload list
  } catch (err) {
    console.error('Failed to delete notification:', err)
  }
}

const handleNotificationClick = async (notification: any) => {
  // Mark as read if not already read
  if (!notification.read) {
    try {
      await markAsRead(notification.id)
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }
  
  // Navigate to related content
  const url = getNotificationUrl(notification)
  router.push(url)
}

// Lifecycle
onMounted(() => {
  loadNotifications()
})

// Watch for page changes
watch(currentPage, () => {
  loadNotifications()
})
</script>

<style scoped lang="scss">
.notifications-page {
  min-height: 100vh;
  background: var(--bg-primary);
}

/* Navigation header */
.page-nav-header {
  background: var(--surface-primary);
  border-bottom: 1px solid var(--border-primary);
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-small);
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--surface-secondary);
    border-color: var(--interactive-primary);
    color: var(--interactive-primary);
  }
  
  svg {
    flex-shrink: 0;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-item {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
  
  &:hover {
    color: var(--interactive-primary);
  }
}

.breadcrumb-separator {
  color: var(--text-muted);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

/* Main content */
.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
  
  .header-title {
    h1 {
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .header-subtitle {
      margin: 0;
      font-size: 16px;
      color: var(--text-secondary);
      font-weight: 400;
    }
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.mark-all-read-btn {
  padding: 12px 20px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: var(--interactive-hover);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.filter-tabs {
  display: flex;
  gap: 2px;
  background: var(--surface-secondary);
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 32px;
  box-shadow: var(--shadow-small);
}

.filter-tab {
  flex: 1;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text-primary);
    background: var(--surface-primary);
  }
  
  &.active {
    background: var(--surface-primary);
    color: var(--interactive-primary);
    box-shadow: var(--shadow-small);
    font-weight: 600;
  }
}

.notifications-content {
  min-height: 400px;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-primary);
  border-top: 3px solid var(--interactive-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  color: var(--semantic-error);
  
  .error-icon {
    font-size: 56px;
    margin-bottom: 20px;
  }
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: var(--text-primary);
  }
  
  p {
    margin: 0 0 20px 0;
    color: var(--text-secondary);
    font-size: 16px;
  }
}

.empty-state {
  color: var(--text-secondary);
  
  .empty-icon {
    font-size: 56px;
    margin-bottom: 20px;
    opacity: 0.6;
  }
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: var(--text-primary);
  }
  
  p {
    margin: 0;
    font-size: 16px;
  }
}

.retry-btn {
  padding: 10px 20px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s ease;
  
  &:hover {
    background: var(--interactive-hover);
  }
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-card {
  display: flex;
  align-items: flex-start;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  box-shadow: var(--shadow-small);
  
  &:hover {
    border-color: var(--interactive-primary);
    box-shadow: var(--shadow-medium);
    transform: translateY(-1px);
  }
  
  &.unread {
    border-left: 4px solid var(--interactive-primary);
    background: var(--surface-elevated);
    
    &::before {
      content: '';
      position: absolute;
      top: 24px;
      right: 24px;
      width: 8px;
      height: 8px;
      background: var(--interactive-primary);
      border-radius: 50%;
    }
  }
}

.notification-main {
  display: flex;
  gap: 20px;
  flex: 1;
  min-width: 0;
}

.notification-avatar {
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.notification-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
}

.notification-time {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  padding: 2px 8px;
  background: var(--surface-secondary);
  border-radius: 12px;
}

.notification-message {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.notification-context {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.context-item {
  font-size: 14px;
  color: var(--text-muted);
  background: var(--surface-secondary);
  padding: 6px 12px;
  border-radius: 8px;
  display: inline-block;
  max-width: fit-content;
  border-left: 3px solid var(--interactive-primary);
}

.notification-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
  align-self: flex-start;
}

.mark-read-btn, .delete-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.mark-read-btn {
  background: var(--semantic-success);
  color: var(--text-inverse);
  
  &:hover {
    background: var(--semantic-success);
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.delete-btn {
  background: var(--surface-secondary);
  color: var(--text-secondary);
  
  &:hover {
    background: var(--semantic-error);
    color: var(--text-inverse);
    transform: scale(1.05);
  }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
  padding: 24px 0;
}

.page-btn {
  padding: 10px 20px;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    border-color: var(--interactive-primary);
    color: var(--interactive-primary);
    background: var(--surface-secondary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.load-more-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--text-secondary);
  
  .loading-spinner {
    width: 20px;
    height: 20px;
    margin-bottom: 0;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .nav-content {
    padding: 0 16px;
  }
  
  .back-btn span {
    display: none;
  }
  
  .breadcrumb {
    font-size: 13px;
  }
  
  .main-container {
    padding: 20px 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    
    .header-title h1 {
      font-size: 24px;
    }
  }
  
  .filter-tabs {
    margin-bottom: 24px;
  }
  
  .filter-tab {
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .notification-card {
    padding: 16px;
    border-radius: 12px;
    
    &.unread::before {
      top: 16px;
      right: 16px;
    }
  }
  
  .notification-main {
    gap: 12px;
  }
  
  .notification-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .notification-title {
    font-size: 16px;
  }
  
  .notification-message {
    font-size: 14px;
  }
  
  .notification-actions {
    margin-left: 0;
    margin-top: 12px;
    align-self: flex-end;
  }
  
  .mark-read-btn, .delete-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .pagination {
    flex-direction: column;
    gap: 16px;
  }
}
</style>