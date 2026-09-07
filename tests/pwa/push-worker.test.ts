import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')
function worker() {
  const handlers: Record<string, (event: any) => void> = {}
  const showNotification = vi.fn(async () => {})
  const navigator = { setAppBadge: vi.fn(async () => {}), clearAppBadge: vi.fn(async () => {}) }
  const clients = { matchAll: vi.fn(async () => []), openWindow: vi.fn(async () => {}) }
  runInNewContext(source, { self: { location: new URL('https://unikorn.test/sw.js'),
    registration: { showNotification }, navigator, clients,
    addEventListener: (type: string, handler: any) => { handlers[type] = handler } }, URL, console })
  const dispatch = async (type: string, data: any) => {
    const pending: Promise<unknown>[] = []
    handlers[type]({ ...data, waitUntil: (p: Promise<unknown>) => pending.push(p) })
    await Promise.all(pending)
  }
  return { dispatch, showNotification, navigator, clients }
}
describe('visible Web Push and safe notification navigation', () => {
  it('displays real messages and awaits background badging', async () => {
    const w = worker()
    await w.dispatch('push', { data: { json: () => ({ title: 'A reply', body: 'Hello', unread_count: 3, data: { url: '/forum/posts/12' } }) } })
    expect(w.showNotification).toHaveBeenCalledWith('A reply', expect.objectContaining({ body: 'Hello', data: { url: '/forum/posts/12' } }))
    expect(w.navigator.setAppBadge).toHaveBeenCalledWith(3)
  })
  it('never emits an empty notification for old badge-only or malformed data', async () => {
    const w = worker()
    await w.dispatch('push', { data: { json: () => ({ title: '', body: '', silent: true }) } })
    expect(w.showNotification.mock.calls[0][0]).toBe('UniKorn')
    expect(w.showNotification.mock.calls[0][1].body.length).toBeGreaterThan(0)
    await w.dispatch('push', { data: { json: () => { throw new Error('bad data') } } })
    expect(w.showNotification).toHaveBeenCalledTimes(2)
  })
  it('still displays when optional badge APIs fail', async () => {
    const w = worker()
    w.navigator.setAppBadge.mockRejectedValueOnce(new Error('denied'))
    await w.dispatch('push', { data: { json: () => ({ title: 'Hi', unread_count: 1 }) } })
    expect(w.showNotification).toHaveBeenCalledOnce()
  })
  it.each(['https://evil.test', '//evil.test/x', '/\\evil.test', '/api/auth/logout', '/meetcampus/', 'javascript:alert(1)'])(
    'rejects untrusted or non-notification target %s', async url => {
      const w = worker()
      await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url } } })
      expect(w.clients.openWindow).toHaveBeenCalledWith('https://unikorn.test/notifications')
    },
  )
  it('focuses an exact destination but never navigates an unrelated open editor', async () => {
    const w = worker()
    const focus = vi.fn()
    const navigate = vi.fn()
    w.clients.matchAll.mockResolvedValue([{ url: 'https://unikorn.test/forum/postMessage', focus, navigate }] as any)
    await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: '/en/forum/posts/12#comment-8' } } })
    expect(navigate).not.toHaveBeenCalled()
    expect(w.clients.openWindow).toHaveBeenCalledWith('https://unikorn.test/en/forum/posts/12#comment-8')
    w.clients.matchAll.mockResolvedValue([{ url: 'https://unikorn.test/notifications', focus, navigate }] as any)
    await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: {} } })
    expect(focus).toHaveBeenCalledOnce()
  })
  it('clears badges through a foreground message without network/auth access', async () => {
    const w = worker()
    await w.dispatch('message', { data: { type: 'CLEAR_BADGE' } })
    expect(w.navigator.clearAppBadge).toHaveBeenCalledOnce()
  })
})
