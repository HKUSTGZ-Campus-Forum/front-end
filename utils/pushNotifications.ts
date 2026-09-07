export function pushEnvironment() {
  if (typeof window === 'undefined') return { supported: false, needsInstall: false }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return {
    needsInstall: ios && !standalone,
    supported: window.isSecureContext && 'serviceWorker' in navigator &&
      'PushManager' in window && 'Notification' in window,
  }
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

export function toBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function withPushTimeout<T>(promise: Promise<T>, milliseconds = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), milliseconds)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

export async function setNotificationBadge(count: number) {
  if (typeof navigator === 'undefined') return
  const badge = navigator as Navigator & {
    setAppBadge?: (count: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  try {
    if (count > 0) await badge.setAppBadge?.(count)
    else await badge.clearAppBadge?.()
  } catch { /* Badging is optional; notification reads must still succeed. */ }
}

// Called before identity is cleared. Local revocation also works without the API.
export async function removeDevicePushOnLogout(removeOnServer: (endpoint: string) => Promise<unknown>) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await withPushTimeout(navigator.serviceWorker.getRegistration('/'), 3000)
    const subscription = await withPushTimeout(Promise.resolve(registration?.pushManager?.getSubscription()), 3000)
    if (subscription) {
      await Promise.allSettled([
        withPushTimeout(subscription.unsubscribe(), 3000),
        withPushTimeout(removeOnServer(subscription.endpoint), 3000),
      ])
    }
    const notifications = await withPushTimeout(Promise.resolve(registration?.getNotifications()), 3000)
    notifications?.forEach(notification => notification.close())
    await setNotificationBadge(0)
  } catch { /* Logout must not be blocked by an unavailable browser service. */ }
}
