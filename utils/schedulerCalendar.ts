import SHA256 from 'crypto-js/sha256'
import type { CartCourse, PlanSelection, SchedulerMeetingDateRange } from './scheduler'

export type SchedulerCalendarError =
  | 'missing-dates'
  | 'invalid-date-range'
  | 'invalid-lecture'
  | 'invalid-selection'
  | 'empty'
  | 'too-many-events'

export interface SchedulerCalendarOptions {
  semesterId: string
  courses: readonly CartCourse[]
  selections: readonly PlanSelection[]
  calendarName?: string
  fallbackDateRange?: SchedulerMeetingDateRange
  now?: Date
}

export interface SchedulerCalendarResult {
  content: string | null
  filename: string
  eventCount: number
  missingDateCourses: string[]
  untimedCourses: string[]
  startDate: string | null
  endDate: string | null
  error: SchedulerCalendarError | null
}

interface DateRange {
  start: number
  end: number
}

interface CalendarMeeting {
  identity: string[]
  day: number
  startMinutes: number
  endMinutes: number
  ranges: DateRange[]
  summary: string
  location: string
  description: string
}

interface CalendarEvent {
  identity: string
  start: number
  end: number
  summary: string
  location: string
  description: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const CAMPUS_UTC_OFFSET_MS = 8 * 60 * MINUTE_MS
const MAX_RANGE_DAYS = 366
const MAX_EVENTS = 20_000
const CRLF = '\r\n'

// Guangzhou has used UTC+08:00 without daylight saving since 1992. Reject
// earlier teaching dates instead of applying today's offset to historical DST.
const MIN_DATE = '1992-01-01'

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Keep values as TEXT, never as caller-supplied iCalendar content lines. */
function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  const normalized = value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')

  // Lone UTF-16 surrogates are not valid Unicode scalar values. Replacing only
  // those leaves complete emoji / surrogate pairs intact during UTF-8 folding.
  return Array.from(normalized, character => {
    const point = character.codePointAt(0)!
    return point >= 0xD800 && point <= 0xDFFF ? '\uFFFD' : character
  }).join('')
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** RFC 5545 limits physical lines to 75 UTF-8 octets, including fold space. */
function foldLine(value: string): string {
  let result = ''
  let octets = 0
  for (const character of value) {
    const point = character.codePointAt(0)!
    const width = point <= 0x7F ? 1 : point <= 0x7FF ? 2 : point <= 0xFFFF ? 3 : 4
    if (octets + width > 75) {
      result += `${CRLF} `
      octets = 1
    }
    result += character
    octets += width
  }
  return result
}

function parseDate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < MIN_DATE) {
    return null
  }
  const [year, month, day] = value.split('-').map(Number)
  const timestamp = Date.UTC(year!, month! - 1, day!)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    return null
  }
  return timestamp
}

function parseRanges(values: readonly SchedulerMeetingDateRange[]): DateRange[] | null {
  const unique = new Map<string, DateRange>()
  for (const value of values) {
    const start = parseDate(value?.start_date)
    const end = parseDate(value?.end_date)
    if (start === null || end === null || start > end || (end - start) / DAY_MS + 1 > MAX_RANGE_DAYS) {
      return null
    }
    unique.set(`${start}:${end}`, { start, end })
  }

  // Coalesce only genuinely overlapping / adjacent dates. Disconnected teaching
  // ranges retain their gaps, while repeated ranges cannot multiply the work.
  const merged: DateRange[] = []
  for (const range of [...unique.values()].sort((left, right) => left.start - right.start || left.end - right.end)) {
    const previous = merged.at(-1)
    if (previous && range.start <= previous.end + DAY_MS) previous.end = Math.max(previous.end, range.end)
    else merged.push({ ...range })
  }
  return merged
}

function hhmmToMinutes(value: unknown, allowMidnightEnd: boolean): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null
  if (allowMidnightEnd && value === 2400) return 24 * 60
  const hours = Math.floor(value / 100)
  const minutes = value % 100
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

function dateText(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function utcDateTime(timestamp: number): string {
  return new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Export precisely the selected plan, independently of the cart's current
 * enabled flags. Validation completes before any downloadable content exists;
 * a bad meeting or missing date can never silently produce a partial calendar.
 */
export function buildSchedulerCalendar(options: SchedulerCalendarOptions): SchedulerCalendarResult {
  const semesterId = cleanText(options?.semesterId).trim()
  const safeSemester = semesterId.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'semester'
  const filename = `unikorn-${safeSemester}.ics`
  const missingDateCourses = new Set<string>()
  const untimedCourses = new Set<string>()

  const failure = (error: SchedulerCalendarError): SchedulerCalendarResult => ({
    content: null,
    filename,
    eventCount: 0,
    missingDateCourses: [...missingDateCourses].sort(compareText),
    untimedCourses: [...untimedCourses].sort(compareText),
    startDate: null,
    endDate: null,
    error,
  })

  if (!semesterId || !Array.isArray(options?.courses) || !Array.isArray(options?.selections)) {
    return failure('invalid-selection')
  }

  const meetings: CalendarMeeting[] = []
  const seenSelections = new Set<string>()
  let unresolvedDates = false
  let parsedFallback: DateRange[] | null | undefined

  for (const selection of options.selections) {
    if (
      !selection
      || !Number.isSafeInteger(selection.courseIndex)
      || selection.courseIndex < 0
      || !Number.isSafeInteger(selection.layer)
      || selection.layer < 0
      || !Number.isSafeInteger(selection.bundleId)
      || selection.bundleId < 0
    ) return failure('invalid-selection')

    const selectionKey = `${selection.courseIndex}:${selection.layer}:${selection.bundleId}`
    if (seenSelections.has(selectionKey)) continue
    seenSelections.add(selectionKey)

    const course = options.courses[selection.courseIndex]
    const courseCode = cleanText(course?.course_code).trim()
    const bundles = course?.layers?.[selection.layer]
    if (!course || !courseCode || !Array.isArray(bundles)) return failure('invalid-selection')
    const matches = bundles.filter(bundle => bundle?.id === selection.bundleId)
    const bundle = matches[0]
    if (
      matches.length !== 1
      || !bundle
      || bundle.layer !== selection.layer
      || !Array.isArray(bundle.sections)
      || bundle.sections.length === 0
    ) return failure('invalid-selection')
    const courseTitle = cleanText(course.course_title)

    for (const section of bundle.sections) {
      if (!section || typeof section !== 'object' || section.semester_id !== options.semesterId) {
        return failure('invalid-selection')
      }
      const sectionName = cleanText(section.name).trim()
      const sectionId = cleanText(section.section_id).trim()
      if (!sectionName && !sectionId) return failure('invalid-selection')
      const sectionLabel = sectionName || sectionId
      const lectures = section.lectures
      if (lectures == null || (Array.isArray(lectures) && lectures.length === 0)) {
        untimedCourses.add(`${courseCode} ${sectionLabel}`)
        continue
      }
      if (!Array.isArray(lectures)) return failure('invalid-lecture')

      for (const lecture of lectures) {
        if (!lecture || !Number.isInteger(lecture.day) || lecture.day < 1 || lecture.day > 7) {
          return failure('invalid-lecture')
        }
        const startMinutes = hhmmToMinutes(lecture.start_time, false)
        const endMinutes = hhmmToMinutes(lecture.end_time, true)
        if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
          return failure('invalid-lecture')
        }

        const realRanges = lecture.date_ranges
        let ranges: DateRange[] | null
        if (realRanges == null || (Array.isArray(realRanges) && realRanges.length === 0)) {
          missingDateCourses.add(courseCode)
          if (options.fallbackDateRange === undefined) {
            unresolvedDates = true
            continue
          }
          if (parsedFallback === undefined) parsedFallback = parseRanges([options.fallbackDateRange])
          ranges = parsedFallback
        }
        else {
          if (!Array.isArray(realRanges)) return failure('invalid-date-range')
          ranges = parseRanges(realRanges)
        }
        if (ranges === null) return failure('invalid-date-range')

        const location = cleanText(lecture.room)
        const instructor = cleanText(lecture.instructor)
        const summary = [courseCode, courseTitle, sectionLabel].filter(Boolean).join(' · ')
        const description = [
          `Course: ${courseCode} ${courseTitle}`,
          `Section: ${sectionLabel}${sectionId && sectionId !== sectionLabel ? ` (${sectionId})` : ''}`,
          `Instructor: ${instructor}`,
          `Semester: ${semesterId}`,
        ].join('\n')
        meetings.push({
          identity: [semesterId, courseCode, sectionId, sectionName, cleanText(section.section_type), location, instructor],
          day: lecture.day,
          startMinutes,
          endMinutes,
          ranges,
          summary,
          location,
          description,
        })
      }
    }
  }

  if (unresolvedDates) return failure('missing-dates')

  const events = new Map<string, CalendarEvent>()
  let firstDate = Number.POSITIVE_INFINITY
  let lastDate = Number.NEGATIVE_INFINITY
  for (const meeting of meetings) {
    for (const range of meeting.ranges) {
      const rangeStartDay = (new Date(range.start).getUTCDay() + 6) % 7 + 1
      const firstOccurrence = range.start + (meeting.day - rangeStartDay + 7) % 7 * DAY_MS
      for (let date = firstOccurrence; date <= range.end; date += 7 * DAY_MS) {
        // No array indices, clock time, account data or preference data are part
        // of identity. Identical actual classes retain one stable UID on export.
        const identity = JSON.stringify([
          ...meeting.identity, dateText(date), meeting.startMinutes, meeting.endMinutes,
        ])
        if (events.has(identity)) continue
        if (events.size >= MAX_EVENTS) return failure('too-many-events')
        events.set(identity, {
          identity,
          start: date + meeting.startMinutes * MINUTE_MS - CAMPUS_UTC_OFFSET_MS,
          end: date + meeting.endMinutes * MINUTE_MS - CAMPUS_UTC_OFFSET_MS,
          summary: meeting.summary,
          location: meeting.location,
          description: meeting.description,
        })
        firstDate = Math.min(firstDate, date)
        lastDate = Math.max(lastDate, date)
      }
    }
  }
  if (events.size === 0) return failure('empty')

  // One stamp for the whole export; injected time makes tests deterministic.
  // An invalid optional clock cannot leak a malformed DATE-TIME into the file.
  const suppliedNow = options.now
  const now = suppliedNow instanceof Date
    && Number.isFinite(suppliedNow.getTime())
    && suppliedNow.getUTCFullYear() >= 1
    && suppliedNow.getUTCFullYear() <= 9999
    ? suppliedNow
    : new Date()
  const stamp = utcDateTime(now.getTime())
  const calendarName = cleanText(options.calendarName) || `UniKorn ${semesterId}`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UniKorn//Course Planner//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ]
  const sortedEvents = [...events.values()].sort((left, right) => (
    left.start - right.start || left.end - right.end || compareText(left.identity, right.identity)
  ))
  for (const event of sortedEvents) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${SHA256(event.identity).toString()}@unikorn.hkust-gz.edu.cn`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcDateTime(event.start)}`,
      `DTEND:${utcDateTime(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')

  return {
    content: `${lines.map(foldLine).join(CRLF)}${CRLF}`,
    filename,
    eventCount: events.size,
    missingDateCourses: [...missingDateCourses].sort(compareText),
    untimedCourses: [...untimedCourses].sort(compareText),
    startDate: dateText(firstDate),
    endDate: dateText(lastDate),
    error: null,
  }
}
