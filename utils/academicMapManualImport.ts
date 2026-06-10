import type { AcademicCourseRecord, AcademicCourseStatus } from '~/types/academic-map'

export interface AcademicMapCatalogCourse {
  code: string
  compactCode: string
  prefix: string
  title: string
  credits: number | null
}

export interface AcademicMapPrefixOption {
  prefix: string
  count: number
}

export interface AcademicMapManualTermOption {
  value: string
  label: string
}

export interface AcademicMapPickerMeta {
  status: AcademicCourseStatus
  grade: string
  termCode: string
}

export interface AcademicMapPickerDraftItem {
  course: AcademicMapCatalogCourse
  meta: AcademicMapPickerMeta
}

export interface AcademicMapPickerDraft {
  items: AcademicMapPickerDraftItem[]
  removals: AcademicCourseRecord[]
}

export interface AcademicMapImportedPickerDraft extends AcademicMapPickerDraft {
  ignoredCount: number
}

export interface AcademicMapDraftStoragePayload extends AcademicMapPickerDraft {
  schemaVersion: 1
  savedAt: number
}

export type AcademicMapPickerActionTone = 'import' | 'remove' | 'mixed'

export interface AcademicMapPickerActionState {
  tone: AcademicMapPickerActionTone
  labelKey: string
  labelParams: Record<string, number>
  hasChanges: boolean
}

export interface AcademicMapRecordGroup {
  term: string
  items: AcademicCourseRecord[]
}

type RawCatalogCourse = Record<string, unknown>

const PRIORITY_PREFIXES = ['UFUG', 'UCUG']
const TERM_SUFFIX_BY_SEASON: Record<string, string> = {
  fall: '10',
  winter: '20',
  spring: '30',
  summer: '40',
}
const TERM_SEASON_BY_SUFFIX: Record<string, string> = {
  '10': 'Fall',
  '20': 'Winter',
  '30': 'Spring',
  '40': 'Summer',
}
const DRAFT_SCHEMA_VERSION = 1
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function termLabelFromCode(termCode: string | null | undefined) {
  const normalized = String(termCode || '').trim()
  if (!/^\d{4}$/.test(normalized)) return null
  const season = TERM_SEASON_BY_SUFFIX[normalized.slice(2)]
  if (!season) return null
  const startYear = 2000 + Number(normalized.slice(0, 2))
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}-${endYearShort} ${season}`
}

export const ACADEMIC_MAP_MANUAL_TERM_OPTIONS: AcademicMapManualTermOption[] = [
  '2310',
  '2320',
  '2330',
  '2340',
  '2410',
  '2420',
  '2430',
  '2440',
  '2510',
  '2520',
  '2530',
  '2540',
].map(termCode => ({ value: termCode, label: termLabelFromCode(termCode) || termCode }))

const compactCourseCode = (value: string) => value.replace(/\s+/g, '').toUpperCase()

const displayCourseCode = (value: string) => {
  const compact = compactCourseCode(value)
  const match = compact.match(/^([A-Z]+)([0-9].*)$/)
  return match ? `${match[1]} ${match[2]}` : compact
}

const coursePrefix = (value: string) => compactCourseCode(value).match(/^[A-Z]+/)?.[0] || ''

export const normalizeAcademicMapTerm = (value: string | null | undefined) => {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (/^\d{4}$/.test(raw)) {
    const label = termLabelFromCode(raw)
    return label ? { termCode: raw, termLabel: label } : null
  }
  const match = raw.match(/\b(20\d{2})\s*[-/]\s*(\d{2}|20\d{2})\s+(Fall|Winter|Spring|Summer)\b/i)
  if (!match) return null
  const startYear = Number(match[1])
  const endYear = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2])
  if (endYear !== startYear + 1) return null
  const suffix = TERM_SUFFIX_BY_SEASON[match[3].toLowerCase()]
  if (!suffix) return null
  const termCode = `${String(startYear % 100).padStart(2, '0')}${suffix}`
  return { termCode, termLabel: termLabelFromCode(termCode)! }
}

const firstString = (course: RawCatalogCourse, keys: string[]) => {
  for (const key of keys) {
    const value = course[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const firstNumber = (course: RawCatalogCourse, keys: string[]) => {
  for (const key of keys) {
    const value = course[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return null
}

export const normalizeAcademicMapCatalogCourses = (rawCourses: RawCatalogCourse[]): AcademicMapCatalogCourse[] => {
  const seenCodes = new Set<string>()
  const courses: AcademicMapCatalogCourse[] = []

  for (const rawCourse of rawCourses) {
    const rawCode = firstString(rawCourse, ['course_code', 'code'])
    const compactCode = compactCourseCode(rawCode)
    const prefix = coursePrefix(rawCode)
    if (!compactCode || !prefix || seenCodes.has(compactCode)) continue

    seenCodes.add(compactCode)
    courses.push({
      code: displayCourseCode(rawCode),
      compactCode,
      prefix,
      title: firstString(rawCourse, ['course_title', 'name', 'title', 'course_title_abbr']),
      credits: firstNumber(rawCourse, ['credits', 'credit', 'units']),
    })
  }

  return courses
}

export const buildAcademicMapPrefixOptions = (courses: AcademicMapCatalogCourse[]): AcademicMapPrefixOption[] => {
  const counts = new Map<string, number>()
  for (const course of courses) counts.set(course.prefix, (counts.get(course.prefix) || 0) + 1)
  return Array.from(counts.entries())
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => {
      const priorityA = PRIORITY_PREFIXES.indexOf(a.prefix)
      const priorityB = PRIORITY_PREFIXES.indexOf(b.prefix)
      if (priorityA !== -1 || priorityB !== -1) {
        if (priorityA === -1) return 1
        if (priorityB === -1) return -1
        return priorityA - priorityB
      }
      return a.prefix.localeCompare(b.prefix)
    })
}

export const buildAcademicMapPickerActionState = (
  counts: { importCount: number; removalCount: number },
): AcademicMapPickerActionState => {
  const importCount = Math.max(0, counts.importCount)
  const removalCount = Math.max(0, counts.removalCount)

  if (importCount > 0 && removalCount > 0) {
    return {
      tone: 'mixed',
      labelKey: 'academicMap.import.picker.applyMixed',
      labelParams: { importCount, removalCount },
      hasChanges: true,
    }
  }

  if (removalCount > 0) {
    return {
      tone: 'remove',
      labelKey: 'academicMap.import.picker.removeSelected',
      labelParams: { count: removalCount },
      hasChanges: true,
    }
  }

  return {
    tone: 'import',
    labelKey: 'academicMap.import.picker.importSelected',
    labelParams: { count: importCount },
    hasChanges: importCount > 0,
  }
}

const academicMapTermSortValue = (term: string) => {
  const normalized = String(term || '').trim()
  const yearMatch = normalized.match(/(\d{2,4})\s*[-/]\s*(\d{2,4})/)
  if (!yearMatch) return -1

  const rawStartYear = Number(yearMatch[1])
  const startYear = rawStartYear < 100 ? 2000 + rawStartYear : rawStartYear
  const zhSeasonPattern = (codePoint: number) => new RegExp(String.fromCharCode(codePoint))
  const seasonRank = [
    { patterns: [/fall/i, zhSeasonPattern(0x79cb)], value: 1 },
    { patterns: [/winter/i, zhSeasonPattern(0x51ac)], value: 2 },
    { patterns: [/spring/i, zhSeasonPattern(0x6625)], value: 3 },
    { patterns: [/summer/i, zhSeasonPattern(0x590f)], value: 4 },
  ].find(item => item.patterns.some(pattern => pattern.test(normalized)))?.value || 0

  return startYear * 10 + seasonRank
}

export const buildAcademicMapRecordGroups = (
  records: AcademicCourseRecord[],
  noTermLabel: string,
): AcademicMapRecordGroup[] => {
  const groups = new Map<string, AcademicCourseRecord[]>()
  for (const record of records) {
    const term = record.term_label || noTermLabel
    groups.set(term, [...(groups.get(term) || []), record])
  }

  return Array.from(groups.entries())
    .map(([term, items]) => ({ term, items }))
    .sort((a, b) => {
      const aIsNoTerm = a.term === noTermLabel
      const bIsNoTerm = b.term === noTermLabel
      if (aIsNoTerm || bIsNoTerm) return aIsNoTerm ? -1 : 1
      return academicMapTermSortValue(b.term) - academicMapTermSortValue(a.term)
    })
}

export const buildAcademicMapManualRecord = (
  course: AcademicMapCatalogCourse,
  options: { status?: AcademicCourseStatus; grade?: string; termCode?: string; termLabel?: string } = {},
): AcademicCourseRecord => {
  const grade = options.grade?.trim()
  const normalizedTerm = normalizeAcademicMapTerm(options.termCode || options.termLabel)
  return {
    course_code: course.code,
    course_title: course.title,
    units: course.credits,
    status: options.status || 'completed',
    ...(normalizedTerm ? { term_label: normalizedTerm.termLabel, term_code: normalizedTerm.termCode } : {}),
    ...(grade ? { grade } : {}),
    keep_grade: !!grade,
    import_source: 'manual_picker',
  }
}

const courseFromRecord = (record: AcademicCourseRecord): AcademicMapCatalogCourse | null => {
  const code = record.course_code || ''
  const compactCode = compactCourseCode(code)
  const prefix = coursePrefix(code)
  if (!compactCode || !prefix) return null
  return {
    code: displayCourseCode(code),
    compactCode,
    prefix,
    title: record.course_title || '',
    credits: record.units ?? null,
  }
}

export const buildAcademicMapPickerDraftFromImportRows = (
  records: AcademicCourseRecord[],
): AcademicMapImportedPickerDraft => {
  const itemsByCode = new Map<string, AcademicMapPickerDraftItem>()
  let ignoredCount = 0

  for (const record of records) {
    if (!record.course_code || record.matched_course_code === null) {
      ignoredCount += 1
      continue
    }
    const course = courseFromRecord(record)
    if (!course) {
      ignoredCount += 1
      continue
    }
    const term = normalizeAcademicMapTerm(record.term_code || record.term_label)
    itemsByCode.set(course.compactCode, {
      course,
      meta: {
        status: record.status || 'completed',
        grade: record.grade || '',
        termCode: term?.termCode || '',
      },
    })
  }

  return {
    items: Array.from(itemsByCode.values()),
    removals: [],
    ignoredCount,
  }
}

export const buildAcademicMapDraftStoragePayload = (
  draft: AcademicMapPickerDraft,
  savedAt = Date.now(),
): AcademicMapDraftStoragePayload => ({
  schemaVersion: DRAFT_SCHEMA_VERSION,
  savedAt,
  items: draft.items,
  removals: draft.removals,
})

export const restoreAcademicMapDraftStoragePayload = (
  raw: string | null | undefined,
  now = Date.now(),
): AcademicMapPickerDraft | null => {
  if (!raw) return null
  try {
    const payload = JSON.parse(raw) as Partial<AcademicMapDraftStoragePayload>
    if (payload.schemaVersion !== DRAFT_SCHEMA_VERSION) return null
    if (!payload.savedAt || now - payload.savedAt > DRAFT_TTL_MS) return null
    const items = Array.isArray(payload.items) ? payload.items.filter(item => item?.course?.compactCode && item?.meta) : []
    const removals = Array.isArray(payload.removals) ? payload.removals : []
    return { items, removals }
  } catch {
    return null
  }
}
