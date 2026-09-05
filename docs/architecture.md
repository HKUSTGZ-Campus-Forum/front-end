# Frontend architecture

Source baseline: `2c886f8`, reconciled 2026-09-05. [Source map](source-map.md) gives the implementation entry points; [history](history.md) preserves the original ADRs and design plans.

## Rendering and state

[app.vue](../app.vue) owns global UI mounts and theme-before-paint setup. [Nuxt config](../nuxt.config.ts) defines modules, locale routing, SSR exceptions, API proxies, runtime flags and build identity. The main shell is [keguang](../layouts/keguang.vue); admin and authentication have dedicated layouts. Auto-imported component names include their directories.

Pages → components/composables → pure `utils/` transforms and API calls. Shared DTOs live in `types/`; Pinia state is in `store/`. Not all state is Pinia: auth and scheduler use their own shared refs/composables and browser persistence. Preserve established lifecycle and account/semester boundaries when changing state.

Browser-dependent code belongs behind client lifecycle or `.client.vue` boundaries. Admin route rules disable SSR. HTML and search previews use [MarkdownContent](../components/common/MarkdownContent.vue), [markdown security plugin](../plugins/markdown-security.ts), [SafeHighlight](../components/common/SafeHighlight.vue) and text helpers; do not introduce unescaped UGC rendering.

## API and identity

[useApi](../composables/useApi.ts) handles URL selection and authenticated retry after JWT refresh. Browser same-origin `/api` traffic and server-side internal-base calls are distinct. [useAuth](../composables/useAuth.ts) owns restored login state, SSO ticket exchange and logout; onboarding is server-owned state enforced by middleware. See [auth/API](features/auth-api.md).

## Feature boundaries and decisions

| Surface | Current architecture |
|---|---|
| Course discovery/reviews | Canonical course overview with semester offerings; reviews aggregate by course while retaining each review's offering context |
| Course graph | Pure graph adapter in `utils/courseUniverse.ts`, interactive Vue/SVG components, shared backend catalog-rule source |
| Planner | Guest-local or authenticated cart, pure constraint solver/ranked optimizer, saved plan snapshots and one-time calendar export |
| Academic map | Backend-evaluated curriculum/record state with typed frontend import and progress views |
| Forum/files | Authenticated mutation and verified OSS uploads; same-origin avatars and browser document viewers |
| Feedback/admin | Frontend action/state views; backend remains the authority for permissions and transitions |
| Assistant/recruitment | Separate clients and provider/attempt semantics; no arbitrary operations agent in this UI |
| Mascot | Optional client overlay; default Youyou model uses the custom rig renderer, explicit Live2D alternatives remain supported |
| TeamUp | Native UniKorn shell hosting the independent `/teamup/app/` runtime through an iframe and validated messages |
| MeetCampus | Verified-account navigation bridge to an independent runtime; no world implementation here |

See the feature guides from [docs/README.md](README.md) for invariants, source paths and tests. Existing matching page files are redirected by global middleware; their presence does not make them current navigation. Independent CoursePlan remains a separate service, despite the UniKorn planner sharing its migration history.

## UI and release contracts

Both `keguang-blue` and `deep-dark` use the same layout and CSS variable system. Chinese is unprefixed, English uses `/en`; use existing locale-aware navigation. PWA caches/version checks interact with release identity and authenticated data; the service worker is not a blanket offline copy of the site.

`main` deploys shared dev through the frontend's atomic release workflow. School production uses the backend's paired revision/controller pipeline. Historical standalone frontend production instructions do not authorize school releases.

For architecture changes, update this current view and the relevant feature reference in the same change. Add a dated decision with rationale/alternatives when necessary; keep new proposed plans explicitly labeled until verified against implementation.
