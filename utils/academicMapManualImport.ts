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

export type AcademicMapPickerActionTone = 'import' | 'remove' | 'mixed'

export interface AcademicMapPickerActionState {
  tone: AcademicMapPickerActionTone
  labelKey: string
  labelParams: Record<string, number>
  hasChanges: boolean
}

type RawCatalogCourse = Record<string, unknown>

const PRIORITY_PREFIXES = ['UFUG', 'UCUG']

export const ACADEMIC_MAP_MANUAL_TERM_OPTIONS: AcademicMapManualTermOption[] = [
  '2023-2024 Fall',
  '2023-2024 Winter',
  '2023-2024 Spring',
  '2023-2024 Summer',
  '2024-2025 Fall',
  '2024-2025 Winter',
  '2024-2025 Spring',
  '2024-2025 Summer',
  '2025-2026 Fall',
  '2025-2026 Winter',
  '2025-2026 Spring',
  '2025-2026 Summer',
].map(term => ({ value: term, label: term }))

const compactCourseCode = (value: string) => value.replace(/\s+/g, '').toUpperCase()

const displayCourseCode = (value: string) => {
  const compact = compactCourseCode(value)
  const match = compact.match(/^([A-Z]+)([0-9].*)$/)
  return match ? `${match[1]} ${match[2]}` : compact
}

const coursePrefix = (value: string) => compactCourseCode(value).match(/^[A-Z]+/)?.[0] || ''

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

export const buildAcademicMapManualRecord = (
  course: AcademicMapCatalogCourse,
  options: { status?: AcademicCourseStatus; grade?: string; termLabel?: string } = {},
): AcademicCourseRecord => {
  const grade = options.grade?.trim()
  const termLabel = options.termLabel?.trim()
  return {
    course_code: course.code,
    course_title: course.title,
    units: course.credits,
    status: options.status || 'completed',
    ...(termLabel ? { term_label: termLabel } : {}),
    ...(grade ? { grade } : {}),
    keep_grade: !!grade,
    import_source: 'manual_picker',
  }
}
