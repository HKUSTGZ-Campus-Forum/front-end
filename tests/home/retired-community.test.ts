import { describe, expect, it } from 'vitest'
import { retiredCommunityDestination } from '../../utils/retiredCommunity'

describe('retired public community destinations', () => {
  for (const prefix of ['', '/en']) {
    it.each(['/forum', '/forum/', '/forum/posts/305', '/forum/postMessage', '/gugu', '/feedback', '/feedback/create', '/feedback/merge-requests/1', '/club', '/activity'])('retires %s including localized deep links', (path) => {
      expect(retiredCommunityDestination(`${prefix}${path}`)).toBe(`${prefix}/announcements`)
    })
    it('retires community rules', () => {
      expect(retiredCommunityDestination(`${prefix}/help/rules`)).toBe(`${prefix}/help/guide`)
    })
  }
  it.each(['/api/posts', '/api/forum', '/announcements', '/announcements/create', '/admin/feedback', '/courses', '/help/privacy', '/forum-tools'])('preserves %s', (path) => {
    expect(retiredCommunityDestination(path)).toBeNull()
  })
  it.each(['/FORUM/posts/1', '/%66orum/posts/1', '/forum%2Fposts%2F1', '//forum/posts/1'])('handles equivalent URL encodings: %s', (path) => {
    expect(retiredCommunityDestination(path)).toBe('/announcements')
  })
})
