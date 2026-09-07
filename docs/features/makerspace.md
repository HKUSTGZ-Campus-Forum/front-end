# MakerSpace

The main sidebar links to `/makerspace`, replacing its standalone TeamUp entry. Every public space uses `https://unikorn.hkust-gz.edu.cn/makerspace/<slug>`. The creation form fixes this prefix and accepts only the suffix. Legacy `/teamup/` and nested routes redirect with 308, preserving queries, to `/makerspace/teamup`; approved TeamUp is discovered through the backend-owned MakerSpace catalog.

## Source and user flows

- [Catalog](../../pages/makerspace/index.vue): approved discovery, search/categories, owner spaces and administrator review navigation.
- [Create](../../pages/makerspace/new.vue) and [space form](../../components/makerspace/SpaceForm.vue): bilingual metadata, immutable slug, GitHub repository/branch and static/Node/Python build settings.
- [Space detail](../../pages/makerspace/[slug]/index.vue): public launch, private owner settings, per-space read-only deploy key, one-time webhook secret, encrypted environment management, build logs, preview, submit/withdraw and archive.
- [Review](../../pages/makerspace/review.vue): exact commit and artifact digest, authenticated source download, preview link, independent approval/rejection. The backend enforces identity and state, not just disabled buttons.
- [Creator guide](../../pages/makerspace/guide.vue): private repository deploy key/webhook setup, relative paths, runtime constraints and publication workflow.
- [API composable](../../composables/useMakerSpace.ts), [DTOs](../../types/makerspace.ts), and [theme styles](../../assets/css/makerspace.scss): shared API/error handling, typed contracts and Keguang blue/deep-dark/mobile presentation.

Wait for auth restoration before private requests. Public cards use published backend metadata; never substitute an owner's draft response into the discovery list. Settings edits do not publish. Builds do not publish. Approval queues a separate public runtime, whose successful health check controls catalog activation.

## Security contract

The trusted host page asks the API for a browser-bound runtime session. Accept only the exact `/api/makerspace/run/<48 hex>/` format for ordinary hosted spaces. Never render an arbitrary repository-supplied launch URL.

The creator iframe must retain `sandbox="allow-scripts allow-forms allow-downloads"` without `allow-same-origin`, and `referrerpolicy="no-referrer"`. HTTP response CSP, one-use partition-cookie bootstrap and authorization on every resource are backend responsibilities. Do not pass main JWTs or user info to an iframe. The [service worker](../../public/sw.js) bypasses MakerSpace API paths entirely, including navigations.

Repository private keys and saved environment values never return to the frontend. Webhook secrets appear once after generation and can be hidden. Clipboard failure has a manual-copy fallback. Hosting or credential unavailability is explicit; saving a draft must not be presented as a successful deployment. Existing TeamUp ownership is attribution only; its independent runtime and release permissions are unchanged.

## Verification and deployment

Required gates: i18n checks, full Vitest suite and Nuxt production build. The navigation contract is in [sidebar tests](../../tests/home/keguang-sidebar-teamup.test.ts). Also inspect guest/owner states, creation, private denial, deployment/review states and logs at desktop/mobile widths in both languages and themes. A compiling interface is not runtime-hosting verification.

Backend source/worker and school activation requirements are documented in its `docs/features/makerspace.md` and `deploy/makerspace/`. The enclosing workspace's `docs/makerspace.md` routes future external-repository onboarding. Local fixtures and a passing build do not prove a school deployment or a real private GitHub repository connection.

## School deployment

MakerSpace was deployed on 2026-09-07 with frontend `49bee6e792f043616745d307defd5887b82c3be2`, backend `96faa515b6a4f266d123d9f3a1ba43af1e425076` and control manifest `c1949dc5b8618e2e6269c895b202c0657bfae413`. Hosting and repository credentials are ready. The approved TeamUp catalog entry belongs to verified creator account 1256 and keeps its independent runtime at `/teamup/`. Production desktop/mobile-width UI, protected API responses, and existing product health were checked. Each new private repository still needs its own Deploy Key installation and real build. See the backend `deploy/makerspace/school-release-20260907.md` for deployment and backup evidence.

TeamUp renders the existing reviewed `TeamUpHostPage` bridge directly inside its canonical MakerSpace page. Its internal runtime remains `/teamup/app/`; frame navigation maps back to `/makerspace/teamup/...`, including localized and deep links. Only published TeamUp metadata enables this trusted bridge. Ordinary creator frames keep the opaque sandbox contract. Copy-link always produces the fixed school URL. No database rows, external runtime code, Nginx or resource limits change for this URL unification.
