import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  TIMETABLE_CARD_INSET,
  TIMETABLE_CARD_PADDING,
  TIMETABLE_TOP_ROW_GAP,
  canInlineSection,
  canInlineSectionWidths,
  formatInlineSectionLabel,
} from '../../utils/scheduler'

/**
 * Deterministic fake measure: roughly monospace so widths scale with length.
 * The predicate is designed to be injected; the exact px/char value is
 * arbitrary as long as tests stay internally consistent.
 */
function measure(text: string): number {
  return text.length * 7
}

describe('timetable block inline section layout', () => {
  it('formats the inline label exactly like the template', () => {
    expect(formatInlineSectionLabel('LEC-03', '12345')).toBe('\u00a0· LEC-03 (12345)')
    expect(formatInlineSectionLabel('ART-C01', '88888')).toBe('\u00a0· ART-C01 (88888)')
  })

  it('derives the content budget from card inset and padding', () => {
    // contentWidth = columnWidth - inset - padding*2
    const contentWidth = 150 - TIMETABLE_CARD_INSET - TIMETABLE_CARD_PADDING * 2
    expect(contentWidth).toBe(150 - 4 - 20)
  })

  it('inlines a short code + section when they fit the column', () => {
    // code "CS101" (35px) + "\u00a0· LEC-03 (12345)" (119px) + gap (2px)
    const label = formatInlineSectionLabel('LEC-03', '12345')
    expect(canInlineSection(200, 'CS101', label, measure)).toBe(true)
  })

  it('demotes to its own row when the label would overflow', () => {
    const label = formatInlineSectionLabel('ART-C01', '88888')
    // 152px column: budget = 128px; code+gap+label is 177px -> demote
    expect(canInlineSection(152, 'MSE5027', label, measure)).toBe(false)
  })

  it('is content-based, not hard-threshold-based: same width can differ', () => {
    // Same 200px column, only the label length changes the outcome.
    const shortLabel = formatInlineSectionLabel('LEC-03', '12345')
    const longLabel = formatInlineSectionLabel('INTENSIVE-WORKSHOP', '88888123')
    expect(canInlineSection(200, 'CS101', shortLabel, measure)).toBe(true)
    expect(canInlineSection(200, 'CS101', longLabel, measure)).toBe(false)
  })

  it('always inlines on a very wide column even with long content', () => {
    const label = formatInlineSectionLabel('INTENSIVE-WORKSHOP', '88888123')
    expect(canInlineSection(400, 'MSE5027-A', label, measure)).toBe(true)
  })

  it('accepts real DOM widths without reinterpreting browser font metrics', () => {
    expect(canInlineSectionWidths(200, 44.5, 118.25)).toBe(true)
    expect(canInlineSectionWidths(180, 44.5, 118.25)).toBe(false)
  })

  it('measures with rendered DOM probes and protects the course code from wrapping', () => {
    const timetable = readFileSync(
      new URL('../../components/scheduler/SchedulerTimetable.vue', import.meta.url),
      'utf8',
    )

    expect(timetable).toContain('ref="codeMeasureRef"')
    expect(timetable).toContain('ref="sectionMeasureRef"')
    expect(timetable).toContain('getBoundingClientRect().width')
    expect(timetable).not.toContain("createElement('canvas')")
    expect(timetable).toContain('flex: 0 0 auto;')
    expect(timetable).toContain('white-space: nowrap;')
  })
})
