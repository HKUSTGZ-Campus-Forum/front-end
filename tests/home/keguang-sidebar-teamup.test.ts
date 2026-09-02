import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = () => readFileSync(
  new URL('../../components/home/KeguangSidebar.vue', import.meta.url),
  'utf8',
)

describe('Keguang sidebar TeamUp entry', () => {
  it('uses the native Nuxt route behind a runtime flag', () => {
    const sidebar = source()

    expect(sidebar).toContain("<NuxtLink :to=\"getLocalePath('/teamup')\"")
    expect(sidebar).toContain("active: isActive('/teamup')")
    expect(sidebar).toContain('v-if="teamupEnabled"')
    expect(sidebar).toContain('config.public.teamupEnabled === true')
    expect(sidebar).toContain("t('nav.teamup')")
  })
})
