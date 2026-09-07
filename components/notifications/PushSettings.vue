<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { usePushNotifications } from '~/composables/usePushNotifications'
const { t, locale } = useI18n()
const { isSupported, needsInstall, isSubscribed, hasBrowserSubscription, permission,
  busy, initialized, error, testSent, canSubscribe, refresh, subscribe, unsubscribe, sendTestNotification } = usePushNotifications()
const status = computed(() => !initialized.value ? 'checking' : needsInstall.value ? 'install'
  : !isSupported.value ? 'unsupported' : permission.value === 'denied' ? 'denied'
    : isSubscribed.value ? 'enabled' : error.value ? 'unavailable' : 'disabled')
const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
onMounted(() => {
  void refresh()
  window.addEventListener('focus', onVisible)
  document.addEventListener('visibilitychange', onVisible)
})
onUnmounted(() => {
  window.removeEventListener('focus', onVisible)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <section class="push-settings" aria-labelledby="push-title" :aria-busy="busy">
    <div class="push-settings__heading">
      <Icon :name="isSubscribed ? 'lucide:bell-ring' : 'lucide:smartphone'" aria-hidden="true" />
      <div>
        <h2 id="push-title">{{ t('notifications.push.title') }}</h2>
        <p>{{ t('notifications.push.description') }}</p>
      </div>
      <span class="push-settings__status">{{ t(`notifications.push.status.${status}`) }}</span>
    </div>
    <ol v-if="needsInstall" class="push-settings__steps">
      <li>{{ t('notifications.push.installSafari') }}</li>
      <li>{{ t('notifications.push.installHome') }}</li>
      <li>{{ t('notifications.push.installOpen') }}</li>
    </ol>
    <p v-else-if="status === 'unsupported'" class="push-settings__help">{{ t('notifications.push.unsupported') }}</p>
    <p v-else-if="status === 'denied'" class="push-settings__help">{{ t('notifications.push.denied') }}</p>
    <p v-else-if="isSubscribed" class="push-settings__help">{{ t('notifications.push.enabledHint') }}</p>
    <div class="push-settings__actions">
      <button v-if="canSubscribe" class="notification-button notification-button--primary" :disabled="busy" @click="subscribe">{{ t('notifications.push.enable') }}</button>
      <button v-if="isSubscribed" class="notification-button" :disabled="busy" @click="sendTestNotification(locale)">{{ t('notifications.push.test') }}</button>
      <button v-if="hasBrowserSubscription && isSupported && !needsInstall" class="notification-button" :disabled="busy" @click="unsubscribe">{{ t('notifications.push.disable') }}</button>
      <button v-if="error || status === 'denied'" class="notification-button" :disabled="busy" @click="refresh">{{ t('notifications.push.checkAgain') }}</button>
      <span v-if="busy" class="push-settings__help" role="status">{{ t('notifications.push.working') }}</span>
    </div>
    <p v-if="error" class="push-settings__message" role="alert">{{ t(`notifications.push.errors.${error}`) }}</p>
    <p v-else-if="testSent" class="push-settings__message" role="status">{{ t('notifications.push.testSent') }}</p>
  </section>
</template>

<style scoped>
.push-settings { background: var(--surface-primary); border-radius: 16px; padding: 24px; border: 1px solid var(--border-primary); }
.push-settings__heading { display: flex; align-items: flex-start; gap: 12px; }
.push-settings__heading > .iconify { font-size: 24px; flex-shrink: 0; margin-top: 2px; }
.push-settings__heading > div { flex: 1; min-width: 0; }
h2 { margin: 0 0 6px; font-size: 1.125rem; font-weight: 700; }
p { margin: 0; line-height: 1.65; color: var(--text-secondary); }
.push-settings__status { padding: 4px 10px; border-radius: 20px; background: var(--surface-secondary); font-size: 12px; font-weight: 600; white-space: nowrap; }
.push-settings__steps { padding-left: 24px; margin: 16px 0 0; color: var(--text-secondary); line-height: 1.7; }
.push-settings__steps li + li { margin-top: 6px; }
.push-settings__help { margin-top: 12px; font-size: 14px; }
.push-settings__actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.push-settings__actions:empty { display: none; }
.push-settings__actions .push-settings__help { margin: 0; }
.push-settings__message { margin-top: 14px; padding: 12px; border-radius: 8px; background: var(--surface-secondary); color: var(--text-primary); }
@media (max-width: 600px) {
  .push-settings { padding: 18px; }
  .push-settings__heading { flex-wrap: wrap; }
  .push-settings__heading > div { flex-basis: calc(100% - 40px); }
  .push-settings__status { margin-left: 36px; }
}
</style>
