<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import { useRouter } from 'vue-router'

definePageMeta({ layout: 'keguang' })

useHead({ title: '通知中心 - UniKorn 科广汇' })

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

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/forum')
}

const currentFilter = ref<'all' | 'unread'>('all')
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const markingAllRead = ref(false)

const setFilter = (filter: 'all' | 'unread') => {
  currentFilter.value = filter
  currentPage.value = 1
  loadNotifications()
}

const loadNotifications = async () => {
  try {
    const result = await fetchNotifications(currentPage.value, 20, currentFilter.value === 'unread')
    totalPages.value = result.total_pages
    totalCount.value = result.total_count
  } catch (err) { console.error('Failed to load notifications:', err) }
}

const previousPage = () => { if (currentPage.value > 1) { currentPage.value--; loadNotifications() } }
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; loadNotifications() } }

const handleMarkAllRead = async () => {
  if (markingAllRead.value) return
  markingAllRead.value = true
  try {
    await markAllAsRead()
    if (currentFilter.value === 'unread') await loadNotifications()
  } catch (err) { console.error('Failed to mark all as read:', err) }
  finally { markingAllRead.value = false }
}

const handleMarkAsRead = async (notificationId: number) => {
  try {
    await markAsRead(notificationId)
    if (currentFilter.value === 'unread') await loadNotifications()
  } catch (err) { console.error('Failed to mark as read:', err) }
}

const handleDelete = async (notificationId: number) => {
  if (!confirm('确定要删除这条通知吗？')) return
  try {
    await deleteNotification(notificationId)
    await loadNotifications()
  } catch (err) { console.error('Failed to delete notification:', err) }
}

const handleNotificationClick = async (notification: any) => {
  if (!notification.read) {
    try { await markAsRead(notification.id) } catch (err) { }
  }
  router.push(getNotificationUrl(notification))
}

onMounted(() => { loadNotifications() })
watch(currentPage, () => { loadNotifications() })
</script>

<template>
  <div class="kg-notifications">
    <div class="kg-notif-header">
      <div class="kg-notif-title-row">
        <button class="kg-back-btn" @click="goBack">← 返回</button>
        <h1 class="kg-page-title">通知中心</h1>
        <span v-if="unreadCount > 0" class="kg-unread-badge">{{ unreadCount }}</span>
      </div>
      <button
        v-if="hasUnread"
        class="kg-btn-ghost"
        :disabled="markingAllRead"
        @click="handleMarkAllRead"
      >
        {{ markingAllRead ? '处理中...' : '全部标为已读' }}
      </button>
    </div>

    <div class="kg-filter-tabs">
      <button :class="['kg-tab', { active: currentFilter === 'all' }]" @click="setFilter('all')">全部</button>
      <button :class="['kg-tab', { active: currentFilter === 'unread' }]" @click="setFilter('unread')">
        未读<span v-if="unreadCount > 0" class="kg-tab-count">{{ unreadCount }}</span>
      </button>
    </div>

    <div v-if="loading" class="kg-loading">
      <div class="kg-spinner"></div><span>加载中...</span>
    </div>

    <div v-else-if="error" class="kg-error">{{ error }}</div>

    <div v-else-if="notifications.length === 0" class="kg-empty">
      <div class="kg-empty-icon">🔔</div>
      <p>{{ currentFilter === 'unread' ? '没有未读通知' : '暂无通知' }}</p>
    </div>

    <div v-else class="kg-notif-list">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        :class="['kg-notif-item', { 'kg-notif-item--unread': !notif.read }]"
      >
        <div class="kg-notif-body" @click="handleNotificationClick(notif)">
          <div v-if="!notif.read" class="kg-notif-dot"></div>
          <div class="kg-notif-content">
            <p class="kg-notif-text">{{ notif.content || notif.message || notif.title }}</p>
            <span class="kg-notif-time">{{ formatNotificationTime(notif.created_at) }}</span>
          </div>
        </div>
        <div class="kg-notif-actions">
          <button v-if="!notif.read" class="kg-icon-btn" title="标为已读" @click.stop="handleMarkAsRead(notif.id)">✓</button>
          <button class="kg-icon-btn kg-icon-btn--danger" title="删除" @click.stop="handleDelete(notif.id)">✕</button>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="kg-pagination">
      <button class="kg-page-btn" :disabled="currentPage <= 1" @click="previousPage">上一页</button>
      <span class="kg-page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="kg-page-btn" :disabled="currentPage >= totalPages" @click="nextPage">下一页</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-notifications {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.kg-notif-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kg-back-btn {
  background: none;
  border: none;
  color: #26a4ff;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  &:hover { text-decoration: underline; }
}

.kg-page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0;
}

.kg-unread-badge {
  background: #e05a5a;
  color: #fff;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 1px 7px;
}

.kg-btn-ghost {
  padding: 7px 18px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: #F5FBFE;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  &:hover:not(:disabled) { border-color: #26a4ff; color: #26a4ff; }
  &:disabled { opacity: 0.5; }
}

.kg-filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.kg-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 20px;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  background: #F5FBFE;
  color: #4a6080;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; color: #26a4ff; }
  &.active { background: #26a4ff; border-color: #26a4ff; color: #fff; font-weight: 600; }
}

.kg-tab-count {
  background: rgba(255,255,255,0.35);
  border-radius: 8px;
  font-size: 0.72rem;
  padding: 0 5px;
  font-weight: 700;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
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

.kg-error, .kg-empty {
  text-align: center;
  padding: 60px 20px;
  color: #4a6080;
}

.kg-empty { .kg-empty-icon { font-size: 2.5rem; margin-bottom: 8px; } p { margin: 0; } }

.kg-notif-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kg-notif-item {
  display: flex;
  align-items: center;
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
  &:hover { border-color: #26a4ff; }
  &--unread {
    background: rgba(38, 164, 255, 0.04);
    border-color: rgba(38, 164, 255, 0.3);
  }
}

.kg-notif-body {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
}

.kg-notif-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #26a4ff;
  margin-top: 6px;
}

.kg-notif-content { flex: 1; }

.kg-notif-text {
  margin: 0 0 4px;
  font-size: 0.9rem;
  color: #1a2a4a;
  line-height: 1.5;
}

.kg-notif-time {
  font-size: 0.78rem;
  color: #9ab0c6;
}

.kg-notif-actions {
  display: flex;
  gap: 4px;
  padding: 0 10px;
  flex-shrink: 0;
}

.kg-icon-btn {
  width: 30px;
  height: 30px;
  border: 1.5px solid #c8dff8;
  border-radius: 8px;
  background: transparent;
  color: #6a85a0;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; color: #26a4ff; }
  &--danger:hover { border-color: #e05a5a; color: #e05a5a; }
}

.kg-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 0 0;
}

.kg-page-btn {
  padding: 7px 20px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: #F5FBFE;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  &:hover:not(:disabled) { border-color: #26a4ff; color: #26a4ff; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.kg-page-info {
  font-size: 0.875rem;
  color: #4a6080;
}
</style>
