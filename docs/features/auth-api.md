# Frontend authentication and API

## API helper

[useApi](../../composables/useApi.ts) is the default entry point: `fetchWithAuth` supplies JWT and retries on 401 after refresh; `fetchPublic` is for genuinely public endpoints. Select based on the actual backend contract, not merely GET versus POST. Create the composable at setup scope and reuse it in handlers. Check HTTP status before interpreting the returned `Response`; helper success does not imply application success.

[apiBaseUrl](../../utils/apiBaseUrl.ts) chooses public config in the browser and internal config first during SSR. Relative browser calls normally use same-origin `/api`; configured different origins and development localhost have explicit handling in `useApi`. Avoid adding another URL/prefix wrapper.

[Nuxt development proxy](../../nuxt.config.ts) sends `/api` to the configured base plus `/api`. Backend `run.py` strips that prefix locally; school Nginx strips it before Flask. Server-side production requests use the documented internal bridge. Changing one side requires checking all three: caller, proxy and registered Flask path.

Exceptions to the helper are established auth internals (to avoid recursion), signed direct OSS uploads, and independent runtime health requests such as TeamUp and the frontend's same-origin `/health` automatic-version check. They do not authorize arbitrary direct calls to protected backend endpoints.

## Login, restoration and onboarding

[useAuth](../../composables/useAuth.ts), [OIDC helpers](../../utils/oidc.ts), [login page](../../pages/login/index.vue), [onboarding guard](../../middleware/onboarding.global.ts) and [onboarding page](../../pages/onboarding.vue) form the flow.

School OIDC is the only login method. The backend callback provides a one-time ticket; the browser exchanges it for UniKorn access/refresh tokens. Do not put provider tokens in URLs or recreate password/registration forms. Legacy password URLs redirect to login.

Restore authentication before loading user-owned carts or applying auth-dependent navigation. New SSO users confirm their public username and optionally avatar according to server `onboarding_required`; local storage is not the authority for completion. Preserve safe locale-aware return destinations and access to rules/privacy while onboarding.

Logout first attempts bounded current-device push revocation (browser unsubscribe plus authenticated server removal, with no recursive token refresh), closes delivered notifications and clears the badge. Other device subscriptions remain active. It then revokes/clears the UniKorn session and returns to the localized site home. Current frontend behavior does not navigate to the school's end-session URL; a subsequent SSO attempt may reuse the school session. Keep this distinction when explaining account state.

## Public identity and settings

[UserAvatar](../../components/user/UserAvatar.vue) and [useUser](../../composables/useUser.ts) handle current same-origin avatar delivery and refresh of legacy cached values. Expiring OSS URLs are not durable profile identity. [AccountSettings](../../components/setting/AccountSettings.vue) and identity settings handle profile/contact/badge concerns, distinct from school identity ownership.

Verify [OIDC](../../tests/oidc.test.ts), [onboarding](../../tests/onboarding.test.ts), [API base](../../tests/api-base-url.test.ts), and [scheduler auth readiness](../../tests/scheduler/auth-readiness.test.ts). Real callback/refresh/logout verification requires a configured environment. Update the backend SSO/API documentation alongside any changed wire contract.
