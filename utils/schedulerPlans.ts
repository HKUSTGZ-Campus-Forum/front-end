import type {
  CartCourse,
  PlanSelection,
  SchedulerPlanCourseInput,
  SchedulerPlanWriteInput,
  SchedulerPlanVisibility,
} from './scheduler'

export function buildSchedulerPlanCourses(
  courses: CartCourse[],
  selections: PlanSelection[],
  options: { includeDisabledCourses?: boolean } = {},
): SchedulerPlanCourseInput[] {
  const byCourse = new Map<number, SchedulerPlanCourseInput>()
  for (const selection of selections) {
    const course = courses[selection.courseIndex]
    if (!course || (!course.enabled && !options.includeDisabledCourses)) continue
    let value = byCourse.get(selection.courseIndex)
    if (!value) {
      value = { course_code: course.course_code, selections: [] }
      byCourse.set(selection.courseIndex, value)
    }
    value.selections.push({ bundle_id: selection.bundleId, layer: selection.layer })
  }
  return [...byCourse.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, value]) => ({
      ...value,
      selections: value.selections.sort(
        (left, right) => left.layer - right.layer || left.bundle_id - right.bundle_id,
      ),
    }))
}

export function buildSchedulerPlanWriteInput(options: {
  name: string
  description: string
  semesterId: string
  visibility: SchedulerPlanVisibility
  courses: CartCourse[]
  selections: PlanSelection[]
  bannedPeriods: boolean[][]
  version?: number
  includeDisabledCourses?: boolean
}): SchedulerPlanWriteInput {
  return {
    name: options.name.trim(),
    description: options.description.trim(),
    semester_id: options.semesterId,
    visibility: options.visibility,
    courses: buildSchedulerPlanCourses(options.courses, options.selections, {
      includeDisabledCourses: options.includeDisabledCourses,
    }),
    banned_periods: options.bannedPeriods.map(day => [...day]),
    ...(options.version === undefined ? {} : { version: options.version }),
  }
}

export function schedulerPlanContentFingerprint(options: {
  courses: CartCourse[]
  selections: PlanSelection[]
  bannedPeriods: boolean[][]
  includeDisabledCourses?: boolean
}): string {
  return JSON.stringify({
    courses: buildSchedulerPlanCourses(options.courses, options.selections, {
      includeDisabledCourses: options.includeDisabledCourses,
    }),
    banned_periods: options.bannedPeriods,
  })
}
