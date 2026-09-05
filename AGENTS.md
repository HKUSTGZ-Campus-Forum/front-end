# UniKorn frontend — agent instructions

This is the authoritative entry point for engineering in this repository. Claude users follow the same rules through [CLAUDE.md](CLAUDE.md).

## Start here

1. Inspect this checkout's branch, upstream and local changes; preserve unrelated work. The frontend and backend have separate Git histories. Start new work on a scoped branch from the agreed baseline.
2. Read [docs/README.md](docs/README.md), then the task's feature/reference and source/test links. Read [architecture](docs/architecture.md) for cross-cutting changes.
3. Follow [documentation maintenance](docs/maintenance.md): **update the relevant docs in the same change as every notable modification**, and record notable behavior/technical changes in [CHANGELOG.md](CHANGELOG.md). Do not leave documentation as a follow-up.
4. Before authentication, API configuration, deployment or external integration work, read [API/auth](docs/features/auth-api.md) and [production boundaries](docs/production-environment.md). School releases are controlled by the backend's paired-SHA manifest and school runbook.

## Implement

- Nuxt 3 / Vue 3 / TypeScript. Keep domain logic in `utils/`, asynchronous state in composables, and components focused on interaction. Preserve SSR boundaries and use client-only components for browser-dependent rendering.
- Use `useApi().fetchWithAuth()` for protected backend calls and `fetchPublic()` for public ones. Authentication internals and signed OSS uploads are established exceptions; TeamUp's independent health bridge is documented separately.
- Keep JWT refresh and auth-restoration ordering. School SSO is the only login method; do not restore password forms. Enforce onboarding through server-owned state and the existing guards.
- Use theme variables, Chinese/English locale keys and locale-aware routes. Verify both `keguang-blue` and `deep-dark`. Preserve Nuxt names such as `<HomeKeguangPinned>` and `<HomeKeguangSidebar>`.
- Keep guest cart state separate from authenticated state. Preserve scheduler solver, section/bundle semantics, saved-plan privacy and calendar date/time rules.
- TeamUp is hosted through its independent `/teamup/app/` runtime; old `/matching` routes redirect. MeetCampus is independent and only has an allowlisted navigation bridge here. Do not recreate either external runtime inside this application.
- Keep changes small and relevant. Do not invent dependencies or compatibility layers. Never place provider/SSO secrets in public runtime configuration, logs or docs.

## Verify and hand off

Use [testing](docs/testing.md). For application changes, run the relevant tests first, then the required i18n, full-test and build gates before integration. There is currently no `typecheck` or `lint` package script; do not report them as run. Keep npm and pnpm locks aligned when changing dependencies; CI uses npm.

Honor existing user authorization and avoid repeated confirmation requests. Commit, push, PR, merge and deployment actions require applicable user authorization. A `main` push deploys shared dev, not school production. Do not invent co-author attribution.

Report behavior changed, docs updated, checks/outcomes, and unresolved limitations. For docs-only edits, validate links, commands and claims without installing dependencies or starting services merely to run an application build.
