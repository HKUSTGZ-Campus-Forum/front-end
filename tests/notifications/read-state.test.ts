import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
vi.mock('../../composables/useApi', () => ({ useApi: () => ({ fetchWithAuth }) }))
vi.mock('../../composables/useAuth', () => ({ useAuth: () => ({ user }) }))
vi.mock('../../utils/pushNotifications', () => ({ setNotificationBadge: vi.fn(async () => {}) }))
import { useNotifications } from '../../composables/useNotifications'
const fetchWithAuth = vi.fn()
const user = ref<{ id: number } | null>({ id: 1 })
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
const deferred = () => { let resolve!: (value: Response) => void; const promise = new Promise<Response>(r => { resolve = r }); return { promise, resolve } }
beforeEach(() => {
  vi.clearAllMocks(); user.value = { id: 1 }
  const states = new Map()
  vi.stubGlobal('useState', (key: string, initial: () => unknown) => { if (!states.has(key)) states.set(key, ref(initial())); return states.get(key) })
})
afterEach(() => vi.unstubAllGlobals())
describe('automatic inbox read synchronization', () => {
  it('marks the loaded records and shared bell count only after server success', async () => {
    const inbox = useNotifications(); const bell = useNotifications()
    inbox.notifications.value = [{ id: 1, read: false }] as any
    bell.unreadCount.value = 45
    const write = deferred(); fetchWithAuth.mockReturnValueOnce(write.promise)
    const pending = inbox.markAllAsRead()
    expect(bell.unreadCount.value).toBe(45)
    write.resolve(json({})); await pending
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/notifications/mark-all-read', { method: 'PUT' })
    expect(bell.unreadCount.value).toBe(0)
    expect(inbox.notifications.value[0].read).toBe(true)
  })
  it.each(['before', 'during'])('does not restore a stale bell count from a request started %s the write', async (when) => {
    const inbox = useNotifications(); const bell = useNotifications()
    const count = deferred(); const write = deferred()
    fetchWithAuth.mockImplementation((url) => url.endsWith('unread-count') ? count.promise : write.promise)
    let read: Promise<unknown>; let poll: Promise<unknown>
    if (when === 'before') { poll = bell.fetchUnreadCount(); read = inbox.markAllAsRead() }
    else { read = inbox.markAllAsRead(); poll = bell.fetchUnreadCount() }
    write.resolve(json({})); await read
    count.resolve(json({ unread_count: 45 })); await poll
    expect(bell.unreadCount.value).toBe(0)
    fetchWithAuth.mockResolvedValueOnce(json({ unread_count: 1 }))
    await bell.fetchUnreadCount()
    expect(bell.unreadCount.value).toBe(1)
  })
  it('keeps notification content and unread state on failure, allowing retry', async () => {
    const inbox = useNotifications()
    inbox.notifications.value = [{ id: 1, read: false }] as any; inbox.unreadCount.value = 45
    fetchWithAuth.mockResolvedValueOnce(json({ error: 'Offline' }, 503))
    await expect(inbox.markAllAsRead()).rejects.toThrow('Offline')
    expect(inbox.error.value).toBeNull()
    expect(inbox.notifications.value[0].read).toBe(false)
    expect(inbox.unreadCount.value).toBe(45)
    fetchWithAuth.mockResolvedValueOnce(json({})); await inbox.markAllAsRead()
    expect(inbox.unreadCount.value).toBe(0)
  })
  it('does not clear another account count after an account switch', async () => {
    const inbox = useNotifications(); const write = deferred()
    fetchWithAuth.mockReturnValueOnce(write.promise)
    const pending = inbox.markAllAsRead()
    user.value = { id: 2 }; inbox.unreadCount.value = 3
    write.resolve(json({})); await pending
    expect(inbox.unreadCount.value).toBe(3)
  })
})
