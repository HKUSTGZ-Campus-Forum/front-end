import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MEETCAMPUS_BETA_EMAILS,
  canSeeMeetCampusNavigation,
  getMeetCampusHref,
} from '../../utils/meetcampusNavigation'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('MeetCampus private-beta navigation', () => {
  it('shows the entry only to the two signed-in, verified beta accounts', () => {
    for (const email of MEETCAMPUS_BETA_EMAILS) {
      expect(canSeeMeetCampusNavigation(true, {
        email: `  ${email.toUpperCase()}  `,
        email_verified: true,
        is_deleted: false,
      })).toBe(true)
    }

    const mount = {
      email: MEETCAMPUS_BETA_EMAILS[0],
      email_verified: true,
      is_deleted: false,
    }
    expect(canSeeMeetCampusNavigation(false, mount)).toBe(false)
    expect(canSeeMeetCampusNavigation(true, { ...mount, email_verified: false })).toBe(false)
    expect(canSeeMeetCampusNavigation(true, { ...mount, is_deleted: true })).toBe(false)
    expect(canSeeMeetCampusNavigation(true, {
      ...mount,
      email: 'other@connect.hkust-gz.edu.cn',
    })).toBe(false)
    expect(canSeeMeetCampusNavigation(true, null)).toBe(false)
  })

  it('uses the independent app paths for both supported locales', () => {
    expect(getMeetCampusHref('zh')).toBe('/meetcampus/')
    expect(getMeetCampusHref('en')).toBe('/meetcampus/en/')
    expect(getMeetCampusHref('en-US')).toBe('/meetcampus/en/')
  })

  it('keeps only a client-gated hard navigation link in the UniKorn shell', () => {
    const sidebar = source('../../components/home/KeguangSidebar.vue')
    const anchor = sidebar.match(/<a\s+:href="meetCampusHref">[\s\S]*?<\/a>/)?.[0]

    expect(sidebar).toContain('<ClientOnly>')
    expect(sidebar).toContain('v-if="hasMeetCampusBetaAccess"')
    expect(sidebar).toContain('canSeeMeetCampusNavigation(isLoggedIn.value, user.value)')
    expect(anchor).toBeDefined()
    expect(anchor).toContain('lucide:map-pinned')
    expect(anchor).toContain("t('nav.meetCampus')")
    expect(sidebar).not.toContain("getLocalePath('/meetcampus')")
  })

  it('keeps the private-beta label bilingual', () => {
    const zh = JSON.parse(source('../../i18n/locales/zh.json'))
    const en = JSON.parse(source('../../i18n/locales/en.json'))

    expect(zh.nav.meetCampus).toBe('MeetCampus 内测')
    expect(en.nav.meetCampus).toBe('MeetCampus beta')
  })
})
