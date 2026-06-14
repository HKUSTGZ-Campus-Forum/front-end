import type { AcademicCourseRecord, AcademicCourseStatus } from '../types/academic-map'
import { compactCourseCode } from './courseUniverse'

export type CourseOverviewAcademicDisplayStatus =
  | AcademicCourseStatus
  | 'not_taken'

export type CourseOverviewPlannerStatus =
  | 'in_cart'
  | 'available'
  | 'different_semester'
  | 'unavailable'

export function getCourseOverviewAcademicState(record: Pick<AcademicCourseRecord, 'status'> | null) {
  const status: CourseOverviewAcademicDisplayStatus = record?.status === 'planned'
    ? 'interested'
    : record?.status === 'not_interested'
    ? 'not_taken'
    : record?.status || 'not_taken'
  const canToggleInterest = status === 'not_taken' || status === 'interested' || status === 'withdrawn'

  return {
    status,
    canToggleInterest,
    isInterested: status === 'interested',
  }
}

export function getCourseOverviewPlannerState(input: {
  activeSemesterId: string
  cartCourseCodes: string[]
  courseCode: string
  offeringSemesterId?: string | null
}) {
  const activeSemesterId = String(input.activeSemesterId || '').trim()
  const offeringSemesterId = String(input.offeringSemesterId || '').trim()

  if (!activeSemesterId || !offeringSemesterId) {
    return { status: 'unavailable' as const, canToggle: false }
  }

  if (activeSemesterId !== offeringSemesterId) {
    return { status: 'different_semester' as const, canToggle: false }
  }

  const normalizedCourseCode = compactCourseCode(input.courseCode)
  const isInCart = input.cartCourseCodes
    .map(code => compactCourseCode(code))
    .includes(normalizedCourseCode)

  return {
    status: isInCart ? 'in_cart' as const : 'available' as const,
    canToggle: true,
  }
}
