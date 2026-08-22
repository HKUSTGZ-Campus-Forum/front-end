import { describe, expect, it } from 'vitest'
import {
  getSchedulerBundleLabel,
  type BundleData,
  type SchedulerSection,
} from '../../utils/scheduler'

function section(name: string, sectionType: string, bundle: number): SchedulerSection {
  return {
    semester_id: '2610',
    section_id: `${sectionType}-${bundle}-${name}`,
    name,
    bundle,
    layer: 1,
    quota: 30,
    section_type: sectionType,
    is_main: false,
    lectures: [],
  }
}

function bundle(...sections: SchedulerSection[]): BundleData {
  return {
    id: sections[0]?.bundle || 1,
    layer: 1,
    enabled: true,
    sections,
  }
}

describe('scheduler bundle labels', () => {
  it('preserves alphanumeric alternatives such as LA2A and LA2B', () => {
    expect(getSchedulerBundleLabel(bundle(section('LA2A', 'LA', 2)))).toBe('LA2A')
    expect(getSchedulerBundleLabel(bundle(section('LA2B', 'LA', 3)))).toBe('LA2B')
  })

  it('keeps combined lecture/tutorial labels readable', () => {
    expect(getSchedulerBundleLabel(bundle(
      section('L01', 'L', 1),
      section('T01', 'T', 1),
    ))).toBe('L01/T01')
  })
})
