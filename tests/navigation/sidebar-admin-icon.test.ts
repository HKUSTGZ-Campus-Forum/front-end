import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sidebarSource = () => readFileSync(
  new URL('../../components/home/KeguangSidebar.vue', import.meta.url),
  'utf8',
)

const adminIconSource = () => readFileSync(
  new URL('../../public/icons/sidebar_adminlogo.svg', import.meta.url),
  'utf8',
)

describe('Keguang sidebar admin entry', () => {
  it('uses a distinct shield-user icon instead of the regular user icon', () => {
    const source = sidebarSource()

    expect(source).toContain('src="/icons/sidebar_userlogo.svg"')
    expect(source).toContain('src="/icons/sidebar_adminlogo.svg"')
    expect(adminIconSource()).toContain('<circle cx="12" cy="11" r="4" />')
  })
})
