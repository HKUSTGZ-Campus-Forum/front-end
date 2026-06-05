import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = () => readFileSync(
  new URL('../../components/scheduler/SchedulerCartPanel.vue', import.meta.url),
  'utf8',
)

describe('scheduler cart panel', () => {
  it('loads subject chips dynamically instead of rendering a fixed common-subject list', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain('getSubjects')
    expect(cartPanelSource).toContain('subjectFilters')
    expect(cartPanelSource).not.toContain('FREQUENT_SUBJECTS')
  })

  it('keeps add and remove actions as fixed circular icon buttons', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain('inline-size: 40px')
    expect(cartPanelSource).toContain('block-size: 40px')
    expect(cartPanelSource).toContain('min-inline-size: 40px')
    expect(cartPanelSource).toContain('min-block-size: 40px')
    expect(cartPanelSource).toContain('aspect-ratio: 1')
    expect(cartPanelSource).toContain('box-sizing: border-box')
    expect(cartPanelSource).toContain('border-radius: 50%')
  })
})
