# Scheduler saved plans and sharing design

## Goal

Let authenticated users save the concrete timetable currently shown by the planner, keep multiple named plans, reopen or apply one safely, share it by link or through a public gallery, and copy another user's shared plan.

## Product boundaries

- The existing per-user, per-semester cart remains the mutable planner workspace and the only source of popularity intent.
- A saved plan is a concrete section snapshot, never a solver result index.
- Saving, viewing, publishing, or copying a plan does not change popularity. Applying a plan replaces the active workspace atomically and updates popularity once.
- Sharing is read/copy only. There is no co-editing, comments, reactions, or following.
- Visibility is `private`, `unlisted`, or `public`, with `private` as the default.
- Public serializers never expose blocked periods, email, institutional identity, or other private planning preferences.

## Data model

`scheduler_plans` owns metadata, visibility, optimistic content version, private constraint snapshot, source attribution, and lifecycle timestamps. `scheduler_plan_courses` references a `CourseOffering` and stores a display snapshot. `scheduler_plan_sections` references exact `CourseSection` rows and stores a complete section/meeting snapshot.

Structured references support validation and filtering. Snapshots keep historical plans readable after a section changes or disappears. A plan is classified as `current`, `updated`, or `unavailable` by comparing saved and current section data.

## Main flows

1. Save the displayed timetable as a new private plan, optionally with a note and broader visibility.
2. Update a plan only with the version last read; stale writes return a conflict instead of overwriting another tab.
3. Preview a saved plan without changing the workspace.
4. Apply an available plan after explicit confirmation. Validation completes before the cart transaction starts; any unavailable section leaves the existing cart untouched.
5. Share with a random public UUID. Unlisted plans work only by link; public plans also appear in the gallery.
6. Copy a shared plan into the viewer's private library. The copy retains source attribution but is independent.

## UX direction

- The planner dashboard gets compact New plan, Save plan, and My plans actions.
- `/courses/planner/plans` uses a plan list plus selected timetable preview on desktop, and list/detail navigation on narrow screens.
- `/courses/planner/shared` provides semester/course filters and paginated public plans.
- `/courses/planner/shared/:publicId` is a read-only timetable detail with copy/apply actions as permitted.
- Existing Keguang blue and deep-dark theme tokens, Lucide icons, bilingual copy, focus states, 44px touch targets, skeleton/loading, empty, error, stale, and unauthorized states are required.

## Migration and release

- Source: none. This is an additive schema migration with no backfill.
- Targets: local and shared dev first; school production only through the exact-SHA joint release.
- Tables: three new scheduler plan tables.
- Operation: create tables, constraints, indexes, and foreign keys. Estimated initial rows: zero.
- Existing production rows are not updated, replaced, or deleted. Dev runtime plans are not migrated.
- Dry run: pristine PostgreSQL migration tests, upgrade from the current head, backend route tests, and shared-dev API/UI checks.
- Backup: `deploy-release.sh --activate` creates and verifies a production database backup before Alembic.
- Rollback: prefer application rollback while retaining additive tables. If database restoration is required, stop writes and restore the verified pre-release backup with the matching application release.

## Acceptance criteria

- A user can save two different concrete timetables for the same semester and reopen each exactly.
- Private plans return 404 to other viewers; unlisted links work; only public plans appear in discovery.
- A stale section is visibly marked, and an unavailable plan cannot partially replace the cart.
- Copying creates an independent private plan owned by the viewer.
- Apply is transactional and popularity remains user-distinct.
- Chinese and English, light and dark themes, desktop and mobile flows pass automated and visual checks.
