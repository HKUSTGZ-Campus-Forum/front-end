import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = () => readFileSync(
  new URL('../../components/home/KeguangSidebar.vue', import.meta.url),
  'utf8',
)

describe('Keguang sidebar creative spaces entry', () => {
  it('opens MakerSpace and keeps TeamUp within the active section', () => {
    const sidebar = source()
    expect(sidebar).toContain(":to=\"getLocalePath('/makerspace')\"")
    expect(sidebar).toContain("isActive('/makerspace') || isActive('/teamup')")
    expect(sidebar).toContain("t('nav.makerspace')")
    expect(sidebar).not.toContain("t('nav.teamMatching')")
    expect(sidebar).not.toContain('v-if="teamupEnabled"')
  })
})
