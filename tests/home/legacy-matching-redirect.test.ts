import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('../../middleware/legacy-matching-redirect.global.ts', import.meta.url),
  'utf8',
)

describe('legacy matching route compatibility', () => {
  it('redirects Chinese and English matching routes to TeamUp', () => {
    expect(source).toContain("/^\\/(en\\/)?matching(?:\\/|$)/")
    expect(source).toContain("match[1] ? '/en/teamup' : '/teamup'")
    expect(source).toContain('query: to.query')
    expect(source).toContain('hash: to.hash')
    expect(source).toContain('redirectCode: 308')
    expect(source).toContain('replace: true')
  })
})
