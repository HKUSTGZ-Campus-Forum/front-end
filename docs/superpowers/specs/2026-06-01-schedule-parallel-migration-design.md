# UniKorn Schedule Assistant Parallel Migration Design

Date: 2026-06-01

## 1. Objective

Migrate the core CoursePlan schedule assistant into the UniKorn main site while
keeping the existing standalone scheduler stable and independently usable.

The new main-site entry is `/schedule`. The existing standalone site remains at
`https://scheduler.unikorn.axfff.com`.

This work is a parallel migration, not a replacement deployment. The old site
must remain available throughout implementation, testing, and any future
main-site entry switch.

## 2. Confirmed Product Scope

The main site will migrate only the two core schedule assistant surfaces:

- `/schedule/dashboard`
- `/schedule/dashboard/:semester`
- `/schedule/map`

`/schedule` redirects to `/schedule/dashboard`.

The old standalone home page, documentation pages, BetterAuth account pages,
old user accounts, and saved historical carts are intentionally not migrated.

The new main-site implementation uses the existing UniKorn authentication
system:

- Guests keep a temporary browser-local cart that is not persisted.
- Logged-in UniKorn users save carts through the UniKorn Flask API.
- Existing standalone scheduler users and carts remain isolated in the old
  system.

## 3. Protected Old-Site Boundary

The migration must not modify:

- the `CoursePlan.search` deployment;
- the old scheduler database schema or user data;
- the PM2 process that serves the old scheduler;
- the `scheduler.unikorn.axfff.com` domain or routing;
- the old site's BetterAuth identity system.

The old database is accessed read-only during public-data snapshot imports.
The new system never writes migration status or user data back into it.

The standalone URLs remain valid rollback paths:

- `https://scheduler.unikorn.axfff.com/home`
- `https://scheduler.unikorn.axfff.com/dashboard/2530`
- `https://scheduler.unikorn.axfff.com/map`

## 4. Repository And Deployment Boundaries

The migration spans two independently versioned repositories:

- `front-end`: Nuxt main-site pages, scheduler components, solver, i18n, and
  local browser verification.
- `back-end`: Flask API, scheduler models, public-data snapshot importer,
  backend tests, and deployment to the development API.

The legacy `CoursePlan.search` repository is reference-only for this work.

The existing deployment convention remains unchanged:

- Back-end changes are pushed to `back-end/main`.
- `back-end/main` automatically deploys to `https://dev.unikorn.axfff.com`.
- Local front-end verification runs at `localhost:3000`.
- The local front-end continues to use the development API.
- Product deployment and the formal production entry switch are not performed
  automatically.

## 5. Route Naming

The user-facing main-site route is `/schedule`.

The Flask API keeps its existing `/api/scheduler/*` path. This API path is
internal implementation detail and does not need to mirror the page route.
Keeping the already deployed API prefix avoids unnecessary migration churn.

The old domain also remains unchanged:

`https://scheduler.unikorn.axfff.com`

## 6. Front-End Architecture

### 6.1 Pages

The front-end should expose:

- `/schedule`
  - Redirects to `/schedule/dashboard`.
- `/schedule/dashboard`
  - Fetches and displays available semesters.
- `/schedule/dashboard/:semester`
  - Renders the schedule workspace.
- `/schedule/map`
  - Renders the academic prerequisite map.

The existing partial migration under `pages/scheduler/` should be renamed and
completed under `pages/schedule/`.

### 6.2 Dashboard Features

The dashboard must preserve the old site's core planning behavior:

- Search courses by code or title.
- Show frequent-subject shortcuts and paginated results.
- Add and remove courses.
- Separate Main and KLMS courses.
- Enable or disable a course.
- Enable all, disable all, or toggle individual bundles within a layer.
- Select banned timetable periods.
- Detect timetable conflicts.
- Enumerate and navigate valid plans.
- Show weekend columns when selected lectures require them.
- Configure timetable block content:
  - course name;
  - section;
  - location;
  - instructor;
  - duration.
- Display course detail:
  - description;
  - prerequisites;
  - co-requisites;
  - exclusions.

### 6.3 Guest And Logged-In Cart Behavior

The UI needs a cart adapter with two implementations:

- Guest adapter:
  - Holds cart state locally in the browser.
  - Fetches public course details when adding a course.
  - Does not call JWT-protected cart endpoints.
  - Displays a dismissible notice that changes are not saved.
- Authenticated adapter:
  - Loads and mutates the cart through `/api/scheduler/cart/*`.
  - Persists course, bundle, and layer choices for the UniKorn user.

Both paths feed the same normalized `CartCourse` shape into the dashboard and
solver. The visual and solver behavior must not depend on whether a user is
logged in.

### 6.4 Solver Requirements

The current partial Nuxt solver is not behaviorally equivalent to the legacy
solver and must be corrected.

For every enabled course:

1. Group bundles by layer.
2. Filter out disabled bundles and bundles overlapping banned periods.
3. Require at least one remaining bundle for every active layer.
4. Choose exactly one valid bundle from each layer.
5. Check all lectures from all chosen layers against the shared conflict
   bucket.
6. Recurse into the next layer and then the next course.
7. Emit each complete valid plan.

The old data model stores lecture days as `1 = Monday` through `7 = Sunday`.
The solver and timetable must consistently convert this to zero-based UI
indexes only at the browser boundary using `day - 1`.

The solver must return structured outcomes that distinguish:

- empty cart;
- all courses disabled;
- a course layer with no enabled or non-banned bundle;
- no conflict-free plan;
- one or more valid plans.

### 6.5 Visual Language And Internationalization

The schedule pages are part of the main site and should follow the standard
UniKorn visual language used by the forum and courses pages:

- deep-blue navigation;
- white toolbar and content cards;
- light-blue page background;
- theme variables instead of new hardcoded colors;
- lightweight card, chip, pill, hover, and shadow patterns;
- restrained information-focused layout.

All new and migrated user-facing copy must be provided in both Chinese and
English through the existing i18n locale files. Hardcoded English strings in
the partial migration must be removed.

## 7. Back-End Architecture

The Flask API continues to expose:

- `GET /api/scheduler/semesters`
- `GET /api/scheduler/courses/search`
- `GET /api/scheduler/courses/:code`
- `GET /api/scheduler/map/components`
- `GET /api/scheduler/map/lines`
- `GET /api/scheduler/map/courses`
- authenticated `/api/scheduler/cart/*` CRUD and toggle routes

The existing idempotent scheduler schema initialization remains in place.

Additional backend hardening should cover:

- malformed request bodies;
- invalid semesters;
- adding a course with no scheduler sections for the selected semester;
- bundle and layer toggle targets that do not exist;
- deterministic serialization ordering;
- clear JSON errors suitable for translated front-end messages.

The API remains responsible only for authenticated persistence and public
data. Plan generation stays in the front-end so guest and authenticated users
receive identical planning behavior.

## 8. Public-Data Snapshot Import

The existing `migrate_scheduler_data.py` script should become a deliberate,
repeatable snapshot-import workflow.

### 8.1 Imported Data

Copy only public schedule data:

- course fields used by the scheduler;
- scheduler sections;
- scheduler lectures;
- map components;
- map lines.

Do not copy:

- old BetterAuth users;
- sessions;
- accounts;
- old user carts;
- old bundle cart selections.

### 8.2 Import Algorithm

1. Open a read-only source database connection supplied at execution time.
2. Read source rows and source counts before modifying destination data.
3. Validate required source fields and references.
4. Start a destination transaction.
5. Upsert scheduler-related course fields by course code.
6. Replace scheduler-specific sections, lectures, map components, and map
   lines as a snapshot.
7. Validate destination counts and references:
   - every section references an imported destination course;
   - every lecture references a destination section for the same semester;
   - every map line references valid map endpoints when its line type requires
     endpoints;
   - at least one semester and section exist after import;
   - imported row counts match expected source counts after documented skips.
8. Commit only after validation succeeds.
9. Roll back the complete destination transaction if any stage fails.
10. Print a structured summary with source counts, destination counts, skips,
    and validation results.

The source connection string is an execution-time secret and must not be
written into the repository.

## 9. Error Handling

Front-end requests should expose translated, actionable states:

- unable to load semester list;
- course search failed;
- cart load failed;
- course cannot be added for the selected semester;
- map data unavailable;
- cart is empty;
- all courses are disabled;
- all bundles in a specific layer are unavailable;
- no conflict-free timetable exists.

Guest cart mutations should update local state directly. Authenticated cart
mutations should show errors without silently diverging from server state; on
failure the UI should refresh or restore the previous normalized cart.

Snapshot-import failures must abort with non-zero exit status and must not
leave partially replaced scheduler tables.

## 10. Test Strategy

### 10.1 Front-End Unit Tests

Add solver tests for:

- one course with one layer;
- one course with lecture and tutorial layers;
- multiple courses with multiple layers;
- cross-course overlap rejection;
- cross-layer overlap rejection;
- banned-period rejection using one-based lecture days;
- weekend lecture rendering;
- disabled courses;
- disabled bundles;
- a layer with no valid bundles;
- no conflict-free solution.

Add cart-adapter tests for:

- guest add, remove, and toggle without protected API requests;
- authenticated mutations using the backend API;
- normalized cart equivalence between guest and authenticated paths.

### 10.2 Back-End Tests

Extend scheduler route tests for:

- invalid and missing JSON bodies;
- invalid semester behavior;
- course with no sections for a selected semester;
- bundle and layer toggle validation;
- deterministic cart serialization;
- authenticated cart isolation between UniKorn users.

Add importer tests for:

- successful public-data snapshot import;
- safe repeat execution;
- source reference validation failure;
- transaction rollback on destination validation failure;
- no migration of old user data.

### 10.3 Browser Verification

Run the local front-end at `localhost:3000` against
`https://dev.unikorn.axfff.com` and verify:

- `/schedule` redirect;
- semester selection;
- course search and pagination;
- guest cart planning;
- logged-in cart persistence;
- Main and KLMS tabs;
- layer and bundle toggles;
- banned periods;
- multiple valid plans;
- course detail;
- map loading and search;
- Chinese and English UI;
- layout consistency at desktop and narrow widths.

After verification, stop the local dev server so port `3000` is free.

### 10.4 Old-Site Survival Verification

Before and after backend deployment, check:

- `https://scheduler.unikorn.axfff.com/home`
- `https://scheduler.unikorn.axfff.com/dashboard/2530`
- `https://scheduler.unikorn.axfff.com/map`

These checks confirm that the migration has not changed the standalone
scheduler deployment.

## 11. Delivery Sequence

1. Preserve the old deployment and confirm its health.
2. Add front-end unit tests that reproduce the current multi-layer and day
   indexing solver bugs.
3. Correct the solver and introduce guest/authenticated cart adapters.
4. Rename main-site pages and links from `/scheduler` to `/schedule`.
5. Complete Dashboard and Map functionality, i18n, error states, and styling.
6. Harden backend scheduler API behavior and tests.
7. Upgrade the public-data importer with transactions and validation.
8. Run backend tests and push back-end changes to `back-end/main`.
9. Wait for `https://dev.unikorn.axfff.com` deployment and import the public
   scheduler snapshot using a read-only old-database connection.
10. Run live API validation.
11. Run local front-end tests, type checks, build checks, and browser
    verification on `localhost:3000`.
12. Recheck old standalone-site health.
13. Stop the local development server.
14. Report the verified development-chain result.

## 12. Production Entry Switch

The production main-site sidebar must continue to point to the old standalone
site during this delivery.

Switching the production sidebar to the internal `/schedule` route is a
separate follow-up decision after development-chain verification. Even after a
future switch, the standalone scheduler domain remains online as a direct
rollback route.

## 13. Known Dependency

Executing the development snapshot import requires a read-only connection
string for the old CoursePlan scheduler database or equivalent server-side
access to that source database. The connection string is not present in the
local repositories and must be supplied securely at execution time.

