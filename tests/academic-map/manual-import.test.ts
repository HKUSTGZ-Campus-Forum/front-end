import { describe, expect, it } from 'vitest'
import {
  ACADEMIC_MAP_MANUAL_TERM_OPTIONS,
  buildAcademicMapPickerActionState,
  buildAcademicMapManualRecord,
  buildAcademicMapPrefixOptions,
  normalizeAcademicMapCatalogCourses,
} from '../../utils/academicMapManualImport'

describe('academic map manual import helpers', () => {
  it('normalizes catalog courses without changing their order', () => {
    const courses = normalizeAcademicMapCatalogCourses([
      { course_code: 'UFUG 1001', course_title: 'University Life', credits: 1 },
      { code: 'UCUG1052', name: 'Core Course', credit: 3 },
      { course_code: 'AIAA 2205', course_title: 'Introduction to AI', credits: 3 },
      { course_code: '', course_title: 'Broken Course' },
    ])

    expect(courses).toEqual([
      {
        code: 'UFUG 1001',
        compactCode: 'UFUG1001',
        prefix: 'UFUG',
        title: 'University Life',
        credits: 1,
      },
      {
        code: 'UCUG 1052',
        compactCode: 'UCUG1052',
        prefix: 'UCUG',
        title: 'Core Course',
        credits: 3,
      },
      {
        code: 'AIAA 2205',
        compactCode: 'AIAA2205',
        prefix: 'AIAA',
        title: 'Introduction to AI',
        credits: 3,
      },
    ])
  })

  it('sorts common-core prefixes before the rest of the catalog', () => {
    const courses = normalizeAcademicMapCatalogCourses([
      { course_code: 'AIAA 2205', course_title: 'Introduction to AI', credits: 3 },
      { course_code: 'DSAA 2011', course_title: 'Data Structures', credits: 3 },
      { course_code: 'UCUG 1052', course_title: 'Core Course', credits: 3 },
      { course_code: 'UFUG 1001', course_title: 'University Life', credits: 1 },
    ])

    expect(buildAcademicMapPrefixOptions(courses)).toEqual([
      { prefix: 'UFUG', count: 1 },
      { prefix: 'UCUG', count: 1 },
      { prefix: 'AIAA', count: 1 },
      { prefix: 'DSAA', count: 1 },
    ])
  })

  it('turns a selected catalog course into a completed academic map record without grade data', () => {
    const [course] = normalizeAcademicMapCatalogCourses([
      { course_code: 'AIAA 2205', course_title: 'Introduction to AI', credits: 3 },
    ])

    expect(buildAcademicMapManualRecord(course)).toEqual({
      course_code: 'AIAA 2205',
      course_title: 'Introduction to AI',
      units: 3,
      status: 'completed',
      keep_grade: false,
      import_source: 'manual_picker',
    })
  })

  it('keeps manual status and optional grade when provided', () => {
    const [course] = normalizeAcademicMapCatalogCourses([
      { course_code: 'UFUG 1102', course_title: 'Calculus I', credits: 3 },
    ])

    expect(buildAcademicMapManualRecord(course, { status: 'in_progress', grade: 'A' })).toEqual({
      course_code: 'UFUG 1102',
      course_title: 'Calculus I',
      units: 3,
      status: 'in_progress',
      grade: 'A',
      keep_grade: true,
      import_source: 'manual_picker',
    })

    expect(buildAcademicMapManualRecord(course, { status: 'completed', grade: '   ' })).toEqual({
      course_code: 'UFUG 1102',
      course_title: 'Calculus I',
      units: 3,
      status: 'completed',
      keep_grade: false,
      import_source: 'manual_picker',
    })
  })

  it('offers manual import terms from 2023-2024 fall through 2025-2026 summer', () => {
    expect(ACADEMIC_MAP_MANUAL_TERM_OPTIONS.map(option => option.value)).toEqual([
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
    ])
  })

  it('adds the selected manual import term to the record', () => {
    const [course] = normalizeAcademicMapCatalogCourses([
      { course_code: 'UFUG 1102', course_title: 'Calculus I', credits: 3 },
    ])

    expect(buildAcademicMapManualRecord(course, { termLabel: '2025-2026 Summer' })).toMatchObject({
      course_code: 'UFUG 1102',
      term_label: '2025-2026 Summer',
    })
  })

  it('summarizes pending picker changes by import and removal counts', () => {
    expect(buildAcademicMapPickerActionState({ importCount: 2, removalCount: 0 })).toEqual({
      tone: 'import',
      labelKey: 'academicMap.import.picker.importSelected',
      labelParams: { count: 2 },
      hasChanges: true,
    })

    expect(buildAcademicMapPickerActionState({ importCount: 0, removalCount: 1 })).toEqual({
      tone: 'remove',
      labelKey: 'academicMap.import.picker.removeSelected',
      labelParams: { count: 1 },
      hasChanges: true,
    })

    expect(buildAcademicMapPickerActionState({ importCount: 3, removalCount: 2 })).toEqual({
      tone: 'mixed',
      labelKey: 'academicMap.import.picker.applyMixed',
      labelParams: { importCount: 3, removalCount: 2 },
      hasChanges: true,
    })

    expect(buildAcademicMapPickerActionState({ importCount: 0, removalCount: 0 })).toMatchObject({
      tone: 'import',
      hasChanges: false,
    })
  })
})
