# Frontend source map

Source baseline `2c886f8`, reconciled 2026-09-05. Use [the task index](README.md) first. [Page inventory](routes.md) lists every page file; middleware and runtime flags determine actual reachability.

## Feature entry points

| Feature | Pages / components | State / pure logic | Tests |
|---|---|---|---|
| Home/community navigation | [home](../pages/index.vue), [home shell](../components/home), [community panes](../components/community) | [community section](../composables/useCommunitySection.ts), [carousel](../utils/homeCarousel.ts) | [home](../tests/home), [carousel](../tests/home-carousel.test.ts), [navigation](../tests/navigation) |
| Course overview/exploration/reviews | [courses](../pages/courses), [course components](../components/courses) | [overview](../composables/useCourseOverview.ts), [offering](../utils/courseOffering.ts), [detail](../utils/courseOverviewDetail.ts) | [courses](../tests/courses) |
| Course graph | [universe](../components/courses/universe) | [adapter](../utils/courseUniverse.ts) | [graph](../tests/course-universe) |
| Planner/cart/ranked/saved/calendar | [planner](../pages/courses/planner), [scheduler components](../components/scheduler) | [API](../composables/useScheduler.ts), [cart](../composables/useSchedulerCart.ts), [solver](../utils/scheduler.ts), [optimizer](../utils/schedulerOptimizer.ts), [plans](../utils/schedulerPlans.ts), [calendar](../utils/schedulerCalendar.ts) | [scheduler](../tests/scheduler) |
| Academic map | [academic components](../components/academic-map), [academic map](../pages/courses/academic-map.vue) | [API](../composables/useAcademicMap.ts), [import](../utils/academicMapManualImport.ts), [major constants](../constants/academicMajors.ts) | [academic map](../tests/academic-map) |
| Forum/comments/reactions | [forum](../pages/forum), [forum components](../components/forum) | [post tags](../utils/postTags.ts), [file kinds](../utils/postFileKinds.ts), [reaction icons](../utils/reactionIcons.ts) | [forum](../tests/forum) |
| Upload/avatar/document preview | [FileUpload](../components/FileUpload.vue), [user components](../components/user), [forum viewers](../components/forum) | [upload](../composables/useFileUpload.ts), [compression](../utils/imageCompression.ts), preparation/progress/error helpers | [uploads](../tests/file-upload), [attachments](../tests/forum/postAttachments.integration.test.ts) |
| Search | [search](../pages/search), [dropdown](../components/ui/SearchDropdown.vue) | [API](../composables/useSearch.ts), [highlight](../utils/textHighlight.ts) | [search](../tests/search), [security](../tests/security) |
| Feedback | [feedback](../pages/feedback), [components](../components/feedback) | [user API](../composables/useFeedback.ts), [admin API](../composables/useFeedbackAdmin.ts), [types](../types/feedback.ts) | Backend transition/permission tests; targeted browser checks |
| Admin/carousel/identity | [admin](../pages/admin), [components](../components/admin), [identity](../components/identity) | [admin](../composables/useAdminConsole.ts), [carousel admin](../composables/useHomeCarouselAdmin.ts), [identity API](../composables/useIdentity.ts) | Carousel/navigation plus backend permission tests |
| SSO/profile/settings | [login](../pages/login/index.vue), [onboarding](../pages/onboarding.vue), [settings](../components/setting), [user pages](../pages/user) | [auth](../composables/useAuth.ts), [user](../composables/useUser.ts), [users](../composables/useUsers.ts), [OIDC](../utils/oidc.ts), [onboarding](../utils/onboarding.ts) | [OIDC](../tests/oidc.test.ts), [onboarding](../tests/onboarding.test.ts) |
| Notifications/PWA | [notifications](../pages/notifications.vue), [PWA components](../components/pwa) | [notifications](../composables/useNotifications.ts), [push](../composables/usePushNotifications.ts), [updates](../composables/useServiceWorkerUpdate.ts), [worker](../public/sw.js) | Browser permissions/update/delivery checks plus backend tests |
| Assistant | [chat](../components/assistant/AgentChat.client.vue) | [API](../composables/useAgentChat.ts), [settings](../utils/agentChat.ts) | [assistant](../tests/assistant) |
| Recruitment | [pages](../pages/recruitment) | [prompt helpers](../utils/recruitment.ts) | [recruitment](../tests/recruitment) |
| Mascot | [overlay](../components/mascot/Overlay.client.vue) | [Youyou](../utils/mascotYouyou.ts), [Live2D](../utils/mascotL2d.ts), [model selection](../utils/mascotModelUrl.ts), [rig math](../utils/mascot/rigMath.ts) | [mascot](../tests/mascot) |
| TeamUp / old matching | [TeamUp host](../components/teamup/TeamUpHostPage.vue), [old matching](../pages/matching) | [redirect](../middleware/legacy-matching-redirect.global.ts) | [TeamUp](../tests/teamup), [redirect](../tests/home/legacy-matching-redirect.test.ts) |
| Gugu, clubs, contests, help | [gugu](../pages/gugu), [club](../pages/club), [contest](../pages/contest), [help](../pages/help) | Page-local handlers and shared API/auth | Backend tests where present; targeted browser checks |

## Cross-cutting and supporting code

- [app.vue](../app.vue), [layouts](../layouts), [middleware](../middleware): shell, SSR/auth/admin/onboarding/redirect boundaries.
- [useApi](../composables/useApi.ts), [base selector](../utils/apiBaseUrl.ts): public/protected calls and browser/SSR base selection.
- [types](../types): feature contracts; scheduler DTOs also live with scheduler utilities.
- [store](../store), [theme definitions](../utils/themes.ts), [theme plugin](../plugins/theme.client.ts), [styles](../assets/css): shared UI state and theme tokens.
- [locale composable](../composables/useAppLocale.ts), [locales](../i18n/locales), [date formatting](../composables/useDateFormat.ts), [semester display](../composables/useSemesterDisplay.ts): bilingual copy, navigation and formatting.
- [common Markdown](../components/common), [markdown plugin](../plugins/markdown-security.ts), [icon plugin](../plugins/iconify-icon.client.ts), [UI primitives](../components/ui): reusable rendering/interaction.
- [server](../server): health/build identity and response cache headers; this is Nitro, not Flask business logic.
- [public](../public): PWA/static assets, versioned mascot assets and attribution, recruitment artwork; no external runtime source.
- [config](../config), [internal Nuxt paths](../internal/nuxt-paths.mjs), [tsconfig](../tsconfig.json): framework/site configuration and existing module resolution support.
- [scripts](../scripts): i18n validation; [package.json](../package.json) owns command names; [version.ts](../version.ts) and [changelog](../CHANGELOG.md) serve version/history needs.
- [deploy](../deploy/README.md), [workflows](../.github/workflows), [Dockerfile](../Dockerfile): development/legacy atomic releases, CI and container; school releases are backend-owned.

Remaining `pages/test-*` are development surfaces, not evidence of complete production acceptance. Legacy `/schedule` and matching files need their redirect behavior checked before edits. Existing `components/matching/` and backend matching services should not be mistaken for TeamUp's independently served application.

## MakerSpace

The `/makerspace` catalog replaces the TeamUp sidebar entry. Read [the feature contract](features/makerspace.md) for the creator, review and isolated runtime flows; the existing `/teamup/` service remains an approved external entry.
