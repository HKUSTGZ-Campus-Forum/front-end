import type { AcademicCourseRecord } from './academic-map'
import type { CourseOffering } from '~/utils/courseOffering'

export interface CourseOverviewCourse {
  id: number
  code: string
  display_code: string
  title: string
  credits: number | null
  description: string | null
  subject?: string | null
  catalog_number?: string | null
  course_title_abbr?: string | null
  pre_requirement?: string | null
  co_requirement?: string | null
  exclusion?: string | null
  pg_course?: boolean | null
  klms_course?: boolean | null
  is_active: boolean
}

export interface CourseOverviewOffering extends CourseOffering {
  scheduler_semester_id?: string | null
  section_count?: number
  instructors?: string[]
}

export interface CourseOverviewPayload {
  course: CourseOverviewCourse
  offerings: CourseOverviewOffering[]
  academic_record: AcademicCourseRecord | null
  requirement_hits: unknown[]
  prerequisite_summary: {
    missing: string[]
    downstream: unknown[]
  }
  links: {
    universe_focus?: string
  }
}

export interface CourseResolvePayload {
  course_id: number
  course_code: string
  display_code: string
  overview_path: string
}
