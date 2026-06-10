import { describe, expect, it } from 'vitest'
import {
  ACADEMIC_MAP_MANUAL_TERM_OPTIONS,
  buildAcademicMapDraftStoragePayload,
  buildAcademicMapPickerActionState,
  buildAcademicMapPickerDraftFromImportRows,
  buildAcademicMapManualRecord,
  buildAcademicMapPrefixOptions,
  buildAcademicMapRecordGroups,
  normalizeAcademicMapCatalogCourses,
  normalizeAcademicMapTerm,
  restoreAcademicMapDraftStoragePayload,
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

  it('offers manual import terms as scheduler semester ids', () => {
    expect(ACADEMIC_MAP_MANUAL_TERM_OPTIONS.map(option => option.value)).toEqual([
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
    ])
    expect(ACADEMIC_MAP_MANUAL_TERM_OPTIONS[7]).toEqual({
      value: '2440',
      label: '2024-25 Summer',
    })
  })

  it('adds the selected manual import term to the record', () => {
    const [course] = normalizeAcademicMapCatalogCourses([
      { course_code: 'UFUG 1102', course_title: 'Calculus I', credits: 3 },
    ])

    expect(buildAcademicMapManualRecord(course, { termCode: '2540' })).toMatchObject({
      course_code: 'UFUG 1102',
      term_code: '2540',
      term_label: '2025-26 Summer',
    })
  })

  it('normalizes SIS and manual term labels into the scheduler semester id format', () => {
    expect(normalizeAcademicMapTerm('2024-25 Summer')).toEqual({
      termCode: '2440',
      termLabel: '2024-25 Summer',
    })
    expect(normalizeAcademicMapTerm('2024-2025 Spring')).toEqual({
      termCode: '2430',
      termLabel: '2024-25 Spring',
    })
    expect(normalizeAcademicMapTerm('not a term')).toBeNull()
  })

  it('places records without assigned terms before dated term groups', () => {
    const groups = buildAcademicMapRecordGroups([
      {
        id: 1,
        course_code: 'UFUG 1105',
        course_title: 'Honors Calculus I',
        units: 3,
        status: 'completed',
        term_label: '2024-25 Fall',
      },
      {
        id: 2,
        course_code: 'UFUG 1504',
        course_title: 'Honors General Physics II',
        units: 3,
        status: 'planned',
      },
      {
        id: 3,
        course_code: 'UFUG 2601',
        course_title: 'C++ Programming',
        units: 4,
        status: 'completed',
        term_label: '2025-26 Summer',
      },
    ], 'No assigned term')

    expect(groups.map(group => group.term)).toEqual([
      'No assigned term',
      '2025-26 Summer',
      '2024-25 Fall',
    ])
  })

  it('builds a picker draft from matched SIS rows and lets the last duplicate win', () => {
    const draft = buildAcademicMapPickerDraftFromImportRows([
      {
        course_code: 'AIAA 2205',
        course_title: 'Old AI Title',
        units: 3,
        status: 'completed',
        grade: 'B+',
        term_label: '2024-25 Spring',
        matched_course_code: 'AIAA2205',
      },
      {
        course_code: 'AIAA2205',
        course_title: 'Introduction to Artificial Intelligence',
        units: 3,
        status: 'completed',
        grade: 'A',
        term_label: '2024-25 Summer',
        matched_course_code: 'AIAA2205',
      },
      {
        course_code: 'NOPE 0000',
        course_title: 'Unknown',
        units: 3,
        status: 'completed',
        grade: 'A',
        matched_course_code: null,
      },
    ])

    expect(draft.items).toHaveLength(1)
    expect(draft.ignoredCount).toBe(1)
    expect(draft.items[0]).toEqual({
      course: {
        code: 'AIAA 2205',
        compactCode: 'AIAA2205',
        prefix: 'AIAA',
        title: 'Introduction to Artificial Intelligence',
        credits: 3,
      },
      meta: {
        status: 'completed',
        grade: 'A',
        termCode: '2440',
      },
    })
  })

  it('serializes and restores picker drafts while dropping expired payloads', () => {
    const now = 100_000
    const [course] = normalizeAcademicMapCatalogCourses([
      { course_code: 'AIAA 2205', course_title: 'Introduction to AI', credits: 3 },
    ])
    const payload = buildAcademicMapDraftStoragePayload({
      items: [{ course, meta: { status: 'completed', grade: 'A', termCode: '2440' } }],
      removals: [],
    }, now)

    expect(restoreAcademicMapDraftStoragePayload(JSON.stringify(payload), now + 1_000)).toEqual({
      items: [{ course, meta: { status: 'completed', grade: 'A', termCode: '2440' } }],
      removals: [],
    })
    expect(restoreAcademicMapDraftStoragePayload(JSON.stringify(payload), now + 31 * 24 * 60 * 60 * 1000)).toBeNull()
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
