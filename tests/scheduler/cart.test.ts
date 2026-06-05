import { describe, expect, it } from 'vitest'
import {
  addGuestCourse,
  removeGuestCourse,
  setGuestBundleEnabled,
  setGuestCourseEnabled,
  setGuestLayerEnabled,
} from '../../utils/schedulerCart'
import type { CourseDetail } from '../../utils/scheduler'

const detail: CourseDetail = {
  course_code: 'AIAA1001',
  course_title: 'AI Basics',
  course_title_abbr: 'AI',
  credit: 3,
  subject: 'AIAA',
  catalog_number: '1001',
  course_desc: 'Intro',
  pre_requirement: null,
  co_requirement: null,
  exclusion: null,
  pg_course: false,
  klms_course: false,
  sections: [
    {
      semester_id: '2530',
      section_id: 'L01',
      name: 'L01',
      bundle: 1,
      layer: 0,
      quota: 10,
      section_type: 'L',
      is_main: true,
      lectures: [],
    },
    {
      semester_id: '2530',
      section_id: 'T01',
      name: 'T01',
      bundle: 1,
      layer: 1,
      quota: 10,
      section_type: 'T',
      is_main: false,
      lectures: [],
    },
  ],
}

describe('guest cart helpers', () => {
  it('normalizes public course detail into the same layer shape as server carts', () => {
    const cart = addGuestCourse([], detail)

    expect(cart).toHaveLength(1)
    expect(cart[0].enabled).toBe(false)
    expect(Object.keys(cart[0].layers)).toEqual(['0', '1'])
  })

  it('immutably updates course, bundle, layer, and remove state', () => {
    const original = addGuestCourse([], detail)
    const enabled = setGuestCourseEnabled(original, 'AIAA1001', true)
    const bundleOff = setGuestBundleEnabled(enabled, 'AIAA1001', 1, 0, false)
    const layerOff = setGuestLayerEnabled(bundleOff, 'AIAA1001', 1, false)

    expect(original[0].enabled).toBe(false)
    expect(bundleOff[0].layers[0][0].enabled).toBe(false)
    expect(layerOff[0].layers[1][0].enabled).toBe(false)
    expect(removeGuestCourse(layerOff, 'AIAA1001')).toEqual([])
  })
})
