import { computed, useRoute } from '#imports'
import { normalizeSchedulerPlanOrigin, SCHEDULER_PLAN_ORIGIN_QUERY } from '~/utils/schedulerPlanNavigation'

export function useSchedulerPlanNavigation() {
  const route = useRoute()
  const { getLocalePath } = useAppLocale()

  const originSemester = computed(() => normalizeSchedulerPlanOrigin(route.query[SCHEDULER_PLAN_ORIGIN_QUERY]))
  const originQuery = computed(() => originSemester.value
    ? { [SCHEDULER_PLAN_ORIGIN_QUERY]: originSemester.value }
    : {})

  const toPlanPage = (path: string, query: Record<string, string> = {}) => getLocalePath({
    path,
    query: { ...originQuery.value, ...query },
  })

  const plannerTo = computed(() => getLocalePath(
    originSemester.value
      ? `/courses/planner/${originSemester.value}`
      : '/courses/planner',
  ))
  const plansTo = computed(() => toPlanPage('/courses/planner/plans'))
  const sharedTo = computed(() => toPlanPage('/courses/planner/shared'))

  return {
    originSemester,
    plannerTo,
    plansTo,
    sharedTo,
    toPlanPage,
  }
}
