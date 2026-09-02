import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('TeamUp native host page', () => {
  it('uses the real Keguang layout for root and deep routes', () => {
    for (const page of ['pages/teamup/index.vue', 'pages/teamup/[...path].vue']) {
      const source = read(page)
      expect(source).toContain("definePageMeta({ layout: 'keguang' })")
      expect(source).toContain('<TeamUpHostPage />')
    }
  })

  it('embeds only the reviewed TeamUp content runtime', () => {
    const source = read('components/teamup/TeamUpHostPage.vue')
    expect(source).toContain("'/teamup/app/health'")
    expect(source).toContain('`/teamup/app${path}`')
    expect(source).toContain("type: 'unikorn:teamup:state'")
    expect(source).toContain("message.type === 'teamup:navigate'")
    expect(source).toContain('event.origin !== window.location.origin')
    expect(source).not.toContain('allow-top-navigation')
  })

  it('shows native loading and retry states when the runtime is unavailable', () => {
    const source = read('components/teamup/TeamUpHostPage.vue')
    expect(source).toContain('teamup-host__loading')
    expect(source).toContain('teamupIntegration.loadErrorTitle')
    expect(source).toContain('@click="loadFrame"')
    expect(source).toContain('prefers-reduced-motion: reduce')
  })
})
