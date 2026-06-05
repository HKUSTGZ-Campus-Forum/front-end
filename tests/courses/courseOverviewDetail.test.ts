import { describe, expect, it } from 'vitest'
import {
  getCourseOverviewAcademicState,
  getCourseOverviewPlannerState,
} from '../../utils/courseOverviewDetail'

describe('course overview detail helpers', () => {
  it('shows one academic state and only lets interest toggle for not-taken or interested courses', () => {
    expect(getCourseOverviewAcademicState(null)).toEqual({
      status: 'not_taken',
      canToggleInterest: true,
      isInterested: false,
    })

    expect(getCourseOverviewAcademicState({ course_code: 'UCUG 052S', status: 'interested' })).toEqual({
      status: 'interested',
      canToggleInterest: true,
      isInterested: true,
    })

    expect(getCourseOverviewAcademicState({ course_code: 'UCUG 052S', status: 'completed' })).toEqual({
      status: 'completed',
      canToggleInterest: false,
      isInterested: false,
    })

    expect(getCourseOverviewAcademicState({ course_code: 'UCUG 052S', status: 'in_progress' })).toEqual({
      status: 'in_progress',
      canToggleInterest: false,
      isInterested: false,
    })

    expect(getCourseOverviewAcademicState({ course_code: 'UCUG 052S', status: 'not_interested' })).toEqual({
      status: 'not_taken',
      canToggleInterest: true,
      isInterested: false,
    })
  })

  it('enables planner cart actions only for the active scheduler semester', () => {
    expect(getCourseOverviewPlannerState({
      activeSemesterId: '2530',
      cartCourseCodes: ['UCUG052S'],
      courseCode: 'UCUG 052S',
      offeringSemesterId: '2530',
    })).toEqual({ status: 'in_cart', canToggle: true })

    expect(getCourseOverviewPlannerState({
      activeSemesterId: '2530',
      cartCourseCodes: [],
      courseCode: 'UCUG 052S',
      offeringSemesterId: '2530',
    })).toEqual({ status: 'available', canToggle: true })

    expect(getCourseOverviewPlannerState({
      activeSemesterId: '2530',
      cartCourseCodes: [],
      courseCode: 'UCUG 052S',
      offeringSemesterId: '2430',
    })).toEqual({ status: 'different_semester', canToggle: false })

    expect(getCourseOverviewPlannerState({
      activeSemesterId: '',
      cartCourseCodes: [],
      courseCode: 'UCUG 052S',
      offeringSemesterId: null,
    })).toEqual({ status: 'unavailable', canToggle: false })
  })
})
