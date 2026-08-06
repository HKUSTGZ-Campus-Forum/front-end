import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'


describe('scheduler authentication readiness', () => {
  it('waits for restored authentication before loading the persisted cart', () => {
    const authSource = readFileSync(
      new URL('../../composables/useAuth.ts', import.meta.url),
      'utf8',
    )
    const plannerSource = readFileSync(
      new URL('../../pages/courses/planner/[semester].vue', import.meta.url),
      'utf8',
    )

    expect(authSource).toContain('const authInitialized = ref(false)')
    expect(authSource).toContain('authInitialized.value = true')
    expect(plannerSource).toContain('watch([authInitialized, isLoggedIn]')
    expect(plannerSource).toContain('if (!ready) return')
  })
})
