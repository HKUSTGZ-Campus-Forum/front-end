import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('scheduler hover section time-slot preview', () => {
  it('draws a dashed overlay rectangle per lecture of the hovered bundle', () => {
    const timetable = source('../../components/scheduler/SchedulerTimetable.vue')
    // Preview rects resolve the hovered bundle and emit one rect per lecture.
    expect(timetable).toContain('previewRects')
    expect(timetable).toContain("previewSectionEnabled")
    expect(timetable).toContain('bundle.sections')
    expect(timetable).toContain('getTopOffset(lecture.start_time)')
    expect(timetable).toContain('getHeight(lecture.start_time, lecture.end_time)')
    // Overlay element is a neutral-gray dashed outline above lectures (theme-
    // adaptive, no blue, no interior fill, no pulsing animation).
    expect(timetable).toContain('timetable__preview')
    expect(timetable).toContain('border: 2px dashed')
    expect(timetable).toContain('var(--text-primary)')
    expect(timetable).toContain('pointer-events: none;')
    expect(timetable).toContain('z-index: 20;')
    expect(timetable).not.toContain('timetable-preview-pulse')
    // The preview rule itself carries no interior fill.
    const previewRule = timetable.slice(timetable.indexOf('&__preview {'), timetable.indexOf('&__block {'))
    expect(previewRule).not.toMatch(/background\s*:/)
    // The outline is inflated a few px so it surrounds the card, not overlaps
    // it, and every dimension (including width) comes from the rect with the
    // right edge capped so it can never poke past the table's right boundary.
    expect(timetable).toContain('Inflate a few px beyond the card bounds')
    expect(timetable).toContain('width: `${rect.width}px`')
    expect(timetable).toContain('Math.min(dayColWidth.value + 2')
    expect(timetable).toContain('timetableContentWidth.value - left')
  })

  it('is gated by the preview toggle and a hovered bundle', () => {
    const timetable = source('../../components/scheduler/SchedulerTimetable.vue')
    expect(timetable).toContain(
      'if (!props.previewSectionEnabled || !props.previewSection) return []',
    )
  })

  it('emits preview enter/leave from the bundle capsule and forwards through the panel', () => {
    const card = source('../../components/scheduler/SchedulerCourseCard.vue')
    expect(card).toContain("@mouseenter=\"emit('preview-bundle'")
    expect(card).toContain("@mouseleave=\"emit('clear-preview')\"")
    expect(card).toContain("(e: 'preview-bundle'")
    expect(card).toContain("(e: 'clear-preview'")

    const panel = source('../../components/scheduler/SchedulerSidePanel.vue')
    expect(panel).toContain('@clear-preview="emit(\'clear-preview\')"')
  })

  it('defaults the preview toggle to on and persists it in the dashboard', () => {
    const dashboard = source('../../components/scheduler/SchedulerDashboard.vue')
    expect(dashboard).toContain('const previewSectionEnabled = ref(true)')
    expect(dashboard).toContain("PREVIEW_SECTION_ENABLED_STORAGE_KEY")
    expect(dashboard).toContain('preview-section-enabled')
    expect(dashboard).toContain('onPreviewBundle')
    expect(dashboard).toContain('onClearPreview')
  })

  it('exposes the preview toggle inside the menu', () => {
    const panel = source('../../components/scheduler/SchedulerSidePanel.vue')
    expect(panel).toContain("t('scheduler.previewSectionTimeSlots')")
    expect(panel).toContain('update:preview-section-enabled')
  })
})
