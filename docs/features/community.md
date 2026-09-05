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

[Service worker](../../public/sw.js), [PWA plugin](../../plugins/pwa.client.ts), [update composable](../../composables/useServiceWorkerUpdate.ts) and [update toast](../../components/pwa/AppUpdateToast.vue) coordinate cache versions and user-visible activation. Navigations use network with offline fallback; only selected public GET APIs/assets are cache candidates. Authorization and private/no-store responses must not become shared offline data. Range requests and non-GET requests bypass fetch interception.

[Push composable](../../composables/usePushNotifications.ts) registers subscriptions; the service worker displays notifications, handles click navigation and updates badges when supported. Browser permissions, VAPID configuration and actual delivery need environment testing. Installing the PWA does not imply every page or private conversation works offline.

## Verification

Use [forum tests](../../tests/forum), [upload tests](../../tests/file-upload), [search tests](../../tests/search), and [XSS rendering tests](../../tests/security/xssRendering.test.ts). Exercise relevant viewers with supported file types and narrow/wide screens. PWA changes require checking update/activation and account transitions in a browser; current source/unit tests do not prove push delivery. Coordinate backend file/notification/feedback contract docs when behavior changes.
