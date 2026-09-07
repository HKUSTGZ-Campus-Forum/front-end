# Frontend verification

Sources: [package scripts](../package.json), [CI](../.github/workflows/frontend-ci.yml), [test tree](../tests).

Start with tests covering the changed behavior, for example:

```bash
npm test -- tests/scheduler/calendar-export.test.ts
npm run test:scheduler
npm run test:scheduler:ranked
```

Before integrating application changes, the existing frontend gate is:

```bash
npm run i18n:check
npm test
npm run build
```

CI additionally builds a Linux amd64 container and checks its user and healthcheck. Run the applicable container/deployment contracts when changing those files. There is **no `lint` or `typecheck` script** in the audited `package.json`; do not list fictional commands or results. `npx nuxi prepare` regenerates Nuxt types, not a full type check.

## Behavior to verify

| Area | Test groups / manual scope |
|---|---|
| SSO, onboarding, API base | `tests/oidc.test.ts`, `tests/onboarding.test.ts`, `tests/api-base-url.test.ts`; real SSO requires configured provider access |
| Scheduler | `tests/scheduler/`: solver, cart, auth readiness, async races, popularity, saved/ranked plans, calendar serialization/download/UI |
| Courses and academic map | `tests/courses/`, `tests/course-universe/`, `tests/academic-map/` |
| Forum, uploads, search, HTML rendering | `tests/forum/`, `tests/file-upload/`, `tests/search/`, `tests/security/` |
| UI and integrations | `tests/theme/`, `tests/home/`, `tests/navigation/`, `tests/teamup/`, `tests/assistant/`, `tests/recruitment/`, `tests/mascot/` |
| Deployment / server | `tests/deploy/`, `tests/server/` |
| Automatic frontend updates / PWA | `tests/pwa/`, `tests/server/health.test.ts`; production-build A → B browser update/deferral and emitted worker identity/headers |

For UI changes, check affected routes in both languages, both themes and narrow/wide viewports. Exercise keyboard/focus behavior for dialogs and navigation; verify guest and authenticated states when permissions or persistence differ. Include loading, empty and error states when changing async flows. Some tests inspect source wiring; a passing source assertion does not replace a browser interaction check.

The frontend suite does not fully validate backend admin permissions, provider responses, OSS or external TeamUp/MeetCampus runtime. Use backend tests or an explicitly configured integration environment for those contracts. Do not infer external-service health from a local build.

For documentation-only changes, check links, source claims, commands and diff scope. Do not install dependencies or run unrelated builds just to edit prose. Report what ran, what skipped and why.
