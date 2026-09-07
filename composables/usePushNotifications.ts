import { computed, ref } from 'vue'
import { useApi } from './useApi'
import { useAuth } from './useAuth'
import { fromBase64Url, pushEnvironment, toBase64Url, withPushTimeout } from '../utils/pushNotifications'

export const usePushNotifications = () => {
  const { fetchWithAuth, fetchPublic } = useApi()
  const { isLoggedIn, user } = useAuth()
  const isSupported = ref(false)
  const needsInstall = ref(false)
  const isSubscribed = ref(false)
  const hasBrowserSubscription = ref(false)
  const permission = ref<NotificationPermission>('default')
  const busy = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const testSent = ref(false)
  let deviceSubscription: PushSubscription | null = null

  const detect = () => {
    const env = pushEnvironment()
    isSupported.value = env.supported
    needsInstall.value = env.needsInstall
    permission.value = env.supported ? Notification.permission : 'default'
  }
  const api = async (path: string, options: RequestInit = {}, isPublic = false) => {
    const response = await (isPublic ? fetchPublic : fetchWithAuth)(path, {
      ...options, signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error('server')
    return response.json()
  }
  const registration = () => withPushTimeout(navigator.serviceWorker.ready)
  const reportError = (err: unknown) => {
    error.value = err instanceof Error && ['timeout', 'server', 'permission', 'account'].includes(err.message)
      ? err.message : 'failed'
  }
  const refresh = async () => {
    if (busy.value) return
    detect()
    error.value = null
    isSubscribed.value = false
    if (!isSupported.value || needsInstall.value || !isLoggedIn.value) {
      initialized.value = true
      return
    }
    busy.value = true
    try {
      const owner = user.value?.id
      const worker = await registration()
      deviceSubscription = await withPushTimeout(worker.pushManager.getSubscription())
      hasBrowserSubscription.value = !!deviceSubscription
      if (deviceSubscription && permission.value === 'granted') {
        const data = await api('/api/push/subscriptions')
        isSubscribed.value = owner === user.value?.id && data.subscriptions.some(
          (sub: { endpoint: string; is_active: boolean }) =>
            sub.endpoint === deviceSubscription?.endpoint && sub.is_active,
        )
      }
    } catch (err) { reportError(err) }
    finally { busy.value = false; initialized.value = true }
  }

  // Must be called directly by a click. No fetch/worker wait precedes permission.
  const subscribe = async () => {
    if (busy.value || !isLoggedIn.value) return
    detect()
    if (!isSupported.value || needsInstall.value) return
    busy.value = true
    error.value = null
    testSent.value = false
    const owner = user.value?.id
    try {
      if (permission.value !== 'granted') {
        permission.value = await Notification.requestPermission()
      }
      if (permission.value !== 'granted') throw new Error('permission')
      const data = await api('/api/push/vapid-public-key', {}, true)
      const worker = await registration()
      deviceSubscription = await withPushTimeout(worker.pushManager.getSubscription())
      const key = fromBase64Url(data.vapid_public_key)
      const oldKey = deviceSubscription?.options?.applicationServerKey
      if (deviceSubscription && oldKey && toBase64Url(oldKey) !== toBase64Url(key.buffer)) {
        await withPushTimeout(deviceSubscription.unsubscribe())
        deviceSubscription = null
      }
      deviceSubscription ||= await withPushTimeout(worker.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: key,
      }))
      hasBrowserSubscription.value = true
      if (!isLoggedIn.value || owner !== user.value?.id) {
        await deviceSubscription.unsubscribe()
        throw new Error('account')
      }
      await api('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: deviceSubscription.endpoint, keys: {
          p256dh: toBase64Url(deviceSubscription.getKey('p256dh')!),
          auth: toBase64Url(deviceSubscription.getKey('auth')!),
        } }),
      })
      isSubscribed.value = owner === user.value?.id && isLoggedIn.value
    } catch (err) { isSubscribed.value = false; reportError(err) }
    finally { busy.value = false }
  }
  const unsubscribe = async () => {
    if (busy.value) return
    busy.value = true
    error.value = null
    testSent.value = false
    try {
      const worker = await registration()
      deviceSubscription = await withPushTimeout(worker.pushManager.getSubscription())
      if (deviceSubscription) {
        // Retain the endpoint for a retry if the server is offline.
        await api('/api/push/unsubscribe', {
          method: 'POST', body: JSON.stringify({ endpoint: deviceSubscription.endpoint }),
        })
        await withPushTimeout(deviceSubscription.unsubscribe())
      }
      deviceSubscription = null
      isSubscribed.value = false
      hasBrowserSubscription.value = false
    } catch (err) { reportError(err) }
    finally { busy.value = false }
  }
  const sendTestNotification = async (locale: string) => {
    if (busy.value || !isSubscribed.value || !deviceSubscription) return
    busy.value = true
    error.value = null
    testSent.value = false
    try {
      await api('/api/push/test', { method: 'POST', body: JSON.stringify({
        endpoint: deviceSubscription.endpoint, locale,
      }) })
      testSent.value = true
    } catch (err) { reportError(err) }
    finally { busy.value = false }
  }
  const canSubscribe = computed(() => initialized.value && isSupported.value &&
    !needsInstall.value && isLoggedIn.value && !isSubscribed.value && permission.value !== 'denied')
  return { isSupported, needsInstall, isSubscribed, hasBrowserSubscription, permission,
    busy, initialized, error, testSent, canSubscribe, refresh, subscribe, unsubscribe, sendTestNotification }
}
