# MakerSpace

The main sidebar links to `/makerspace`, replacing its standalone TeamUp entry. The existing `/teamup/` host page and legacy redirects remain available; approved TeamUp is discovered through the backend-owned MakerSpace catalog.

## Source and user flows

- [Catalog](../../pages/makerspace/index.vue): approved discovery, search/categories, owner spaces and administrator review navigation.
- [Create](../../pages/makerspace/new.vue) and [space form](../../components/makerspace/SpaceForm.vue): bilingual metadata, immutable slug, GitHub repository/branch and static/Node/Python build settings.
- [Space detail](../../pages/makerspace/[slug]/index.vue): public launch, private owner settings, per-space read-only deploy key, one-time webhook secret, encrypted environment management, build logs, preview, submit/withdraw and archive.
- [Review](../../pages/makerspace/review.vue): exact commit and artifact digest, authenticated source download, preview link, independent approval/rejection. The backend enforces identity and state, not just disabled buttons.
- [Creator guide](../../pages/makerspace/guide.vue): private repository deploy key/webhook setup, relative paths, runtime constraints and publication workflow.
- [API composable](../../composables/useMakerSpace.ts), [DTOs](../../types/makerspace.ts), and [theme styles](../../assets/css/makerspace.scss): shared API/error handling, typed contracts and Keguang blue/deep-dark/mobile presentation.

Wait for auth restoration before private requests. Public cards use published backend metadata; never substitute an owner's draft response into the discovery list. Settings edits do not publish. Builds do not publish. Approval queues a separate public runtime, whose successful health check controls catalog activation.

## Security contract

The trusted host page asks the API for a browser-bound runtime session. Accept only the exact `/api/makerspace/run/<48 hex>/` format or the pre-existing `/teamup/` integration path. Never render an arbitrary repository-supplied launch URL.

The creator iframe must retain `sandbox="allow-scripts allow-forms allow-downloads"` without `allow-same-origin`, and `referrerpolicy="no-referrer"`. HTTP response CSP, one-use partition-cookie bootstrap and authorization on every resource are backend responsibilities. Do not pass main JWTs or user info to an iframe. The [service worker](../../public/sw.js) bypasses MakerSpace API paths entirely, including navigations.

Repository private keys and saved environment values never return to the frontend. Webhook secrets appear once after generation and can be hidden. Clipboard failure has a manual-copy fallback. Hosting or credential unavailability is explicit; saving a draft must not be presented as a successful deployment. Existing TeamUp ownership is attribution only; its independent runtime and release permissions are unchanged.

## Verification and deployment

Required gates: i18n checks, full Vitest suite and Nuxt production build. The navigation contract is in [sidebar tests](../../tests/home/keguang-sidebar-teamup.test.ts). Also inspect guest/owner states, creation, private denial, deployment/review states and logs at desktop/mobile widths in both languages and themes. A compiling interface is not runtime-hosting verification.

Backend source/worker and school activation requirements are documented in its `docs/features/makerspace.md` and `deploy/makerspace/`. The enclosing workspace's `docs/makerspace.md` routes future external-repository onboarding. Local fixtures and a passing build do not prove a school deployment or a real private GitHub repository connection.
