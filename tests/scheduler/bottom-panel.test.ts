import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { clampSchedulerPlanIndex } from '../../utils/schedulerPlanNavigation'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n?/g, '\n')
}

describe('scheduler bottom panel plan index', () => {
  it('clamps an edited index to the available one-based range', () => {
    expect(clampSchedulerPlanIndex(7, 12)).toBe(7)
    expect(clampSchedulerPlanIndex('0', 12)).toBe(1)
    expect(clampSchedulerPlanIndex('-5', 12)).toBe(1)
    expect(clampSchedulerPlanIndex('99', 12)).toBe(12)
    expect(clampSchedulerPlanIndex('4.9', 12)).toBe(4)
  })

  it('uses the current index for empty or invalid edits and zero for an empty result set', () => {
    expect(clampSchedulerPlanIndex('', 12, 8)).toBe(8)
    expect(clampSchedulerPlanIndex('not-a-number', 12, 8)).toBe(8)
    expect(clampSchedulerPlanIndex('', 12, 'invalid')).toBe(1)
    expect(clampSchedulerPlanIndex(5, 0)).toBe(0)
    expect(clampSchedulerPlanIndex(5, -1)).toBe(0)
  })

  it('keeps direct editing and accessible slider controls wired without whitespace-sensitive assertions', () => {
    const panel = source('../../components/scheduler/SchedulerBottomPanel.vue')

    expect(panel).toContain('data-testid="scheduler-plan-index-input"')
    expect(panel).toContain('@blur="commitIndexEdit"')
    expect(panel).toContain('@keydown.enter.prevent="commitIndexEdit"')
    expect(panel).toContain('@keydown.esc.prevent="cancelIndexEdit"')
    expect(panel).toContain(':disabled="totalPlans <= 0"')
    expect(panel).toContain('role="slider"')
    expect(panel).toContain(':aria-valuenow="displayedIndex"')
    expect(panel).toContain('@keydown="onSliderKeyDown"')
    expect(panel).toContain('@pointerdown="onSliderPointerDown"')
    expect(panel).toContain('@pointermove="onSliderPointerMove"')
    expect(panel).toContain('setPointerCapture(event.pointerId)')
    expect(panel).toContain('touch-action: none;')
  })
})
