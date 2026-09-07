# Community, files, search and PWA

## Forum and feedback

[Forum pages](../../pages/forum) and [components](../../components/forum) render posts/comments/reactions and compose content. [Post tag helpers](../../utils/postTags.ts) preserve structured course review tags and payload mapping. [Community panes](../../components/community) connect forum/feedback/activity navigation. The backend enforces read visibility and mutation ownership.

[Feedback pages](../../pages/feedback), [useFeedback](../../composables/useFeedback.ts) and [feedback types](../../types/feedback.ts) expose publication, version/comment and merge-request workflows. Keep author decisions distinct from final admin review. [NotificationBell](../../components/ui/NotificationBell.vue), [notification composable](../../composables/useNotifications.ts) and [notification page](../../pages/notifications.vue) handle recipient state and navigation.

[SearchDropdown](../../components/ui/SearchDropdown.vue), [useSearch](../../composables/useSearch.ts) and [SafeHighlight](../../components/common/SafeHighlight.vue) render search results/previews. Untrusted content must pass the established Markdown/highlight protections; never use raw result HTML as trusted UI.

## Uploads and document viewers

[useFileUpload](../../composables/useFileUpload.ts) tracks preparation → signing → byte upload → server verification → completion. It uses authenticated backend signing/completion and a signed OSS XHR upload. Image preparation is bounded and can fall back to the original when compression fails/times out; final size checks still apply. The UI must not show complete when only byte transfer has finished.

[FileUpload](../../components/FileUpload.vue), [image compression](../../utils/imageCompression.ts), [preparation](../../utils/uploadPreparation.ts), [progress](../../utils/uploadProgress.ts) and [error mapping](../../utils/fileUploadError.ts) share this contract. PDFs/DOCX/office previews live under `components/forum/` and depend on browser workers/renderers and backend file delivery. Preserve client boundaries and URL lifetimes. See [image reference](../IMAGE_COMPRESSION.md).

Avatars use backend same-origin delivery and user lookup refresh. Old docs describing permanent OSS URLs or universal polling are historical; the current uploader calls `/api/files/<id>/complete`.

## PWA and push

[Service worker](../../public/sw.js), [PWA plugin](../../plugins/pwa.client.ts) and [update controller](../../utils/frontendUpdate.ts) apply frontend updates automatically; there is no new-version confirmation/dismiss toast. Production pages check the same-origin frontend `/health` at startup, every minute while visible/online, and on focus, visibility, online, page completion and BFCache restoration (events are throttled to 15 seconds). Requests bypass HTTP cache and time out after eight seconds. The endpoint must identify `campus-forum-frontend` and expose the actual deployed build; invalid/offline/error responses do nothing. This is automatic polling, not server-initiated Web Push.

The worker is registered at the stable `/sw.js` URL with `updateViaCache: "none"`. [Nuxt's build hook](../../nuxt.config.ts) and [build helper](../../utils/serviceWorkerBuild.ts) embed the build version into the output copy, so business-code-only releases also change worker bytes. Legacy `?v=` does not control cache identity. A successfully precached worker activates automatically; worker activation alone does **not** force a page refresh in the new plugin. Navigations and `/_nuxt/` bundles are not worker-cached, permitting a page to finish editing with its existing JS. Only this application's obsolete cache names are deleted; login storage, saved/ranked plan storage and push subscriptions are not cleared.

Page reloads require a different healthy server build and a safe foreground state. Edited input/change/drop/submit controls remain protected until removed from the DOM; focused editors, nonempty text editors, `aria-busy="true"`, and elements with `data-auto-update-blocked` also defer navigation. The planner workspace (including in-memory guest selections/results) and independent TeamUp iframe defer while mounted. Uploads hold an activity guard through compression, signing, byte transfer and verification, even if the initiating component closes. The global assistant explicitly protects hidden drafts/sending/settings edits. This is conservative safe-time deferral, not universal draft persistence: new in-memory workflows should expose `data-auto-update-blocked` or use `beginFrontendUpdateActivity()` with an idempotent `finally` release.

Each target build is attempted at most once per tab session, recorded before navigation in a dedicated sessionStorage key. Repeated stale HTML/mixed deployment responses cannot create a refresh loop. If sessionStorage is unavailable/corrupt or its 100-version safety cap is reached, auto-reload fails closed and normal navigation can still load the release. Same-build first installs do not reload. Nuxt development/HMR skips this production updater.

The persistent global search is explicitly marked `data-auto-update-disposable`: it is protected while focused, but its query is not treated as an unsaved draft forever after using search. Do not put this marker on user-authored content fields.

Rollout limitation: pages already running the retired plugin still have its unconditional `controllerchange` handler. Their first migration can refresh once without the new editing guards; those guards apply after the new client loads. Serve matching HTML, `/health`, and stamped `/sw.js` from the same immutable release, preserving no-store health and revalidated worker headers. Do not promise a zero-interruption first migration for already-open legacy editors.

Navigations use network with offline fallback; only selected public GET APIs/assets are cache candidates. Authorization and private/no-store responses must not become shared offline data. Range requests and non-GET requests bypass fetch interception.

[Push composable](../../composables/usePushNotifications.ts) registers subscriptions; the service worker displays notifications, handles click navigation and updates badges when supported. Browser permissions, VAPID configuration and actual delivery need environment testing. Installing the PWA does not imply every page or private conversation works offline.

## Verification

Use [PWA tests](../../tests/pwa), [health tests](../../tests/server/health.test.ts), [forum tests](../../tests/forum), [upload tests](../../tests/file-upload), [search tests](../../tests/search), and [XSS rendering tests](../../tests/security/xssRendering.test.ts). Exercise relevant viewers with supported file types and narrow/wide screens. PWA acceptance: build with a unique `NUXT_PUBLIC_APP_BUILD_VERSION`, check the emitted worker and `/health` identity/cache headers, then keep an A-build page open while serving B at the same origin. Verify one automatic reload, no same-version/first-install reload, edited/planner/upload deferral, multiple tabs, offline recovery and back/forward restoration. Unit/VM tests do not prove real push delivery or school reverse-proxy behavior. Coordinate backend file/notification/feedback contract docs when behavior changes.

For a reproducible isolated browser check, run `node tests/pwa/manual-harness.mjs 4185`, open the printed loopback URL, and use its deploy/editor/stale-HTML controls. This harness bundles the exact plugin/utility and serves the actual worker with local fixtures; it does not exercise Nuxt authentication or a real backend. Close its tabs and stop the process after testing.
