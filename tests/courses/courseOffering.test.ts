import { describe, expect, it } from 'vitest'
import {
  buildCourseExploreCardPath,
  findOfferingTagForSemester,
  type CourseOffering,
} from '../../utils/courseOffering'

const semesters: CourseOffering[] = [
  {
    code: '2025spring',
    display_name: '25-26春',
    year: '2025',
    season: 'spring',
    season_display: '春',
    offering_tag: '25-26Spring',
  },
  {
    code: '2025fall',
    display_name: '25-26秋',
    year: '2025',
    season: 'fall',
    season_display: '秋',
    offering_tag: '25-26Fall',
  },
]

describe('course offering helpers', () => {
  it('maps the selected filter semester to its offering tag', () => {
    expect(findOfferingTagForSemester(semesters, '2025spring')).toBe('25-26Spring')
  })

  it('builds explore card links for the selected course offering', () => {
    expect(buildCourseExploreCardPath('AIAA 2205', '2025spring', semesters)).toBe(
      '/courses/AIAA2205/offerings/25-26Spring',
    )
  })

  it('falls back to the course overview when no offering tag is available', () => {
    expect(buildCourseExploreCardPath('DLED4010[2]', '', semesters)).toBe('/courses/DLED4010')
    expect(buildCourseExploreCardPath('AIAA 2205', '2024winter', semesters)).toBe('/courses/AIAA2205')
  })
})
