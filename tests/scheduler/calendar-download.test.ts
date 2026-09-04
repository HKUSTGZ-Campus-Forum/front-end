import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadSchedulerCalendar } from '../../utils/schedulerCalendarDownload'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function browserDownload() {
  vi.useFakeTimers()
  const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
  const appendChild = vi.fn()
  const createElement = vi.fn(() => anchor)
  vi.stubGlobal('document', { createElement, body: { appendChild } })
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:calendar-test')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  return { anchor, appendChild, createElement, create, revoke }
}

describe('scheduler calendar browser download', () => {
  it('downloads an exact UTF-8 calendar blob with its supplied filename, then releases the object URL', async () => {
    const browser = browserDownload()
    const content = 'BEGIN:VCALENDAR\r\nX-WR-CALNAME:课程\r\nEND:VCALENDAR\r\n'
    downloadSchedulerCalendar(content, 'unikorn-2610.ics')

    expect(browser.createElement).toHaveBeenCalledWith('a')
    const blob = browser.create.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/calendar;charset=utf-8')
    expect(await blob.text()).toBe(content)
    expect(browser.anchor.href).toBe('blob:calendar-test')
    expect(browser.anchor.download).toBe('unikorn-2610.ics')
    expect(browser.appendChild).toHaveBeenCalledWith(browser.anchor)
    expect(browser.anchor.click).toHaveBeenCalledOnce()
    expect(browser.anchor.remove).toHaveBeenCalledOnce()
    expect(browser.revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(browser.revoke).toHaveBeenCalledWith('blob:calendar-test')
  })

  it.each(['append', 'click'] as const)('cleans up after a failed %s so the UI can report the failure', (stage) => {
    const browser = browserDownload()
    const error = new Error('Download unavailable')
    const action = stage === 'append' ? browser.appendChild : browser.anchor.click
    action.mockImplementation(() => { throw error })
    expect(() => downloadSchedulerCalendar('data', 'plan.ics')).toThrow(error)
    expect(browser.anchor.remove).toHaveBeenCalledOnce()
    vi.runAllTimers()
    expect(browser.revoke).toHaveBeenCalledOnce()
  })
})
