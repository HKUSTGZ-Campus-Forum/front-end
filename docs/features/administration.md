# Administration and contests

[Admin layout](../../layouts/admin.vue), [admin middleware](../../middleware/admin.ts), [admin pages](../../pages/admin) and [useAdminConsole](../../composables/useAdminConsole.ts) provide overview, users, content, audit, domains, identity, feedback and carousel interfaces. Admin routes disable SSR in Nuxt configuration. Route guards control navigation; backend permissions remain authoritative for every action.

[Admin components](../../components/admin) share headers, metric/trend cards, charts, action/state blocks and filters. Follow these patterns for loading/empty/error feedback and avoid introducing a separate style system.

[useFeedbackAdmin](../../composables/useFeedbackAdmin.ts) represents feedback/merge review, commenting controls and moderation. Do not conflate author approval with admin publication. [useIdentity](../../composables/useIdentity.ts) represents badge requests and review rather than school SSO identity. [Carousel administration](../../composables/useHomeCarouselAdmin.ts) handles localized slides, ordering and archive/restore; public display is [CarouselBanner](../../components/home/CarouselBanner.vue).

[Contest pages](../../pages/contest) expose participant and manager workflows. Manager/organizer rules and track/submission validation live on the backend; a generic admin role should not be assumed equivalent. [Recruitment admin](../../pages/recruitment/admin.vue) uses its own verified-email allowlist rather than the generic admin permission model.

Verification combines [carousel tests](../../tests/home-carousel.test.ts), [recruitment admin tests](../../tests/recruitment/admin-dashboard.test.ts), relevant navigation tests and backend permission/state tests. The frontend does not have dedicated end-to-end coverage for every admin/contest screen. For changed actions verify allowed and denied users, confirmation/error states and the actual backend result; never claim UI hiding proves authorization.

Update this guide and the backend administration reference when actions, permissions, state transitions or carousel contracts change.
