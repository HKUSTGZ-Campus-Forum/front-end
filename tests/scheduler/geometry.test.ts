import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  getCourseTimetableColors,
  getHeight,
  getSchedulerMapLinePath,
  getTopOffset,
} from '../../utils/scheduler'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('scheduler timetable geometry', () => {
  it('expresses offsets and heights in 90-minute row units', () => {
    expect(getTopOffset(900)).toBe(0)
    expect(getTopOffset(1030)).toBe(1)
    expect(getTopOffset(1200)).toBe(2)
    expect(getTopOffset(1000)).toBeCloseTo(2 / 3)

    expect(getHeight(900, 1030)).toBe(1)
    expect(getHeight(900, 1200)).toBe(2)
    expect(getHeight(900, 945)).toBe(0.5)
  })

  it('sizes the visual grid from the reactive day and row dimensions', () => {
    const timetable = source('../../components/scheduler/SchedulerTimetable.vue')

    expect(timetable).toContain(':style="timetableGridStyle"')
    expect(timetable).toContain('backgroundSize: `${dayColWidth.value}px ${rowHeight.value}px`')
    expect(timetable).not.toContain('background-size: calc((100% - 52px) / 5)')
  })

  it('keeps filter cells above lecture blocks so every period remains clickable', () => {
    const timetable = source('../../components/scheduler/SchedulerTimetable.vue')
    const cellRule = timetable.slice(
      timetable.indexOf('&__cell {'),
      timetable.indexOf('&__empty {'),
    )

    expect(cellRule).toContain('z-index: 30')
  })

  it('derives a soft pastel palette per course in light and dark themes', () => {
    const light = getCourseTimetableColors(0, false)
    expect(light.background).toBe('hsl(0, 40%, 85%)')
    expect(light.text).toBe('hsl(0, 40%, 30%)')
    expect(light.accent).toBe('hsl(0, 20%, 38%)')

    const dark = getCourseTimetableColors(0, true)
    expect(dark.background).toBe('hsl(0, 25%, 70%)')
    expect(dark.text).toBe('hsl(0, 25%, 30%)')

    // Different courses resolve to different hues.
    expect(getCourseTimetableColors(1).background).not.toBe(getCourseTimetableColors(0).background)
  })
})

describe('scheduler map geometry', () => {
  it('routes a line orthogonally through its persisted elbow coordinate', () => {
    expect(getSchedulerMapLinePath(
      { x_coordinate: 100, y_coordinate: 120 },
      { x_coordinate: 520, y_coordinate: 240 },
      340,
    )).toBe('M 100,120 H 340 V 240 H 520')
  })

  it('renders routed paths instead of center-to-center SVG lines', () => {
    const map = source('../../components/scheduler/SchedulerMap.vue')

    expect(map).toContain(':d="getLinePath(line)"')
    expect(map).toContain('getSchedulerMapLinePath(start, end, line.x_coordinate)')
    expect(map).not.toContain(':x1="componentMap[line.start_id]')
  })
})
