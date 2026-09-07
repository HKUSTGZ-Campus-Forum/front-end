# Automatic frontend updates

Status: implemented; PR review/release pending. Source baseline: frontend `2836b88`; no backend contract change. Local main was fast-forwarded before starting `codex/automatic-frontend-updates`.

## Problem and scope

The manual toast's dismissed flag only lived in memory: discovering a waiting worker on another page announced it again. Workers were registered using the loaded page's SHA in their URL; old tabs could register their own old URL against the shared scope. Worker-byte checks alone did not establish whether application JS was current, and unconditional controllerchange reloads included first installs.

Replace manual confirmation with production-only automatic checks. Keep existing cache/push boundaries, auth and planner semantics. Do not implement actual push subscriptions, modify deployment environments, persist every unsaved workflow or change dependencies.

## Decisions

- Use frontend `/health` as authoritative release identity, with strict response validation, no-store fetch, timeout, single-flight and event throttling. Compare equality, not SHA ordering (rollbacks can be valid).
- Use a stable `/sw.js`, with build identity stamped into the output by Nuxt after copying public assets. Do not rewrite tracked source during builds. This follows the [service worker lifecycle guidance](https://web.dev/articles/service-worker-lifecycle#avoid_changing_the_url_of_your_service_worker_script).
- Automatically activate only after successful precache. Separate worker activation from safe page navigation; HTML and Nuxt chunks remain network-owned. Preserve legacy SKIP_WAITING compatibility and push/badge handlers.
- Persist attempted target builds in tab-session storage before reloading. Fail closed if persistence cannot be verified. Never clear auth, user data or unrelated caches.
- Defer page reload during edited/mounted controls, active uploads, planner/iframe workspaces and explicit busy/hidden-draft markers. This is safety deferral without a second confirmation UI. Legacy already-loaded clients cannot gain these guards retroactively; their first controllerchange can cause one reload.
- Remove the retired toast, its composable and its Chinese/English strings. Keep install-app and push UI unchanged.

## Acceptance and rollout

Relevant tests must cover strict identity, unchanged/changed version, repeated and concurrent events, offline/errors, cross-reload loop guard, unavailable storage, editing/busy deferral, first install, BFCache, stable registration, build stamping and cache boundaries. Run i18n, full tests and production build; inspect emitted worker SHA and HTTP headers. Exercise production browser first install, safe/edited A → B update and legacy migration where possible. Unit tests are not proof of actual phone push delivery or school proxy cache behavior.

Build-time `NUXT_PUBLIC_APP_BUILD_VERSION`, runtime `/health`, and served HTML/worker must describe the same immutable frontend release. The change is submitted for review; merge and deployment require separate authorization. Update [community reference](../features/community.md), source map, testing guide, docs index, API exception reference and changelog in the same change. Record verification outcomes and any environment limitations before handoff.

## Verification observed on 2026-09-07

- Node 22.23.2: PWA plus health tests, 83/83 passed. Includes an explicit regression for persistent topbar search not permanently disabling updates after blur.
- `npm run i18n:check`: passed (2380 keys and hardcoded-copy scan).
- Final production build passed with `2836b88-auto-update-local`; existing Tailwind sourcemap, large-chunk and upstream package-export warnings remain. Node output HTTP smoke returned `/health` 200 with `Cache-Control: no-store` and the exact identity, and `/sw.js?v=old-page-version` 200 with `must-revalidate, no-cache`, the same embedded identity and no unresolved placeholder. The tracked worker template remained unchanged by the build.
- Actual built Nuxt app rendered the Chinese home/rules and English rules pages without the retired update toast. No real backend or authenticated account was used. Temporary loopback test services were stopped after verification.
- Full suite: 529 passed, 23 failed out of 552. All failures are the two existing Linux atomic-release suites running Bash through Windows/WSL with invalid `C:\\...` path translation; no tests were changed/skipped to conceal this. Linux CI remains required before integration.
- Real in-app Chromium harness: first worker activation left HTML navigations at 1; build 1 → 2 automatically advanced exactly to 2; editing during build 3 kept the page at build 2 with its test draft intact while worker 3 activated; leaving the editor advanced once to 3. Serving stale build-3 HTML for server build 4 caused exactly one attempted reload, and a subsequent check kept the count at 4; fixing the server and deploying build 5 recovered automatically to count 5. No update-confirmation UI appeared.
- The isolated harness deliberately does not validate Nuxt authentication, real backend requests, phone push delivery, school reverse-proxy headers, or an already-open legacy browser session. These must not be inferred from its passing results.
