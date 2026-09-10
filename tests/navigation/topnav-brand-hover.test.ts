import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pinnedSource = () => readFileSync(
  new URL('../../components/home/KeguangPinned.vue', import.meta.url),
  'utf8',
)

/**
 * The top nav brand used to draw a 1px border plus a background fill on hover,
 * which read as a heavy card in the 64px bar. The affordance is now a soft glow
 * with no movement, so guard against the framed treatment returning.
 */
describe('Keguang top nav brand hover', () => {
  it('keeps the brand hover free of a border and background fill', () => {
    const source = pinnedSource()
    const brandBlock = source.slice(
      source.indexOf('.kg-topnav__brand {'),
      source.indexOf('.kg-topnav__right {'),
    )

    expect(brandBlock).not.toContain('border: 1px solid transparent')
    expect(brandBlock).not.toContain('border-color: var(--border-primary)')
    expect(brandBlock).not.toContain('background: var(--surface-secondary)')
    expect(source).not.toContain('.kg-topnav__brand:hover')
  })

  it('uses a soft glow, with no scale or lift movement, as the hover cue', () => {
    const source = pinnedSource()
    const brandBlock = source.slice(
      source.indexOf('.kg-topnav__brand {'),
      source.indexOf('.kg-topnav__right {'),
    )

    expect(source).toContain('drop-shadow(0 0 10px color-mix(in srgb, var(--interactive-primary) 45%, transparent))')
    expect(brandBlock).not.toContain('transform:')
    expect(brandBlock).not.toContain('translateY')
  })

  it('animates only the glow opacity so the glow color never interpolates', () => {
    const source = pinnedSource()
    const brandBlock = source.slice(
      source.indexOf('.kg-topnav__brand {'),
      source.indexOf('.kg-topnav__right {'),
    )

    // Interpolating the shadow color sweeps a color-mix() result through a
    // dark near-black tint. The glow must therefore be a separate layer whose
    // opacity fades, with no `filter` transition on the image itself.
    expect(brandBlock).toContain('.kg-topnav__glow')
    expect(brandBlock).toContain('transition: opacity 0.2s ease-out')
    expect(brandBlock).not.toContain('transition: filter')
    expect(brandBlock).not.toMatch(/img\s*\{[^}]*filter:/)
  })

  it('renders the glow copy with a theme-matched logo image', () => {
    const source = pinnedSource()

    const glowIndex = source.indexOf('.kg-topnav__glow')
    expect(glowIndex).toBeGreaterThan(-1)
    expect(source).toContain("url('/icons/topbar_logo.svg')")
    expect(source).toContain("url('/icons/topbar_logo_w.svg')")
    expect(source).toContain("url('/favicon-white.ico')")
  })

  it('drops the glow fade under reduced motion', () => {
    const source = pinnedSource()
    const reducedMotionBlock = source.slice(source.indexOf('@media (prefers-reduced-motion: reduce)'))

    expect(reducedMotionBlock).toContain('.kg-topnav__brand-logo .kg-topnav__glow')
    expect(reducedMotionBlock).toContain('transition: none')
  })

  it('keeps a visible focus ring for keyboard users', () => {
    expect(pinnedSource()).toContain('outline: 2px solid var(--border-focus)')
  })
})
