import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = () => readFileSync(
  new URL('../../components/scheduler/SchedulerSidePanel.vue', import.meta.url),
  'utf8',
)

describe('scheduler side-panel filter UI', () => {
  it('colors the "[inactive]" filter state gray instead of accent', () => {
    const src = source()
    // Bind the gray variant only when the filter is off.
    expect(src).toContain("'side-panel__tip-state--inactive': !filterMode")
    expect(src).toContain('filterTipInactive')
    expect(src).toContain('&--inactive {')
    expect(src).toContain('color: var(--text-secondary);')
  })

  it('keeps the active filter state on the accent color', () => {
    const src = source()
    expect(src).toContain('filterTipActive')
    expect(src).toContain('&__tip-state {')
    expect(src).toContain('color: var(--interactive-active-text);')
  })

  it('hosts a clickable clear-all button that emits clear-bans', () => {
    const src = source()
    expect(src).toContain("t('scheduler.clearAll')")
    expect(src).toContain("emit('clear-bans')")
    expect(src).toContain("__clear-all")
    // The button carries an icon so it is visually actionable.
    expect(src).toContain('side-panel__clear-all-icon')
  })

  it('exposes the interactive filter card to pointer, keyboard, and touch users', () => {
    const src = source()
    expect(src).toContain(':aria-expanded="showFilterTip"')
    expect(src).toContain(':aria-controls="filterTipId"')
    expect(src).toContain('@focusin="filterFocusWithin = true"')
    expect(src).toContain('@keydown.esc.stop.prevent="closeFilterTip"')
    expect(src).toContain('role="region"')
    expect(src).not.toContain('role="tooltip"')
    expect(src).toContain('pointer-events: auto;')
    expect(src).toContain('&::after {')
  })

  it('emphasizes the tooltip border when filter mode is on', () => {
    const src = source()
    expect(src).toContain('side-panel__tip--active')
    expect(src).toContain("'side-panel__tip--active': filterMode")
    expect(src).toContain('&--active {')
    expect(src).toContain('border-color: var(--interactive-primary);')
  })

  it('uses a defined white-on-blue token for the hovered clear-all button text', () => {
    const src = source()
    const theme = readFileSync(
      new URL('../../assets/css/variables.scss', import.meta.url),
      'utf8',
    )
    // The hover text must be white on the solid blue interactive background in
    // dark mode too, so it uses --text-on-interactive (defined in the theme),
    // not the theme-varying --text-inverse and not the never-defined token.
    expect(src).toContain('color: var(--text-on-interactive);')
    expect(src).not.toContain('var(--text-inverse)')
    expect(theme).toContain('--text-on-interactive: #ffffff;')
  })

  it('uses the white-on-blue token for the primary cart button text', () => {
    const src = source()
    expect(src).toContain('color: var(--text-on-interactive);')
    expect(src).not.toContain('var(--text-inverse)')
  })
})
