export type SchedulerCourseRangeHandle = 'minimum' | 'maximum'

export interface SchedulerCourseRange {
  minimum: number
  maximum: number
}

function boundedInteger(value: number, minimum: number, maximum: number): number {
  const integer = Number.isFinite(value) ? Math.round(value) : minimum
  return Math.max(minimum, Math.min(integer, maximum))
}

function courseRangeLimit(candidateCount: number): number {
  return Number.isFinite(candidateCount) ? Math.max(1, Math.trunc(candidateCount)) : 1
}

export function normalizeSchedulerCourseRange(
  minimum: number,
  maximum: number,
  candidateCount: number,
): SchedulerCourseRange {
  const limit = courseRangeLimit(candidateCount)
  const boundedMaximum = boundedInteger(maximum, 1, limit)
  return {
    minimum: boundedInteger(minimum, 1, boundedMaximum),
    maximum: boundedMaximum,
  }
}

export function moveSchedulerCourseRangeHandle(
  handle: SchedulerCourseRangeHandle,
  value: number,
  range: SchedulerCourseRange,
  candidateCount: number,
): SchedulerCourseRange {
  const current = normalizeSchedulerCourseRange(
    range.minimum,
    range.maximum,
    candidateCount,
  )

  if (handle === 'minimum') {
    return {
      minimum: boundedInteger(value, 1, current.maximum),
      maximum: current.maximum,
    }
  }

  return {
    minimum: current.minimum,
    maximum: boundedInteger(value, current.minimum, courseRangeLimit(candidateCount)),
  }
}

export function nearestSchedulerCourseRangeHandle(
  value: number,
  range: SchedulerCourseRange,
  activeHandle: SchedulerCourseRangeHandle,
  overlapDirection = 0,
): SchedulerCourseRangeHandle {
  if (range.minimum === range.maximum) {
    if (overlapDirection < 0) return 'minimum'
    if (overlapDirection > 0) return 'maximum'
    return activeHandle
  }

  const minimumDistance = Math.abs(value - range.minimum)
  const maximumDistance = Math.abs(value - range.maximum)
  if (minimumDistance === maximumDistance) return activeHandle
  return minimumDistance < maximumDistance ? 'minimum' : 'maximum'
}

export function schedulerCourseRangePercent(value: number, candidateCount: number): number {
  const limit = courseRangeLimit(candidateCount)
  if (limit === 1) return 0
  const boundedValue = boundedInteger(value, 1, limit)
  return ((boundedValue - 1) / (limit - 1)) * 100
}

export function schedulerCourseRangeValueAtPosition(
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  candidateCount: number,
): number {
  const limit = courseRangeLimit(candidateCount)
  if (limit === 1 || !Number.isFinite(trackWidth) || trackWidth <= 0) return 1
  const ratio = Math.max(0, Math.min(1, (clientX - trackLeft) / trackWidth))
  return 1 + Math.round(ratio * (limit - 1))
}
