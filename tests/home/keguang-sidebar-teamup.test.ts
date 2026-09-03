import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = () => readFileSync(
  new URL('../../components/home/KeguangSidebar.vue', import.meta.url),
  'utf8',
)

describe('Keguang sidebar team entry', () => {
  it('replaces the legacy matching entry with the TeamUp route', () => {
    const sidebar = source()

    expect(sidebar).toContain(":href=\"getLocalePath('/teamup')\"")
    expect(sidebar).toContain("active: isActive('/teamup')")
    expect(sidebar).toContain('@click.stop')
    expect(sidebar).toContain('v-if="teamupEnabled"')
    expect(sidebar).toContain('config.public.teamupEnabled === true')
    expect(sidebar).toContain('/icons/sidebar_matching.svg')
    expect(sidebar).toContain("t('nav.teamMatching')")
    expect(sidebar).not.toContain("getLocalePath('/matching')")
    expect(sidebar).not.toContain('/icons/sidebar_teamup.svg')
    expect(sidebar).not.toContain("t('nav.teamup')")
  })
})
