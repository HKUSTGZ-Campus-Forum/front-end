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

export type CourseRelationshipType = 'prerequisite' | 'corequisite' | 'exclusion'

export interface CourseRelationshipCourse {
  id: number
  code: string
  display_code: string
  title: string
}

export interface CourseRelationshipRequirement {
  relation_type: CourseRelationshipType
  raw_text: string | null
  normalized_text: string | null
  requirement_kind: 'course' | 'non_course' | 'mixed' | 'empty'
  expression: Record<string, unknown>
  courses: CourseRelationshipCourse[]
  course_codes: string[]
  source: string
  source_version: string | null
  effective_from_semester_id: string | null
  imported_at: string | null
  is_fallback: boolean
}

export interface CourseRelationshipDownstream extends CourseRelationshipCourse {
  requirement: string | null
  source: string
  source_version: string | null
  is_fallback: boolean
}

export interface CourseRelationships {
  requirements: CourseRelationshipRequirement[]
  downstream: CourseRelationshipDownstream[]
  provenance: {
    source: string
    source_version: string | null
    imported_at: string | null
    is_fallback: boolean
  }
}

export interface CourseOverviewPayload {
  course: CourseOverviewCourse
  offerings: CourseOverviewOffering[]
  academic_record: AcademicCourseRecord | null
  requirement_hits: unknown[]
  prerequisite_summary: {
    missing: string[]
    downstream: CourseRelationshipDownstream[]
  }
  relationships: CourseRelationships
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
