export const SCHEDULER_PLAN_ORIGIN_QUERY = 'fromSemester'

function finitePlanIndex(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null
}

/**
 * Converts an editable plan number into the zero/one-based value expected by
 * the scheduler UI: zero when there are no plans, otherwise 1..totalPlans.
 */
export function clampSchedulerPlanIndex(
  value: unknown,
  totalPlans: number,
  fallbackIndex: unknown = 1,
): number {
  const normalizedTotal = finitePlanIndex(totalPlans)
  if (normalizedTotal === null || normalizedTotal <= 0) return 0

  const normalizedValue = finitePlanIndex(value) ?? finitePlanIndex(fallbackIndex) ?? 1
  return Math.min(normalizedTotal, Math.max(1, normalizedValue))
}

export function normalizeSchedulerPlanOrigin(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && /^\d{4}$/.test(candidate)
    ? candidate
    : ''
}
