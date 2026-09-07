# iPhone Web Push

Status: implemented locally; integration/production and physical-device acceptance pending. Frontend baseline: 5db66a3; backend baseline: 3e804da.

## Behavior and boundaries

Use the existing notification table, Web Push service and worker. Add a persistent authenticated bell linking to the bilingual notification center. The center provides iPhone Home Screen instructions, explicit permission/subscribe, current-device status, retry, disable and test delivery. Never request permission on mount. iOS 16.4+ requires a Home Screen web app and a direct user gesture.

Subscription keys use Base64URL. Enabled means both browser and authenticated server agree. Browser/worker waits are bounded; a failed save can be retried without a false enabled state. Logout removes the browser subscription before clearing identity. No schema, catalog, seed or bulk production data changes are needed.

Backend additions stay in the backend repository: current-device tests with ownership checks, bounded delivery, expired subscription cleanup, subscription account isolation, and removal of invisible badge-only pushes. Read operations update the local badge; background badges ride visible notifications. Notification clicks use safe local routes and preserve an unrelated open editor.

## Verification and rollout

Test mocked browser permissions, Base64URL encoding, denied/unsupported/install states, server save failure and repair, timeout, unsubscribe and logout; VM-test worker notification display, badges and navigation. Test backend current-device ownership, expired delivery and absence of silent pushes. Run i18n/full frontend tests/build and relevant backend suites. Inspect both languages, themes, and phone/desktop viewports using local Nuxt at port 3000 with the configured shared dev API. Stop dev server afterward.

Physical iPhone delivery needs a user-owned Home Screen install and permission grant. Automated browser tests cannot prove APNs delivery. Commit/push/integration and school production release remain subject to applicable user authorization and paired-SHA release gates. Update community/auth guides and changelogs with implementation.

## Local verification results

- Frontend: i18n keys/hardcoded scan, 575 tests, production build passed. Backend: 896 tests passed, 6 environment-dependent tests skipped; no production database was used.
- Added 23 browser-lifecycle/worker tests and 8 backend cases for device ownership, expired subscriptions, idempotent disable, configuration and silent-push removal.
- Inspected actual Nuxt pages in isolated Chromium with intercepted fixture APIs/browser push capabilities: Chinese iPhone installation, English subscribe/save-failure retry/test/disable, Chinese denied permissions in deep-dark, 320px English, and desktop English. No page errors, automatic permission prompts, document overflow or clipped topbar controls. Mark-all-read and unread empty state passed. This simulates UI behavior, not iOS/APNs transport.
- Replaced the brand wordmark with the existing favicon only below 360px to fit the added bell; hid the redundant floating install guide on notification routes after visual inspection found it obscured mobile actions.
- Shared dev `/api/healthz` and `/api/push/vapid-public-key` returned 200 in read-only checks. New backend behavior has unit/integration fixture coverage but has not yet been deployed to shared dev.
- Existing independent IPv4 dev server was preserved; this task used IPv6 loopback on the same port 3000 and shut down its server after verification.

## Physical iPhone acceptance after authorized release

1. On iOS 16.4+, open the school domain in Safari and add it to Home Screen as a web app. Launch its icon and sign in.
2. Open the bell and select Enable notifications, then Allow. Verify Enabled persists after reopening.
3. Select Send test notification and confirm it appears in Notification Center; repeat with the web app in the background/phone locked and a real authorized community interaction.
4. Tap a notification and verify its destination. Check unread badge updates, deny/re-enable via iOS Settings, and disable/re-enable this device.
5. Sign out and confirm this installation stops receiving that account's pushes without affecting another subscribed device.

No delivery guarantee is inferred from a provider-accepted response. The test button targets the current device; legacy no-endpoint API calls still target all of the user's devices.

## Production-compatible release lineage

School production was verified by its active release symlink and frontend health version as backend `5732d34c2b0dd0b6911b5d2123e535fffc70ee99` / frontend `ff65d6bc4a1921be39abc3b43245dfd916185184`. Publishing the latest main pair would also introduce unrelated agent-chat schema migrations. The notification-only candidates instead descend directly from the active production pair: backend `d3c4e5d8bb2c2442c93d27b5f47b239057cf3f4c` / frontend `4aa0b78317d4739940c0b837bffc3026d2b9c2ac`. They contain the notification changes only and no database or product-data changes. Both candidates are merged into main to satisfy release ancestry without removing newer main features. The production controller still validates the actual transition and requires `database_change.approved=false`.

The main implementation passed CI and deployed to shared dev. Public notification/push endpoints and unauthenticated write guards passed checks; dev reports OIDC disabled, so authenticated flows are covered by local isolated browser fixtures rather than a live dev SSO session. Physical iPhone receipt remains a user-device acceptance step.
