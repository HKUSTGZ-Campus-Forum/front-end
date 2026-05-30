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

export interface AcademicProgramSummary {
  id: number
  code: string
  name_en: string
  name_zh?: string | null
  cohort: string
  total_min_credits: number
  common_core_min_credits: number
  major_min_credits?: number | null
  home_areas: string[]
}

export interface AcademicGradeMetric {
  status: 'available' | 'not_uploaded'
  value: number | null
  included_courses: number
  excluded_courses: number
  program_code?: string | null
}

export interface AcademicPrerequisiteBlocker {
  course_code: string
  course_title?: string | null
  missing: string[]
}

export interface AcademicPrerequisiteMetrics {
  unlocked_count: number
  blocked_count: number
  blockers: AcademicPrerequisiteBlocker[]
}

export type AcademicRequirementCellStatus = 'now' | 'done' | 'need' | 'choice' | 'more'

export interface AcademicRequirementCell {
  kind: 'course' | 'more'
  course_code?: string
  title?: string | null
  label?: string
  status: AcademicRequirementCellStatus
  raw_status?: AcademicCourseStatus | null
  shared_majors?: string[]
  hidden_count?: number
}

export type AcademicRequirementSectionKind = 'required' | 'choice' | 'elective'

export interface AcademicRequirementSection {
  key: string
  kind: AcademicRequirementSectionKind
  label_en: string
  label_zh?: string | null
  required_count?: number | null
  total_count: number
  completed_count: number
  min_credits?: number | null
  progress_label: string
  cells: AcademicRequirementCell[]
}

export interface AcademicRequirementRow {
  key: string
  name_en: string
  name_zh?: string | null
  category: string
  progress_label: string
  visible_cells: AcademicRequirementCell[]
  all_cells: AcademicRequirementCell[]
  sections?: AcademicRequirementSection[]
  detail: {
    min_courses?: number | null
    min_credits?: number | null
    rule: Record<string, unknown>
  }
}

export interface AcademicRequirementMatrix {
  program_code: string
  program: AcademicProgramSummary
  rows: AcademicRequirementRow[]
}

export interface AcademicMapSummary {
  profile: AcademicProfile
  programs: AcademicProgramSummary[]
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
  grade_metrics?: {
    ocga: AcademicGradeMetric
    mcga: AcademicGradeMetric
  }
  prerequisite_metrics?: AcademicPrerequisiteMetrics
  requirement_matrix?: AcademicRequirementMatrix[]
}
