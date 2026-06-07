# UniKorn Admin System Plan

## Phase 0 Audit

Current admin UI is intentionally small:

- `/admin`: a compact overview with pending feedback, pending merge requests, pending identity requests, and published feedback count.
- `/admin/feedback`: feedback publication review, merge request final review, feedback close/reopen, comment end/resume, and feedback history lists.
- `/admin/identity-management`: identity verification review with filters, pagination, document links, bulk approve/reject, and revoke.
- Admin shell: reused Keguang sidebar/top bar, pill navigation, admin route middleware, and bilingual locale keys.

Whole-site functional areas that need admin coverage:

- Community/forum: posts, comments, reactions, tags, files, display identities.
- Feedback governance: feedbacks, versions, merge requests, comments, hidden content, audit events.
- Users and identity: users, roles, email verification state, identity types, identity requests, deleted accounts.
- Courses and scheduler: course catalog, catalog versions, offerings, sections, meetings, carts, course posts, import health.
- Academic Map: curriculum programs, requirement groups, user academic profiles, course records, private grade data health.
- Matching: projects, user profiles, compatibility cache, interviews, project status.
- Contest: contest info, organizers, submissions, export state.
- Gugu wall: messages, replies, deletes, activity stats.
- Platform operations: files/OSS, STS token pool, cache, background tasks, OAuth clients/tokens, notifications, push subscriptions, analytics, search health.

## Target Information Architecture

The admin system should become a first-class operations console while staying visually aligned with the Keguang blue campus tool language.

- Overview: full-site KPI strip, module health, pending work queues, recent admin audit activity.
- Users: account search, role/email/deletion filters, user detail summary, role changes, soft-delete/restore, identity shortcuts.
- Content: posts, comments, tags, files, gugu messages, moderation status, soft-delete/restore, hidden/deleted content audit.
- Feedback: existing feedback governance plus audit trail and comment visibility actions.
- Courses: catalog stats, offering/section health, semester filters, import metadata, course discussion stats.
- Academic Map: curriculum program/group health, user record counts, private grade visibility warnings, import/sync summary.
- Matching: projects/profiles status, cache health, embedding refresh metrics, project interview usage.
- Contest: contest settings, organizer management, submissions, export.
- Operations: cache, file URL cache, STS pool, background tasks, OAuth clients, notifications, push subscriptions.
- Audit Logs: every admin mutation with actor, action, target, note, timestamp, and metadata.

## Phased Frontend Delivery

### Phase 1: Planning And Backend Contract Surface

- Add documentation and align API response shapes.
- Add shared admin API composable types for overview, users, content, courses, operations, and audit.
- No visual change beyond navigation placeholders if backend is not ready.

### Phase 2: Full Overview And Audit

- Replace the small overview with full-site metrics, pending queues, health cards, and recent admin activity.
- Add an Audit Logs page with filtering by action, target type, actor, and date.
- Keep compact cards, restrained typography, and responsive two/three-column grids.

### Phase 3: Users And Content Management

- Add Users page with search, filters, pagination, role update, soft-delete/restore.
- Add Content page with posts/comments/tags/files/gugu metrics and moderation lists.
- Actions should use confirmation modals and visible success/error notices.

### Phase 4: Courses, Academic Map, Matching, Contest

- Add domain dashboards that expose data health and admin-relevant lists.
- Avoid exposing private grades by default; only show aggregate Academic Map health.
- Keep destructive or sync/import actions behind explicit confirmation.

### Phase 5: Operations

- Add cache, STS/file storage, background task, OAuth, notification, and push subscription panels.
- Surface operational data that previously required terminal scripts.

## Frontend Change Requirements

- All new copy must be bilingual in `i18n/locales/en.json` and `i18n/locales/zh.json`.
- All API calls must use `useApi().fetchWithAuth`.
- Admin pages must use `definePageMeta({ middleware: "admin", layout: "admin" })`.
- Visual language must match `forum`/`courses`: light blue page background, white cards, blue primary actions, restrained hover states.
- No hardcoded colors where theme CSS custom properties can be used.
- Verify with local Nuxt build and browser screenshots on desktop and mobile.

