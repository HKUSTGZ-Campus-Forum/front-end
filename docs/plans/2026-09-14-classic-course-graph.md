# Classic course graph restoration

Status: implemented; production activation must be verified separately.

The scoped school candidate starts from frontend `1310190a150e07f11415542a34a5b89bcb5e72af`. It restores only the course graph and retains the other deployed application code. The backend remains `22d0c6a74790502b1de60656dfb8dbf0df4bae61`; no migrations or product data changes are requested.

`CourseUniversePage` at `/courses/graph` now mounts `CourseUniverseLegend` and `CourseUniverseCanvas`, with subject chips ordered by course count, classic Graph / Explore / Planner / Degree Progress navigation, SVG relationship lines, zoom/fit/focus and course selection. It reads `/api/scheduler/map/components`, `/lines` and `/courses` through `useScheduler`, supplementing titles from `/api/courses?stage=all`. This is the legacy map dataset, not the official catalog relationship feed; course-overview requirements remain unchanged.

The adapter's `classic` layout preserves the seed coordinate space and wide lower rows of isolated courses. Other callers retain their compact layout. Mobile controls have 44px targets and the canvas grows around its subject chips; reduced motion and load-error retry are supported. Later explorer components remain in the source but are no longer mounted by the graph page.

Verification: graph coordinate regression tests; i18n check; full frontend suite and production build; Chinese/English and light/dark desktop/mobile browser checks; zoom, fit, panning, keyboard selection, detail links, guest-cart notice, empty data and failed-load retry. Production release uses the backend manifest only, after this candidate is reachable from frontend main and the validator succeeds.
