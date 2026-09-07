// composables/useNotifications.ts
import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { useAuth } from './useAuth'
import { setNotificationBadge } from '../utils/pushNotifications'

export interface Notification {
  id: number
  recipient_id: number
  sender_id: number | null
  type:
    | 'post_reaction'
    | 'comment_reaction'
    | 'post_comment'
    | 'comment_reply'
    | 'feedback_published'
    | 'feedback_rejected'
    | 'feedback_merge_request_created'
    | 'feedback_merge_request_changes_requested'
    | 'feedback_merge_request_rejected_by_author'
    | 'feedback_merge_request_ready_for_admin'
    | 'feedback_merge_request_merged'
    | 'feedback_merge_request_rejected_by_admin'
  title: string
  message: string
  read: boolean
  post_id: number | null
  comment_id: number | null
  reaction_id: number | null
  link_url?: string | null
  created_at: string
  updated_at: string
  sender?: {
    id: number
    username: string
    avatar_url: string | null
  }
  post?: {
    id: number
    title: string
  }
  comment?: {
    id: number
    content: string
  }
}

export interface NotificationResponse {
  notifications: Notification[]
  total_count: number
  total_pages: number
  current_page: number
  unread_count: number
}

export const useNotifications = () => {
  const { fetchWithAuth } = useApi()
  
  const notifications = ref<Notification[]>([])
  const unreadCount = useState<number>('notification-unread-count', () => 0)
  const readRevision = useState<number>('notification-read-revision', () => 0)
  const { user } = useAuth()
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed properties
  const hasUnread = computed(() => unreadCount.value > 0)
  const unreadNotifications = computed(() => 
    notifications.value.filter(n => !n.read)
  )
  
  // Fetch notifications
  const fetchNotifications = async (page = 1, limit = 20, unreadOnly = false) => {
    loading.value = true
    error.value = null
    
    try {
      const owner = user.value?.id
      const revision = readRevision.value
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        unread_only: unreadOnly.toString()
      })
      
      const response = await fetchWithAuth(`/api/notifications?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        if (owner !== user.value?.id) return data as NotificationResponse
        notifications.value = data.notifications
        if (revision === readRevision.value) {
          unreadCount.value = data.unread_count
          void setNotificationBadge(unreadCount.value)
        }
        return data
      } else {
        throw new Error(data.error || 'Failed to fetch notifications')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // Fetch unread count only
  const fetchUnreadCount = async () => {
    try {
      const owner = user.value?.id
      const revision = readRevision.value
      const response = await fetchWithAuth('/api/notifications/unread-count')
      const data = await response.json()
      
      if (response.ok) {
        if (owner === user.value?.id && revision === readRevision.value) {
          unreadCount.value = data.unread_count
          void setNotificationBadge(unreadCount.value)
        }
        return data.unread_count
      } else {
        throw new Error(data.error || 'Failed to fetch unread count')
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
      return 0
    }
  }
  
  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        // Update local state
        const notification = notifications.value.find(n => n.id === notificationId)
        if (notification && !notification.read) {
          notification.read = true
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        void setNotificationBadge(unreadCount.value)
        return true
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark notification as read')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    const owner = user.value?.id
    // Discard count requests started before or during this write.
    readRevision.value++
    try {
      const response = await fetchWithAuth('/api/notifications/mark-all-read', { method: 'PUT' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark all notifications as read')
      }
      if (owner !== user.value?.id) return false
      notifications.value.forEach(n => n.read = true)
      unreadCount.value = 0
      void setNotificationBadge(0)
      return true
    } finally {
      readRevision.value++
    }
  }
  
  // Delete notification
  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Update local state
        const index = notifications.value.findIndex(n => n.id === notificationId)
        if (index !== -1) {
          const notification = notifications.value[index]
          if (!notification.read) {
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
          notifications.value.splice(index, 1)
        }
        void setNotificationBadge(unreadCount.value)
        return true
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete notification')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }
  
  // Get notification and mark as read
  const getNotification = async (notificationId: number) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${notificationId}`)
      const data = await response.json()
      
      if (response.ok) {
        // Update local state if notification was marked as read
        const localNotification = notifications.value.find(n => n.id === notificationId)
        if (localNotification && !localNotification.read && data.read) {
          localNotification.read = true
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        return data
      } else {
        throw new Error(data.error || 'Failed to get notification')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }
  
  // Get navigation URL for a notification
  const getNotificationUrl = (notification: Notification): string => {
    if (notification.link_url) {
      return notification.link_url
    }
    if (notification.post_id) {
      // Navigate to post
      return `/forum/posts/${notification.post_id}`
    } else if (notification.comment_id && notification.post) {
      // Navigate to post with comment highlight
      return `/forum/posts/${notification.post.id}#comment-${notification.comment_id}`
    }
    return '/forum'
  }
  
  // Format notification time
  const formatNotificationTime = (createdAt: string): string => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return created.toLocaleDateString('zh-CN')
  }
  
  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    
    // Computed
    hasUnread,
    unreadNotifications,
    
    // Methods
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotification,
    getNotificationUrl,
    formatNotificationTime
  }
}
