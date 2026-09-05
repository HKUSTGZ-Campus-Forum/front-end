# Academic features

## Course discovery, overview and graph

Current course routes are under [pages/courses](../../pages/courses). [useCourseOverview](../../composables/useCourseOverview.ts) and [course overview DTOs](../../types/course-overview.ts) distinguish canonical course identity, catalog rules and semester offerings. Course-level reviews aggregate historical reviews; each review still belongs to a specific offering. Old semester review URLs are compatibility entry points.

[Course universe components](../../components/courses/universe) use the pure [courseUniverse adapter](../../utils/courseUniverse.ts). Preserve logic nodes, relationship geometry, selection/hover visibility and source/provenance display. Read the backend relationship endpoint before changing graph semantics; map seed data is a fallback, not the catalog authority.

## Planner and cart

[useScheduler](../../composables/useScheduler.ts) loads data; [useSchedulerCart](../../composables/useSchedulerCart.ts), [cart loader](../../composables/useSchedulerCartLoader.ts) and [async helpers](../../utils/schedulerAsync.ts) coordinate guest/account/semester state. Guest carts are browser-local; authenticated carts use the API. Guard against stale requests restoring another account or semester, and preserve auth readiness before hydration.

[SchedulerDashboard](../../components/scheduler/SchedulerDashboard.vue) connects the UI to the [solver](../../utils/scheduler.ts), [cart logic](../../utils/schedulerCart.ts) and [ranked optimizer](../../utils/schedulerOptimizer.ts). Sections, layers and bundles are not interchangeable; selected courses can have lecture/lab/tutorial requirements. Ranked scoring uses exact decimal/BigInt logic; don't replace it with lossy sorting or approximate tie cutoffs.

[Popularity composable](../../composables/useSchedulerPopularity.ts) consumes current/history data. Backend eligibility, suppression and history freshness are part of the contract. Do not turn unavailable or suppressed counts into zero or treat them as all-student enrollment.

## Saved plans and calendar

[Plan helpers](../../utils/schedulerPlans.ts), [plan navigation](../../composables/useSchedulerPlanNavigation.ts), [saved plan pages](../../pages/courses/planner/plans.vue) and [shared plan page](../../pages/courses/planner/shared/[publicId].vue) distinguish working cart from named snapshots. Private/unlisted/public visibility, optimistic version conflict and current/updated/unavailable states come from the backend. Saving or opening a plan must not replace the cart; applying is explicit.

[Calendar export UI](../../components/scheduler/SchedulerCalendarExport.vue), [serializer](../../utils/schedulerCalendar.ts) and [download helper](../../utils/schedulerCalendarDownload.ts) create a local `.ics` snapshot for current or saved plans, including guests. Export only selected sections and their actual teaching dates. Preserve disjoint date ranges and deduplicate occurrences; request a fallback range only for missing dates. Guangzhou UTC+8 teaching time is serialized as UTC. It is a one-time file, with no calendar authorization or automatic sync; changes/holidays must be reflected in source data or reviewed by the user.

## Academic map

[useAcademicMap](../../composables/useAcademicMap.ts), [typed records](../../types/academic-map.ts), [manual import parsing](../../utils/academicMapManualImport.ts) and [academic components](../../components/academic-map) render backend requirement evaluation and course-history import. Preserve target major/cohort, repeated-course state, grade/credit meaning and incomplete requirement explanations. Avoid recoding backend allocation rules in view components.

## Verify and update

Use `tests/scheduler/`, [course tests](../../tests/courses), [graph tests](../../tests/course-universe), and [academic import tests](../../tests/academic-map). Check affected UI in both themes/languages and guest/authenticated modes. For calendar edits verify actual event sets/times, not only file download. Update the backend API reference if request/response, source authority or saved-plan semantics change.
