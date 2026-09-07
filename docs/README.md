# Frontend documentation index

Current implementation references, reconciled against frontend `2c886f8` and backend `d02ce0e` on 2026-09-05. This is a source baseline, not live deployment verification.

| Task | Read first | Source/test navigation |
|---|---|---|
| New agent session | [AGENTS](../AGENTS.md), [maintenance](maintenance.md) | [architecture](architecture.md), [source map](source-map.md) |
| Setup or verification | [development](development.md), [testing](testing.md) | Package scripts, Nuxt config and CI |
| API, SSO, onboarding, account settings | [auth and API](features/auth-api.md) | Auth composables, guards, OIDC tests |
| Theme, layout, localization, accessibility | [UI conventions](features/ui.md) | [theme reference](THEME_SYSTEM.md), [i18n](i18n-guidelines.md), [product](product.md) |
| Courses, planner, saved plans, calendar, graph | [academic systems](features/academic.md) | Scheduler/course/academic tests |
| Forum, uploads, search, feedback, push/PWA | [community](features/community.md) | File, forum, security and [automatic-update tests](../tests/pwa) |
| Admin or contests | [administration](features/administration.md) | Admin routes/composables; backend guards |
| Assistant, recruitment, mascot, TeamUp, MeetCampus | [integrations](features/integrations.md) | Integration tests and service boundaries |
| Deploy or change runtime configuration | [production boundaries](production-environment.md) | [dev/legacy deployment](../deploy/README.md), backend school runbook |
| Creative spaces and private external repositories | [MakerSpace](features/makerspace.md) | Creator ownership, isolation, builds and publication review |
| Historical plans or rationale | [history](history.md) | Git archive retrieval |

Read feature docs with their source and tests. The existence of a page file is not proof that navigation reaches it: middleware redirects and external proxy ownership matter. The [source map](source-map.md) includes remaining legacy surfaces and helper directories.

Update the relevant guide and changelog with every notable code change; see [maintenance](maintenance.md). New substantial work gets an explicitly scoped design in `docs/plans/`, then its implemented behavior is reflected in the current reference.

For new substantial work, use [the plan guide](plans/README.md).
