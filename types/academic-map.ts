export type AcademicCourseStatus =
  | 'completed'
  | 'in_progress'
  | 'planned'
  | 'interested'
  | 'not_interested'

export interface AcademicProfile {
  id?: number
  user_id?: number
  cohort: string | null
  target_majors: string[]
  grade_policy: 'keep_private' | 'drop_grades'
}

export interface AcademicCourseRecord {
  id?: number
  course_id?: number | null
  course_code: string
  course_title?: string | null
  term_label?: string | null
  term_code?: string | null
  units?: number | null
  status: AcademicCourseStatus
  grade?: string | null
  keep_grade?: boolean
  import_source?: string
  needs_review?: boolean
  review_reason?: string | null
  raw?: string
}

export interface AcademicMapSummary {
  profile: AcademicProfile
  programs: Array<{
    id: number
    code: string
    name_en: string
    name_zh?: string | null
    cohort: string
    total_min_credits: number
    common_core_min_credits: number
    major_min_credits?: number | null
    home_areas: string[]
  }>
  credits: {
    total_completed: number
    total_active: number
    total_minimum: number
    over_minimum: boolean
    common_core_minimum: number
    major_minimum?: number | null
  }
  course_counts: {
    imported: number
    completed: number
    in_progress: number
    planned: number
    needs_review: number
  }
  records: AcademicCourseRecord[]
  map_completeness: {
    score: number
    items: Array<{ key: string; complete: boolean }>
  }
}
