import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { fromBase64Url, toBase64Url, pushEnvironment, removeDevicePushOnLogout } from '../../utils/pushNotifications'

vi.mock('../../composables/useApi', () => ({ useApi: () => api }))
vi.mock('../../composables/useAuth', () => ({ useAuth: () => auth }))
import { usePushNotifications } from '../../composables/usePushNotifications'
const api = { fetchWithAuth: vi.fn(), fetchPublic: vi.fn() }
const auth = { isLoggedIn: ref(true), user: ref<{ id: number } | null>({ id: 1 }) }
const key = Uint8Array.from([251, 255, 0, 62]).buffer
let subscription: any
let worker: any
let permission: any
let active: any
const json = (data: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status }))

beforeEach(() => {
  vi.clearAllMocks()
  auth.isLoggedIn.value = true
  auth.user.value = { id: 1 }
  subscription = { endpoint: 'https://web.push.apple.com/test', getKey: vi.fn(() => key), options: {}, unsubscribe: vi.fn(async () => { active = null; return true }) }
  active = null
  worker = { pushManager: { getSubscription: vi.fn(async () => active), subscribe: vi.fn(async () => { active = subscription; return active }) }, getNotifications: vi.fn(async () => []) }
  permission = { permission: 'default', requestPermission: vi.fn(async () => { permission.permission = 'granted'; return 'granted' }) }
  vi.stubGlobal('Notification', permission)
  vi.stubGlobal('window', { isSecureContext: true, PushManager: {}, Notification: permission, matchMedia: () => ({ matches: true }) })
  vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5,
    serviceWorker: { ready: Promise.resolve(worker), getRegistration: vi.fn(async () => worker) }, clearAppBadge: vi.fn(async () => {}) })
  api.fetchPublic.mockImplementation(() => json({ vapid_public_key: toBase64Url(key) }))
  api.fetchWithAuth.mockImplementation((path) => json(path.endsWith('/subscriptions') ? { subscriptions: [] } : {}))
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('device Web Push lifecycle', () => {
  it('round-trips encryption keys with URL-safe characters only', () => {
    expect(toBase64Url(key)).toBe('-_8APg')
    expect(fromBase64Url(toBase64Url(key)).buffer).toEqual(key)
  })
  it('requires an iPhone/iPad Home Screen install before offering push', () => {
    window.matchMedia = () => ({ matches: false }) as MediaQueryList
    expect(pushEnvironment()).toEqual({ supported: true, needsInstall: true })
    Object.assign(navigator, { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 })
    expect(pushEnvironment().needsInstall).toBe(true)
  })
  it('does not request permission or create a subscription when opening settings', async () => {
    const push = usePushNotifications()
    await push.refresh()
    expect(permission.requestPermission).not.toHaveBeenCalled()
    expect(worker.pushManager.subscribe).not.toHaveBeenCalled()
    expect(push.canSubscribe.value).toBe(true)
  })
  it('requests permission synchronously before network/worker work and saves Base64URL', async () => {
    const push = usePushNotifications()
    const pending = push.subscribe()
    expect(permission.requestPermission).toHaveBeenCalledOnce()
    expect(api.fetchPublic).not.toHaveBeenCalled()
    await pending
    const [, options] = api.fetchWithAuth.mock.calls.find(([path]) => path.endsWith('/subscribe'))!
    expect(JSON.parse(options.body).keys).toEqual({ p256dh: '-_8APg', auth: '-_8APg' })
    expect(push.isSubscribed.value).toBe(true)
  })
  it('handles denied permission without contacting the server', async () => {
    permission.requestPermission.mockResolvedValue('denied')
    const push = usePushNotifications()
    await push.subscribe()
    expect(push.permission.value).toBe('denied')
    expect(push.canSubscribe.value).toBe(false)
    expect(api.fetchPublic).not.toHaveBeenCalled()
    expect(push.busy.value).toBe(false)
  })
  it('does not equate a browser subscription with an active server subscription', async () => {
    active = subscription
    permission.permission = 'granted'
    const push = usePushNotifications()
    await push.refresh()
    expect(push.isSubscribed.value).toBe(false)
    expect(push.hasBrowserSubscription.value).toBe(true)
    await push.subscribe()
    expect(worker.pushManager.subscribe).not.toHaveBeenCalled()
    expect(push.isSubscribed.value).toBe(true)
  })
  it('can repair a server-save failure without duplicate browser subscriptions', async () => {
    api.fetchWithAuth.mockImplementationOnce(() => json({}, 503))
    const push = usePushNotifications()
    await push.subscribe()
    expect(push.isSubscribed.value).toBe(false)
    expect(push.error.value).toBe('server')
    await push.subscribe()
    expect(push.isSubscribed.value).toBe(true)
    expect(worker.pushManager.subscribe).toHaveBeenCalledOnce()
  })
  it('bounds worker readiness and lets the user retry', async () => {
    vi.useFakeTimers()
    navigator.serviceWorker.ready = new Promise(() => {})
    const push = usePushNotifications()
    const pending = push.refresh()
    await vi.advanceTimersByTimeAsync(12001)
    await pending
    expect(push.error.value).toBe('timeout')
    expect(push.busy.value).toBe(false)
  })
  it('targets only the enabled current device and selected locale for tests', async () => {
    const push = usePushNotifications()
    await push.subscribe()
    await push.sendTestNotification('en')
    expect(JSON.parse(api.fetchWithAuth.mock.calls.at(-1)![1].body)).toEqual({ endpoint: subscription.endpoint, locale: 'en' })
    expect(push.testSent.value).toBe(true)
    await push.unsubscribe()
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(push.isSubscribed.value).toBe(false)
  })
  it('keeps a failed disable retryable without falsely showing disabled', async () => {
    const push = usePushNotifications()
    await push.subscribe()
    api.fetchWithAuth.mockImplementationOnce(() => json({}, 503))
    await push.unsubscribe()
    expect(push.isSubscribed.value).toBe(true)
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
    await push.unsubscribe()
    expect(push.isSubscribed.value).toBe(false)
  })
  it('revokes locally on logout even when the server is unreachable', async () => {
    active = subscription
    const closed = vi.fn()
    worker.getNotifications.mockResolvedValue([{ close: closed }])
    await removeDevicePushOnLogout(async () => { throw new Error('offline') })
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(closed).toHaveBeenCalledOnce()
    expect(navigator.clearAppBadge).toHaveBeenCalled()
  })
  it('discards a subscription if the account changes during browser registration', async () => {
    worker.pushManager.subscribe.mockImplementation(async () => { auth.user.value = { id: 2 }; return subscription })
    const push = usePushNotifications()
    await push.subscribe()
    expect(push.isSubscribed.value).toBe(false)
    expect(push.error.value).toBe('account')
    expect(api.fetchWithAuth).not.toHaveBeenCalled()
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })
})
