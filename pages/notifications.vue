<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNotifications } from '~/composables/useNotifications'

definePageMeta({ layout: 'keguang', middleware: 'auth' })
const { t, locale } = useI18n()
const { getLocalePath } = useAppLocale()
useHead(() => ({ title: `${t('notifications.title')} - UniKorn` }))
const { notifications, loading, error, fetchNotifications,
  markAllAsRead, deleteNotification, getNotificationUrl } = useNotifications()
const { user } = useAuth()
const syncingRead = ref(false)
const readSyncFailed = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const busy = ref(false)
const actionError = ref(false)
const pendingDelete = ref<number | null>(null)
const isLoading = computed(() => loading.value || busy.value || syncingRead.value)

const load = async () => {
  readSyncFailed.value = false
  const owner = user.value?.id
  try {
    const data = await fetchNotifications(currentPage.value, 20)
    if (owner !== user.value?.id) return
    totalPages.value = Math.max(1, data.total_pages)
    if (currentPage.value > totalPages.value) { currentPage.value = totalPages.value; return await load() }
    if (data.unread_count > 0) {
      syncingRead.value = true
      try { await markAllAsRead() }
      catch { readSyncFailed.value = true }
      finally { syncingRead.value = false }
    }
  } catch { /* The inline error provides retry. */ }
}
const page = async (offset: number) => { currentPage.value += offset; await load() }
const mutate = async (action: () => Promise<unknown>) => {
  if (isLoading.value) return
  busy.value = true
  actionError.value = false
  try { await action(); pendingDelete.value = null; await load() }
  catch { actionError.value = true }
  finally { busy.value = false }
}
const remove = (id: number) => mutate(() => deleteNotification(id))
const time = (value: string) => new Intl.DateTimeFormat(locale.value === 'en' ? 'en' : 'zh-CN', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value))
onMounted(() => { void load() })
watch(locale, () => { pendingDelete.value = null })
</script>

<template>
  <main class="notifications-page">
    <header class="notifications-page__header">
      <div>
        <h1>{{ t('notifications.title') }}</h1>
        <p>{{ t('notifications.subtitle') }}</p>
      </div>
    </header>
    <NotificationsPushSettings />
    <section class="notification-inbox" :aria-label="t('notifications.inbox')">
      <div class="notification-inbox__toolbar">
        <h2 class="notification-inbox__title">{{ t('notifications.inbox') }}</h2>
        <button class="notification-button" :disabled="isLoading" @click="load">{{ t('notifications.refresh') }}</button>
      </div>
      <div v-if="readSyncFailed" class="notification-message notification-read-error" role="alert">
        <span>{{ t('notifications.autoReadFailed') }}</span>
        <button class="notification-button" :disabled="isLoading" @click="load">{{ t('notifications.retry') }}</button>
      </div>
      <p v-if="actionError" class="notification-message" role="alert">{{ t('notifications.actionFailed') }}</p>
      <div v-if="error" class="notification-empty" role="alert">
        <Icon name="lucide:wifi-off" aria-hidden="true" />
        <p>{{ t('notifications.listFailed') }}</p>
        <button class="notification-button" :disabled="isLoading" @click="load">{{ t('notifications.retry') }}</button>
      </div>
      <div v-else-if="loading" class="notification-skeleton" role="status" :aria-label="t('notifications.loading')">
        <div v-for="index in 3" :key="index"><span /><span /></div>
      </div>
      <div v-else-if="!notifications.length" class="notification-empty">
        <Icon name="lucide:inbox" aria-hidden="true" />
        <h2>{{ t('notifications.emptyTitle') }}</h2>
        <p>{{ t('notifications.emptyHint') }}</p>
        <NuxtLink :to="getLocalePath('/forum')" class="notification-button">{{ t('notifications.visitForum') }}</NuxtLink>
      </div>
      <ul v-else class="notification-list">
        <li v-for="notification in notifications" :key="notification.id" :class="{ 'is-unread': !notification.read }">
          <div class="notification-list__content">
            <span v-if="!notification.read" class="notification-list__unread">{{ t('notifications.unread') }}</span>
            <time :datetime="notification.created_at">{{ time(notification.created_at) }}</time>
            <NuxtLink :to="getLocalePath(getNotificationUrl(notification))" class="notification-list__link">
              <h2>{{ notification.title }}</h2>
              <p>{{ notification.message }}</p>
            </NuxtLink>
          </div>
          <div class="notification-list__actions">
            <template v-if="pendingDelete === notification.id">
              <span>{{ t('notifications.deleteConfirm') }}</span>
              <button class="notification-button" :disabled="isLoading" @click="remove(notification.id)">{{ t('notifications.confirmDelete') }}</button>
              <button class="notification-button" :disabled="isLoading" @click="pendingDelete = null">{{ t('notifications.cancel') }}</button>
            </template>
            <template v-else>
              <button class="notification-button" :disabled="isLoading" @click="pendingDelete = notification.id">{{ t('notifications.delete') }}</button>
            </template>
          </div>
        </li>
      </ul>
      <nav v-if="totalPages > 1" class="notification-pagination" :aria-label="t('notifications.pagination')">
        <button class="notification-button" :disabled="isLoading || currentPage <= 1" @click="page(-1)">{{ t('notifications.previous') }}</button>
        <span>{{ t('notifications.page', { current: currentPage, total: totalPages }) }}</span>
        <button class="notification-button" :disabled="isLoading || currentPage >= totalPages" @click="page(1)">{{ t('notifications.next') }}</button>
      </nav>
    </section>
  </main>
</template>

<style>
.notifications-page { width: 100%; max-width: 880px; margin: 0 auto; padding: 28px 20px 48px; color: var(--text-primary); }
.notifications-page__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.notifications-page__header h1 { margin: 0 0 8px; font-size: 1.75rem; font-weight: 700; }
.notifications-page__header p { margin: 0; color: var(--text-secondary); line-height: 1.6; }
.notification-button { display: inline-flex; justify-content: center; align-items: center; gap: 6px; min-height: 44px; padding: 9px 16px; border: 1px solid var(--border-primary); border-radius: 24px; background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 14px; font-weight: 600; line-height: 1.4; text-decoration: none; cursor: pointer; }
.notification-button:hover:not(:disabled) { background: var(--surface-secondary); border-color: var(--interactive-primary); }
.notification-button--primary { background: var(--interactive-active); border-color: var(--interactive-active); color: var(--text-on-interactive); }
.notification-button--primary:hover:not(:disabled) { background: var(--interactive-active); filter: brightness(.94); }
.notification-button:focus-visible, .notification-list__link:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 3px; }
.notification-button:disabled { opacity: .6; cursor: wait; }
.notification-inbox { margin-top: 24px; border-radius: 16px; background: var(--surface-primary); overflow: hidden; }
.notification-inbox__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border-secondary); }
.notification-inbox__title { margin: 0; font-size: 1rem; font-weight: 600; }
.notification-read-error { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.notification-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding: 44px 20px; }
.notification-empty > .iconify { font-size: 32px; color: var(--text-secondary); }
.notification-empty h2 { margin: 0; font-size: 1.125rem; }
.notification-empty p { max-width: 48ch; margin: 0; line-height: 1.65; color: var(--text-secondary); }
.notification-message { padding: 12px 20px; margin: 0; color: var(--text-primary); background: var(--surface-secondary); }
.notification-list { list-style: none; padding: 0; margin: 0; }
.notification-list > li { padding: 22px; border-bottom: 1px solid var(--border-secondary); }
.notification-list > li.is-unread { background: var(--surface-secondary); }
.notification-list__content { overflow-wrap: anywhere; }
.notification-list time { font-size: 12px; color: var(--text-secondary); }
.notification-list__unread { font-size: 12px; font-weight: 700; margin-right: 10px; }
.notification-list__link { display: block; text-decoration: none; color: inherit; border-radius: 4px; }
.notification-list h2 { font-size: 1rem; line-height: 1.6; margin: 8px 0 4px; }
.notification-list p { margin: 0; line-height: 1.65; color: var(--text-secondary); }
.notification-list__actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 12px; font-size: 14px; }
.notification-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 20px; font-size: 14px; }
.notification-skeleton { padding: 22px; }
.notification-skeleton > div { padding: 16px 0; }
.notification-skeleton span { display: block; height: 14px; max-width: 80%; background: var(--surface-secondary); margin: 10px 0; border-radius: 5px; }
.notification-skeleton span:first-child { max-width: 45%; }
@media (max-width: 600px) {
  .notifications-page { padding: 18px 12px 32px; }
  .notifications-page__header { align-items: flex-start; flex-direction: column; gap: 12px; }
  .notifications-page__header h1 { font-size: 1.5rem; }
  .notification-inbox__toolbar { padding: 12px; gap: 6px; }
  .notification-list > li { padding: 18px; }
  .notification-pagination { padding: 16px 10px; gap: 8px; }
}
</style>
