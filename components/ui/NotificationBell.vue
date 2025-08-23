<template>
  <div class="notification-bell" @click="toggleDropdown" ref="bellRef">
    <!-- Bell Icon -->
    <div class="bell-icon" :class="{ 'has-unread': hasUnread }">
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9Z" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        />
        <path 
          d="M13.73 21a2 2 0 0 1-3.46 0" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        />
      </svg>
      
      <!-- Unread count badge -->
      <div v-if="hasUnread" class="unread-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </div>
    </div>
    
    <!-- Dropdown -->
    <div v-if="showDropdown" class="notification-dropdown">
      <div class="dropdown-header">
        <h3>通知</h3>
        <div class="header-actions">
          <button 
            v-if="hasUnread" 
            @click="handleMarkAllRead" 
            class="mark-all-read-btn"
            :disabled="markingAllRead"
          >
            {{ markingAllRead ? '标记中...' : '全部已读' }}
          </button>
          <NuxtLink to="/notifications" class="view-all-btn" @click="closeDropdown">
            查看全部
          </NuxtLink>
        </div>
      </div>
      
      <div class="dropdown-content">
        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <p>加载失败：{{ error }}</p>
          <button @click="loadNotifications" class="retry-btn">重试</button>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="notifications.length === 0" class="empty-state">
          <p>暂无通知</p>
        </div>
        
        <!-- Notifications list -->
        <div v-else class="notifications-list">
          <div
            v-for="notification in notifications.slice(0, 5)"
            :key="notification.id"
            class="notification-item"
            :class="{ 'unread': !notification.read }"
            @click="handleNotificationClick(notification)"
          >
            <!-- Avatar -->
            <div class="notification-avatar">
              <UserAvatar 
                :avatar-url="notification.sender?.avatar_url"
                :username="notification.sender?.username || '用户'"
                :user-id="notification.sender?.id"
                :size="'sm'"
              />
            </div>
            
            <!-- Content -->
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
              <div class="notification-time">{{ formatNotificationTime(notification.created_at) }}</div>
            </div>
            
            <!-- Unread indicator -->
            <div v-if="!notification.read" class="unread-indicator"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useRouter } from 'vue-router'

const { 
  notifications, 
  unreadCount, 
  loading, 
  error, 
  hasUnread,
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  getNotificationUrl,
  formatNotificationTime 
} = useNotifications()

const {
  isSupported: isPushSupported,
  canSubscribe: canSubscribeToPush,
  subscribe: subscribeToPush,
  init: initPush
} = usePushNotifications()

const router = useRouter()

// Component state
const showDropdown = ref(false)
const markingAllRead = ref(false)
const bellRef = ref<HTMLElement>()
const refreshInterval = ref<NodeJS.Timeout>()

// Methods
const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    await loadNotifications()
  }
}

const closeDropdown = () => {
  showDropdown.value = false
}

const loadNotifications = async () => {
  try {
    await fetchNotifications(1, 5) // Load first 5 notifications for dropdown
  } catch (err) {
    console.error('Failed to load notifications:', err)
  }
}

const handleMarkAllRead = async () => {
  if (markingAllRead.value) return
  
  markingAllRead.value = true
  try {
    await markAllAsRead()
  } catch (err) {
    console.error('Failed to mark all as read:', err)
  } finally {
    markingAllRead.value = false
  }
}

const handleNotificationClick = async (notification: any) => {
  closeDropdown()
  
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

// Click outside to close dropdown
const handleClickOutside = (event: Event) => {
  if (bellRef.value && !bellRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

// Start refresh interval for unread count
const startRefreshInterval = () => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
  
  // Refresh unread count every 30 seconds
  refreshInterval.value = setInterval(() => {
    fetchUnreadCount()
  }, 30000)
}

// Lifecycle
onMounted(async () => {
  // Initial load
  fetchUnreadCount()
  startRefreshInterval()
  
  // Initialize push notifications
  try {
    await initPush()
    
    // Auto-subscribe to push notifications if supported and not subscribed
    if (canSubscribeToPush.value) {
      try {
        await subscribeToPush()
        console.log('Successfully subscribed to push notifications')
      } catch (err) {
        console.warn('Failed to auto-subscribe to push notifications:', err)
        // Don't show error to user for auto-subscription failure
      }
    }
  } catch (err) {
    console.warn('Failed to initialize push notifications:', err)
  }
  
  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.notification-bell {
  position: relative;
  display: inline-block;
}

.bell-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  
  &:hover {
    background-color: var(--surface-secondary);
    color: var(--text-primary);
  }
  
  &.has-unread {
    color: var(--interactive-primary);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
}

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--semantic-error);
  color: var(--text-inverse);
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  min-width: 16px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10; /* Ensure it appears on top */
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 360px;
  max-height: 480px;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-medium);
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--surface-secondary);
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mark-all-read-btn, .view-all-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mark-all-read-btn {
  background: transparent;
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
  
  &:hover:not(:disabled) {
    background: var(--surface-secondary);
    border-color: var(--interactive-primary);
    color: var(--interactive-primary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.view-all-btn {
  background: var(--interactive-primary);
  border: 1px solid var(--interactive-primary);
  color: var(--text-inverse);
  
  &:hover {
    background: var(--interactive-hover);
    border-color: var(--interactive-hover);
  }
}

.dropdown-content {
  max-height: 400px;
  overflow-y: auto;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: var(--text-secondary);
  
  p {
    margin: 8px 0 0 0;
    font-size: 14px;
  }
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-primary);
  border-top: 2px solid var(--interactive-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  
  &:hover {
    background: var(--interactive-hover);
  }
}

.notifications-list {
  padding: 8px 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
  
  &:hover {
    background: var(--surface-secondary);
  }
  
  &.unread {
    background: rgba(59, 130, 246, 0.04);
    border-left: 3px solid var(--interactive-primary);
  }
}

.notification-avatar {
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.3;
}

.notification-message {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.unread-indicator {
  width: 8px;
  height: 8px;
  background: var(--interactive-primary);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .notification-dropdown {
    box-shadow: var(--shadow-large);
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .notification-dropdown {
    width: 320px;
    right: -20px;
  }
}
</style>