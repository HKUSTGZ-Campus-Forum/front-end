import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CartCourse, PlanSelection, SchedulerLecture, SchedulerSection } from '../../utils/scheduler'
import { buildSchedulerCalendar } from '../../utils/schedulerCalendar'

const NOW = new Date('2026-09-03T10:20:30.000Z')
const MONDAY = { start_date: '2026-09-07', end_date: '2026-09-07' }

function meeting(overrides: Partial<SchedulerLecture> = {}): SchedulerLecture {
  return {
    day: 1,
    start_time: 900,
    end_time: 1020,
    room: 'Room 101',
    instructor: 'Teacher A',
    date_ranges: [{ ...MONDAY }],
    ...overrides,
  }
}

function section(id: string, lectures: SchedulerLecture[], overrides: Partial<SchedulerSection> = {}): SchedulerSection {
  return {
    semester_id: '2610',
    section_id: id,
    name: id,
    bundle: 1,
    layer: 0,
    quota: 30,
    section_type: 'L',
    is_main: true,
    lectures,
    ...overrides,
  }
}

function course(code = 'AIAA1001', lectures: SchedulerLecture[] = [meeting()]): CartCourse {
  return {
    course_code: code,
    course_title: `Title of ${code}`,
    credit: 3,
    subject: 'AIAA',
    pg_course: false,
    klms_course: false,
    enabled: true,
    layers: {
      0: [{
        id: 1,
        layer: 0,
        enabled: true,
        sections: [section(`${code}-L01`, lectures)],
      }],
    },
  }
}

const selected = (courseIndex = 0, bundleId = 1, layer = 0): PlanSelection => ({
  courseIndex,
  bundleId,
  layer,
})

type CalendarOptions = Parameters<typeof buildSchedulerCalendar>[0]

function calendar(overrides: Partial<CalendarOptions> = {}) {
  return buildSchedulerCalendar({
    semesterId: '2610',
    courses: [course()],
    selections: [selected()],
    now: NOW,
    ...overrides,
  })
}

function requiredContent(result: ReturnType<typeof buildSchedulerCalendar>): string {
  expect(result.error).toBeNull()
  expect(result.content).not.toBeNull()
  return result.content!
}

function unfold(content: string): string {
  return content.replace(/\r\n[ \t]/g, '')
}

function events(content: string): string[] {
  return [...unfold(content).matchAll(/(?:^|\r\n)BEGIN:VEVENT\r\n([\s\S]*?)\r\nEND:VEVENT(?=\r\n|$)/g)]
    .map(match => match[1]!)
}

function property(event: string, name: string): string {
  const line = event.split('\r\n').find(value => value.startsWith(`${name}:`) || value.startsWith(`${name};`))
  expect(line, `${name} must exist in the calendar event`).toBeDefined()
  return line!.slice(line!.indexOf(':') + 1)
}

function decodeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, escaped: string) => /[nN]/.test(escaped) ? '\n' : escaped)
}

function starts(content: string): string[] {
  return events(content).map(event => property(event, 'DTSTART')).sort()
}

function uids(content: string): string[] {
  return events(content).map(event => property(event, 'UID')).sort()
}

afterEach(() => vi.unstubAllEnvs())

describe('scheduler calendar selected-plan data', () => {
  it('exports all sections of the chosen bundles, but no alternative bundle or unselected course', () => {
    const chosen = course('CHOSEN')
    chosen.layers[0]![0]!.sections.push(section('CHOSEN-T01', [meeting({
      day: 2,
      date_ranges: [{ start_date: '2026-09-08', end_date: '2026-09-08' }],
    })]))
    chosen.layers[0]!.push({
      id: 2,
      layer: 0,
      enabled: true,
      sections: [section('NOT-SELECTED', [meeting()], { bundle: 2 })],
    })
    chosen.layers[1] = [{
      id: 10,
      layer: 1,
      enabled: true,
      sections: [section('CHOSEN-LA1', [meeting({
        day: 3,
        date_ranges: [{ start_date: '2026-09-09', end_date: '2026-09-09' }],
      })], { bundle: 10, layer: 1 })],
    }]
    const result = calendar({
      courses: [chosen, course('UNSELECTED')],
      selections: [selected(0, 10, 1), selected()],
    })
    const content = requiredContent(result)

    expect(result.eventCount).toBe(3)
    expect(events(content)).toHaveLength(3)
    expect(starts(content)).toEqual(['20260907T010000Z', '20260908T010000Z', '20260909T010000Z'])
    expect(content).not.toContain('NOT-SELECTED')
    expect(content).not.toContain('UNSELECTED')
  })

  it('uses the explicit plan even when its course and bundle are disabled in fixed mode', () => {
    const chosen = course()
    chosen.enabled = false
    chosen.layers[0]![0]!.enabled = false
    const result = calendar({ courses: [chosen] })

    expect(events(requiredContent(result))).toHaveLength(1)
    expect(result.eventCount).toBe(1)
  })

  it.each([
    selected(-1),
    selected(1),
    selected(0, 99),
    selected(0, 1, 99),
    selected(0.5),
  ])('rejects an invalid plan selection instead of silently exporting a subset: %j', (selection) => {
    const result = calendar({ selections: [selected(), selection] })
    expect(result.error).toBe('invalid-selection')
    expect(result.content).toBeNull()
  })

  it('rejects a selected section from a different semester without exporting the valid subset', () => {
    const foreign = course('FOREIGN')
    foreign.layers[0]![0]!.sections[0]!.semester_id = '2530'
    const result = calendar({ courses: [course('CURRENT'), foreign], selections: [selected(0), selected(1)] })
    expect(result).toMatchObject({ error: 'invalid-selection', content: null, eventCount: 0 })
  })

  it('rejects a bundle whose declared layer differs from the selected layer', () => {
    const malformed = course('WRONG-LAYER')
    malformed.layers[0]![0]!.layer = 1
    const result = calendar({ courses: [malformed] })
    expect(result).toMatchObject({ error: 'invalid-selection', content: null, eventCount: 0 })
  })

  it('rejects a selected empty bundle rather than silently omitting it from a mixed plan', () => {
    const emptyBundle = course('EMPTY-BUNDLE')
    emptyBundle.layers[0]![0]!.sections = []
    const result = calendar({ courses: [course('VALID'), emptyBundle], selections: [selected(0), selected(1)] })
    expect(result).toMatchObject({ error: 'invalid-selection', content: null, eventCount: 0 })
  })

  it('deduplicates repeated selections and overlapping or repeated ranges', () => {
    const chosen = course('DEDUPE', [meeting({ date_ranges: [
      { start_date: '2026-09-07', end_date: '2026-09-21' },
      { start_date: '2026-09-14', end_date: '2026-09-28' },
      { start_date: '2026-09-07', end_date: '2026-09-21' },
    ] })])
    const result = calendar({ courses: [chosen], selections: [selected(), selected()] })
    const content = requiredContent(result)

    expect(result.eventCount).toBe(4)
    expect(starts(content)).toEqual([
      '20260907T010000Z', '20260914T010000Z', '20260921T010000Z', '20260928T010000Z',
    ])
    expect(new Set(uids(content)).size).toBe(4)
  })

  it('deduplicates an identical lecture repeated within the same selected section', () => {
    const repeated = meeting()
    const result = calendar({ courses: [course('REPEATED', [repeated, structuredClone(repeated)])] })
    expect(events(requiredContent(result))).toHaveLength(1)
    expect(result.eventCount).toBe(1)
  })

  it('does not collapse different courses or sections that happen to meet at the same time', () => {
    const first = course('FIRST')
    first.layers[0]![0]!.sections.push(section('FIRST-T01', [meeting()]))
    const result = calendar({ courses: [first, course('SECOND')], selections: [selected(0), selected(1)] })
    const content = requiredContent(result)

    expect(result.eventCount).toBe(3)
    expect(new Set(uids(content)).size).toBe(3)
  })

  it('reports untimed courses while still exporting the dated courses', () => {
    const result = calendar({ courses: [course('TIMED'), course('UNTIMED', [])], selections: [selected(0), selected(1)] })

    expect(events(requiredContent(result))).toHaveLength(1)
    expect(result.untimedCourses.some(value => value.includes('UNTIMED'))).toBe(true)
    expect(result.missingDateCourses).toEqual([])
  })

  it('returns an empty result for an empty selection or a wholly untimed plan', () => {
    const empty = calendar({ selections: [] })
    expect(empty).toMatchObject({ error: 'empty', content: null, eventCount: 0 })
    const untimed = calendar({ courses: [course('UNTIMED', [])] })
    expect(untimed).toMatchObject({ error: 'empty', content: null, eventCount: 0 })
    expect(untimed.untimedCourses.some(value => value.includes('UNTIMED'))).toBe(true)
  })

  it('leaves the caller-owned courses, selections and date ranges unchanged', () => {
    const options = {
      semesterId: '2610',
      courses: [course('IMMUTABLE')],
      selections: [selected(), selected()],
      now: NOW,
    }
    const before = JSON.stringify(options)
    requiredContent(buildSchedulerCalendar(options))
    expect(JSON.stringify(options)).toBe(before)
  })
})

describe('scheduler calendar real teaching dates', () => {
  it('expands the matching weekday inside inclusive teaching-date endpoints', () => {
    const result = calendar({ courses: [course('WEEKLY', [meeting({
      date_ranges: [{ start_date: '2026-09-07', end_date: '2026-09-21' }],
    })])] })

    expect(starts(requiredContent(result))).toEqual(['20260907T010000Z', '20260914T010000Z', '20260921T010000Z'])
    expect(result).toMatchObject({ startDate: '2026-09-07', endDate: '2026-09-21', eventCount: 3 })
  })

  it('aligns the first occurrence to its weekday instead of treating the range start as a class date', () => {
    const result = calendar({ courses: [course('ALIGN', [meeting({
      date_ranges: [{ start_date: '2026-09-08', end_date: '2026-09-21' }],
    })])] })
    expect(starts(requiredContent(result))).toEqual(['20260914T010000Z', '20260921T010000Z'])
    expect(result).toMatchObject({ startDate: '2026-09-14', endDate: '2026-09-21' })
  })

  it('keeps gaps between real teaching-date ranges and supports a one-day range', () => {
    const result = calendar({ courses: [course('GAPS', [meeting({ date_ranges: [
      { ...MONDAY },
      { start_date: '2026-09-21', end_date: '2026-09-21' },
    ] })])] })
    expect(starts(requiredContent(result))).toEqual(['20260907T010000Z', '20260921T010000Z'])
  })

  it('does not invent a class when a valid short range contains no matching weekday', () => {
    const result = calendar({ courses: [course('NO-MONDAY', [meeting({
      date_ranges: [{ start_date: '2026-09-08', end_date: '2026-09-09' }],
    })])] })
    expect(result).toMatchObject({ error: 'empty', content: null, eventCount: 0 })
  })

  it('uses fallback dates only for meetings without real dates', () => {
    const result = calendar({
      courses: [course('REAL'), course('MISSING', [meeting({ day: 2, date_ranges: undefined })])],
      selections: [selected(0), selected(1)],
      fallbackDateRange: { start_date: '2026-09-08', end_date: '2026-09-08' },
    })
    expect(starts(requiredContent(result))).toEqual(['20260907T010000Z', '20260908T010000Z'])
    expect(result.eventCount).toBe(2)
  })

  it('also treats an empty date-range list as missing dates', () => {
    const result = calendar({
      courses: [course('EMPTY-RANGES', [meeting({ date_ranges: [] })])],
      fallbackDateRange: { ...MONDAY },
    })
    expect(starts(requiredContent(result))).toEqual(['20260907T010000Z'])
  })

  it('treats a null date-range value as missing and preserves the fallback warning', () => {
    const result = calendar({
      courses: [course('NULL-RANGES', [meeting({ date_ranges: null as unknown as SchedulerLecture['date_ranges'] })])],
      fallbackDateRange: { ...MONDAY },
    })
    expect(starts(requiredContent(result))).toEqual(['20260907T010000Z'])
    expect(result.missingDateCourses).toEqual(['NULL-RANGES'])
  })

  it('ignores unused fallback dates when every selected meeting has real dates', () => {
    const result = calendar({ fallbackDateRange: { start_date: 'invalid', end_date: 'invalid' } })
    expect(starts(requiredContent(result))).toEqual(['20260907T010000Z'])
    expect(result.missingDateCourses).toEqual([])
  })

  it('refuses partial export when any selected timed course lacks dates and deduplicates its warning', () => {
    const missing = course('MISSING', [meeting({ date_ranges: undefined }), meeting({ day: 2, date_ranges: [] })])
    const result = calendar({ courses: [course('DATED'), missing], selections: [selected(0), selected(1), selected(1)] })
    expect(result.error).toBe('missing-dates')
    expect(result.content).toBeNull()
    expect(result.missingDateCourses).toEqual(['MISSING'])
  })

  it.each([
    { start_date: '2026-02-30', end_date: '2026-03-02' },
    { start_date: '2026-09-21', end_date: '2026-09-07' },
    { start_date: '2026-9-7', end_date: '2026-09-07' },
    { start_date: 'not-a-date', end_date: '2026-09-07' },
    { start_date: '1991-12-31', end_date: '1992-01-07' },
    { start_date: '2024-01-01', end_date: '2025-01-01' },
  ])('rejects invalid real teaching ranges, even when a valid fallback is supplied: %j', (dateRange) => {
    const result = calendar({
      courses: [course('INVALID', [meeting({ date_ranges: [dateRange] })])],
      fallbackDateRange: { ...MONDAY },
    })
    expect(result.error).toBe('invalid-date-range')
    expect(result.content).toBeNull()
  })

  it('rejects a non-array date-range payload and invalid fallback data', () => {
    const malformed = meeting({ date_ranges: { ...MONDAY } as unknown as SchedulerLecture['date_ranges'] })
    expect(calendar({ courses: [course('BAD-SHAPE', [malformed])] }).error).toBe('invalid-date-range')
    const missing = course('MISSING', [meeting({ date_ranges: undefined })])
    const invalidFallback = calendar({
      courses: [missing],
      fallbackDateRange: { start_date: '2026-09-21', end_date: '2026-09-07' },
    })
    expect(invalidFallback).toMatchObject({ error: 'invalid-date-range', content: null })
  })

  it('does not keep the valid part of a mixed valid/invalid date-range list', () => {
    const result = calendar({ courses: [course('MIXED', [meeting({ date_ranges: [
      { ...MONDAY },
      { start_date: '2026-02-30', end_date: '2026-03-02' },
    ] })])] })
    expect(result).toMatchObject({ error: 'invalid-date-range', content: null, eventCount: 0 })
  })

  it('allows an inclusive range of exactly 366 days and the minimum supported date', () => {
    const leapYear = calendar({ courses: [course('LEAP-YEAR', [meeting({
      date_ranges: [{ start_date: '2024-01-01', end_date: '2024-12-31' }],
    })])] })
    expect(events(requiredContent(leapYear))).toHaveLength(53)
    const minimumDate = calendar({ courses: [course('MINIMUM', [meeting({
      day: 3,
      date_ranges: [{ start_date: '1992-01-01', end_date: '1992-01-01' }],
    })])] })
    expect(starts(requiredContent(minimumDate))).toEqual(['19920101T010000Z'])
  })

  it('handles leap days, month/year boundaries and Sunday as weekday 7', () => {
    const result = calendar({ courses: [course('BOUNDARIES', [
      meeting({ day: 4, date_ranges: [{ start_date: '2024-02-29', end_date: '2024-02-29' }] }),
      meeting({ day: 7, date_ranges: [{ start_date: '2026-12-27', end_date: '2027-01-03' }] }),
    ])] })
    expect(starts(requiredContent(result))).toEqual(['20240229T010000Z', '20261227T010000Z', '20270103T010000Z'])
  })
})

describe('scheduler calendar time conversion and validation', () => {
  it('converts campus UTC+8 time to explicit UTC without shifting the meeting duration', () => {
    const result = calendar()
    const [event] = events(requiredContent(result))
    expect(property(event!, 'DTSTART')).toBe('20260907T010000Z')
    expect(property(event!, 'DTEND')).toBe('20260907T022000Z')
  })

  it('handles local midnight and a legal 24:00 end time across date boundaries', () => {
    const result = calendar({ courses: [course('MIDNIGHT', [
      meeting({ start_time: 0, end_time: 100 }),
      meeting({ start_time: 2300, end_time: 2400 }),
    ])] })
    const exported = events(requiredContent(result))
      .map(event => [property(event, 'DTSTART'), property(event, 'DTEND')])
      .sort(([left], [right]) => left!.localeCompare(right!))
    expect(exported).toEqual([
      ['20260906T160000Z', '20260906T170000Z'],
      ['20260907T150000Z', '20260907T160000Z'],
    ])
  })

  it('produces the same event times regardless of the executing system timezone', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    const pacific = requiredContent(calendar())
    vi.stubEnv('TZ', 'UTC')
    const utc = requiredContent(calendar())
    vi.stubEnv('TZ', 'Asia/Shanghai')
    const campus = requiredContent(calendar())
    expect(pacific).toBe(utc)
    expect(campus).toBe(utc)
  })

  it.each([
    { day: 0 }, { day: 8 }, { day: 1.5 },
    { start_time: -1 }, { start_time: 900.5 }, { start_time: 960 },
    { start_time: 2400, end_time: 2400 },
    { end_time: 900 }, { end_time: 859 }, { end_time: 2401 }, { end_time: 2500 },
    { start_time: Number.NaN },
  ])('rejects invalid lecture weekday/time instead of writing a corrupt event: %j', (overrides) => {
    const result = calendar({ courses: [course('INVALID-TIME', [meeting(overrides)])] })
    expect(result.error).toBe('invalid-lecture')
    expect(result.content).toBeNull()
  })
})

describe('scheduler calendar iCalendar interoperability and safety', () => {
  it('writes a UTF-8 .ics calendar with CRLF lines and required event identity/timestamps', () => {
    const result = calendar()
    const content = requiredContent(result)
    expect(result.filename).toMatch(/\.ics$/i)
    expect(result.filename).not.toMatch(/[\\/\r\n]/)
    expect(content).toMatch(/^BEGIN:VCALENDAR\r\n/)
    expect(content).toMatch(/END:VCALENDAR\r\n$/)
    expect(unfold(content)).toContain('VERSION:2.0\r\n')
    expect(unfold(content)).toMatch(/\r\nPRODID:[^\r\n]+\r\n/)
    expect(content.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
    const [event] = events(content)
    expect(property(event!, 'UID')).not.toBe('')
    expect(property(event!, 'DTSTAMP')).toBe('20260903T102030Z')
    expect(property(event!, 'SUMMARY')).not.toBe('')
  })

  it('escapes text metacharacters and injected content lines without adding fake events or properties', () => {
    const title = '中文,基础;进阶\\章节\r\nBEGIN:VEVENT\r\nUID:injected\n结束'
    const room = 'Room A,B;C\\D\nLOCATION:injected'
    const instructor = 'Teacher, A; B\\C\r\nEND:VEVENT'
    const malicious = course('SAFE-CODE', [meeting({ room, instructor })])
    malicious.course_title = title
    const result = calendar({
      courses: [malicious],
      calendarName: '计划\r\nBEGIN:VEVENT\r\nUID:calendar-injection',
    })
    const content = requiredContent(result)
    const exported = events(content)
    expect(exported).toHaveLength(1)
    const unfolded = unfold(content)
    expect(unfolded.split('\r\n').filter(line => line === 'BEGIN:VEVENT')).toHaveLength(1)
    expect(unfolded.split('\r\n').filter(line => line.startsWith('UID:'))).toHaveLength(1)
    expect(property(exported[0]!, 'UID')).not.toBe('injected')
    expect(decodeText(property(exported[0]!, 'SUMMARY'))).toContain(title.replace(/\r\n/g, '\n'))
    expect(decodeText(property(exported[0]!, 'LOCATION'))).toBe(room)
    expect(decodeText(property(exported[0]!, 'DESCRIPTION'))).toContain(instructor.replace(/\r\n/g, '\n'))
  })

  it('folds long physical lines by UTF-8 octets without damaging Chinese or emoji', () => {
    const title = '课程内容👩🏽‍💻📚'.repeat(30)
    const chosen = course('LONG-TEXT')
    chosen.course_title = title
    const content = requiredContent(calendar({ courses: [chosen], calendarName: title }))
    const encodedRoundTrip = new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(content))
    for (const line of encodedRoundTrip.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(content).toContain('\r\n ')
    expect(decodeText(property(events(encodedRoundTrip)[0]!, 'SUMMARY'))).toContain(title)
    expect(encodedRoundTrip).not.toContain('\uFFFD')
  })

  it('normalizes alternate newline forms and removes control characters from text values', () => {
    const chosen = course('TEXT-CONTROLS')
    chosen.course_title = 'A\rB\u2028C\u2029D\u0000\u0007\u007FE'
    const content = requiredContent(calendar({ courses: [chosen] }))
    expect(decodeText(property(events(content)[0]!, 'SUMMARY'))).toContain('A\nB\nC\nDE')
    expect(content).not.toMatch(/[\u0000\u0007\u007F\u2028\u2029]/)
  })

  it('keeps generated filenames local and safe even when semester metadata contains separators', () => {
    const semesterId = '../../2610\r\nBEGIN:VEVENT'
    const chosen = course('FILENAME')
    chosen.layers[0]![0]!.sections[0]!.semester_id = semesterId
    const result = calendar({ semesterId, courses: [chosen] })
    expect(events(requiredContent(result))).toHaveLength(1)
    expect(result.filename).toMatch(/\.ics$/)
    expect(result.filename).not.toMatch(/[\\/\r\n]/)
    expect(result.filename).not.toContain('..')
  })

  it('uses stable unique UIDs across repeated exports, timestamps and input ordering', () => {
    const firstCourse = course('FIRST', [meeting({ date_ranges: [
      { ...MONDAY }, { start_date: '2026-09-14', end_date: '2026-09-14' },
    ] })])
    const secondCourse = course('SECOND')
    const first = requiredContent(calendar({ courses: [firstCourse, secondCourse], selections: [selected(0), selected(1)] }))
    firstCourse.layers[0]![0]!.sections[0]!.lectures[0]!.date_ranges!.reverse()
    const reordered = requiredContent(calendar({
      courses: [secondCourse, firstCourse],
      selections: [selected(1), selected(0)],
      now: new Date('2026-09-04T01:02:03Z'),
    }))
    expect(uids(reordered)).toEqual(uids(first))
    expect(new Set(uids(first)).size).toBe(3)
    expect(property(events(reordered)[0]!, 'DTSTAMP')).toBe('20260904T010203Z')
  })

  it('accepts exactly 20,000 events but refuses a larger calendar without returning partial content', () => {
    const chosen = course('EVENT-LIMIT')
    chosen.layers[0]![0]!.sections = Array.from({ length: 400 }, (_, index) => section(`LIMIT-${index}`, [meeting({
      date_ranges: [{ start_date: '2026-01-05', end_date: '2026-12-14' }],
    })]))
    const atLimit = calendar({ courses: [chosen] })
    expect(atLimit.eventCount).toBe(20_000)
    expect(events(requiredContent(atLimit))).toHaveLength(20_000)

    chosen.layers[0]![0]!.sections.push(section('ONE-MORE', [meeting()]))
    const overLimit = calendar({ courses: [chosen] })
    expect(overLimit.error).toBe('too-many-events')
    expect(overLimit.content).toBeNull()
  }, 15_000)
})
