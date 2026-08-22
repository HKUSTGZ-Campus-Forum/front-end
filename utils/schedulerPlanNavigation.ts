export const SCHEDULER_PLAN_ORIGIN_QUERY = 'fromSemester'

export function normalizeSchedulerPlanOrigin(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && /^\d{4}$/.test(candidate)
    ? candidate
    : ''
}
