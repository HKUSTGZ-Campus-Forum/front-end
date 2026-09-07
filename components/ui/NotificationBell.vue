<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import { setNotificationBadge } from '~/utils/pushNotifications'

const { t } = useI18n()
const { getLocalePath } = useAppLocale()
const { user, isLoggedIn } = useAuth()
const { unreadCount, fetchUnreadCount } = useNotifications()
const label = computed(() => unreadCount.value
  ? t('notifications.unreadLabel', { count: unreadCount.value }) : t('notifications.title'))
let interval: ReturnType<typeof setInterval> | undefined
const refresh = () => {
  if (isLoggedIn.value && document.visibilityState === 'visible') void fetchUnreadCount()
}
const onWorkerMessage = (event: MessageEvent) => {
  if (event.data?.type === 'NOTIFICATION_RECEIVED') refresh()
}
watch(() => user.value?.id, () => { unreadCount.value = 0; refresh() })
watch(unreadCount, count => { void setNotificationBadge(count) })
onMounted(() => {
  refresh()
  interval = setInterval(refresh, 30000)
  document.addEventListener('visibilitychange', refresh)
  window.addEventListener('focus', refresh)
  navigator.serviceWorker?.addEventListener('message', onWorkerMessage)
})
onUnmounted(() => {
  clearInterval(interval)
  document.removeEventListener('visibilitychange', refresh)
  window.removeEventListener('focus', refresh)
  navigator.serviceWorker?.removeEventListener('message', onWorkerMessage)
})
</script>

<template>
  <NuxtLink :to="getLocalePath('/notifications')" class="notification-bell" :aria-label="label" :title="label">
    <Icon name="lucide:bell" aria-hidden="true" />
    <span v-if="unreadCount > 0" class="notification-bell__count" aria-hidden="true">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
  </NuxtLink>
</template>

<style scoped>
.notification-bell { position: relative; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; color: var(--text-primary); font-size: 22px; text-decoration: none; }
.notification-bell:hover { background: var(--surface-secondary); }
.notification-bell:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.notification-bell__count { position: absolute; top: 0; right: 0; min-width: 18px; height: 18px; padding: 0 3px; border-radius: 9px; background: var(--text-primary); color: var(--surface-primary); font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; }
</style>
