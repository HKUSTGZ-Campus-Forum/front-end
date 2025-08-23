// composables/usePushNotifications.ts
import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { useAuth } from './useAuth'

export interface PushSubscription {
  id: number
  user_id: number
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  is_active: boolean
  created_at: string
  updated_at: string
  last_used_at: string | null
}

export const usePushNotifications = () => {
  const { fetchWithAuth } = useApi()
  const { isLoggedIn } = useAuth()
  
  const isSupported = ref(false)
  const isSubscribed = ref(false)
  const isSubscribing = ref(false)
  const permission = ref<NotificationPermission>('default')
  const subscription = ref<PushSubscription | null>(null)
  const error = ref<string | null>(null)
  const vapidPublicKey = ref<string | null>(null)
  
  // Check if push notifications are supported
  const checkSupport = () => {
    isSupported.value = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    
    if (isSupported.value) {
      permission.value = Notification.permission
    }
    
    return isSupported.value
  }
  
  // Get VAPID public key from server
  const getVapidPublicKey = async () => {
    try {
      const response = await fetchWithAuth('/api/push/vapid-public-key')
      const data = await response.json()
      
      if (response.ok) {
        vapidPublicKey.value = data.vapid_public_key
        return vapidPublicKey.value
      } else {
        throw new Error(data.error || 'Failed to get VAPID public key')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }
  
  // Request notification permission
  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported.value) {
      throw new Error('Push notifications are not supported')
    }
    
    try {
      permission.value = await Notification.requestPermission()
      return permission.value
    } catch (err) {
      error.value = 'Failed to request notification permission'
      throw err
    }
  }
  
  // Subscribe to push notifications
  const subscribe = async () => {
    if (!isLoggedIn.value) {
      throw new Error('Must be logged in to subscribe to notifications')
    }
    
    if (!isSupported.value) {
      throw new Error('Push notifications are not supported')
    }
    
    if (permission.value !== 'granted') {
      const newPermission = await requestPermission()
      if (newPermission !== 'granted') {
        throw new Error('Notification permission denied')
      }
    }
    
    isSubscribing.value = true
    error.value = null
    
    try {
      // Get VAPID public key
      if (!vapidPublicKey.value) {
        await getVapidPublicKey()
      }
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready
      
      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey.value!)
      })
      
      // Send subscription to server
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth')!)
        }
      }
      
      const response = await fetchWithAuth('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        subscription.value = data.subscription
        isSubscribed.value = true
        return subscription.value
      } else {
        throw new Error(data.error || 'Failed to save subscription')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to subscribe'
      throw err
    } finally {
      isSubscribing.value = false
    }
  }
  
  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!isSupported.value) return
    
    try {
      const registration = await navigator.serviceWorker.ready
      const pushSubscription = await registration.pushManager.getSubscription()
      
      if (pushSubscription) {
        // Unsubscribe from push manager
        await pushSubscription.unsubscribe()
        
        // Notify server
        if (isLoggedIn.value) {
          await fetchWithAuth('/api/push/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              endpoint: pushSubscription.endpoint
            })
          })
        }
      }
      
      isSubscribed.value = false
      subscription.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to unsubscribe'
      throw err
    }
  }
  
  // Check current subscription status
  const checkSubscription = async () => {
    if (!isSupported.value || !isLoggedIn.value) return false
    
    try {
      const registration = await navigator.serviceWorker.ready
      const pushSubscription = await registration.pushManager.getSubscription()
      
      isSubscribed.value = !!pushSubscription
      return isSubscribed.value
    } catch (err) {
      console.error('Failed to check subscription:', err)
      return false
    }
  }
  
  // Send test notification
  const sendTestNotification = async () => {
    try {
      const response = await fetchWithAuth('/api/push/test', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        return data
      } else {
        throw new Error(data.error || 'Failed to send test notification')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send test notification'
      throw err
    }
  }
  
  // Initialize push notifications
  const init = async () => {
    checkSupport()
    
    if (isSupported.value && isLoggedIn.value) {
      await checkSubscription()
      if (!vapidPublicKey.value) {
        try {
          await getVapidPublicKey()
        } catch (err) {
          console.warn('Failed to get VAPID public key:', err)
        }
      }
    }
  }
  
  // Computed properties
  const canSubscribe = computed(() => 
    isSupported.value && 
    isLoggedIn.value && 
    !isSubscribed.value && 
    permission.value !== 'denied'
  )
  
  const needsPermission = computed(() => 
    isSupported.value && permission.value === 'default'
  )
  
  return {
    // State
    isSupported,
    isSubscribed,
    isSubscribing,
    permission,
    subscription,
    error,
    vapidPublicKey,
    
    // Computed
    canSubscribe,
    needsPermission,
    
    // Methods
    checkSupport,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
    sendTestNotification,
    init
  }
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}