# UniKorn i18n Execution Plan

## Goals
- Turn the current half-integrated i18n setup into a stable, expandable multilingual framework.
- Keep Chinese URLs unchanged and expose English pages under `/en/...`.
- Maintain one set of pages/components/business logic and move text into language dictionaries.

## Non-Goals
- No runtime machine translation.
- No duplicated page trees such as `pages-en/`.
- No database schema expansion like `title_en/body_en`.

## Locked Decisions
- Default locale: `zh`
- English route strategy: `prefix_except_default`
- Translation source of truth: `front-end/i18n/locales/*.json`
- Language switching: URL-aware and persistent
- Backend participation: only where frontend cannot safely localize display text itself

## Phase Checklist

### Phase 0. Documentation and guardrails
- [x] Add this execution plan.
- [x] Add contributor-facing i18n guidelines.
- [x] Add translation key parity check.
- [x] Add hardcoded UI text scanner with transitional allowlist.

Acceptance:
- `npm run i18n:check` is available.
- New work has a written checklist and key naming rules.

Rollback:
- Remove the scripts and docs only; no runtime impact.

### Phase 1. Framework baseline
- [x] Normalize Nuxt i18n config and locale directory.
- [x] Switch routing to Chinese without prefix and English under `/en/...`.
- [x] Add shared locale/date/semester composables.
- [x] Add a reusable locale switch entry point.

Acceptance:
- `/` renders Chinese.
- `/en` renders English.
- Switching locale updates the URL and persists across refresh.

Rollback:
- Revert `nuxt.config.ts` and the shared composables.

### Phase 2. Shared shell migration
- [x] Localize auth layout header.
- [x] Localize top nav, side nav, footer, and shared search dropdown.
- [x] Route shared navigation through locale-aware links.

Acceptance:
- Shared shell renders without hardcoded Chinese on migrated components.
- English navigation stays inside `/en/...`.

Rollback:
- Revert the shared shell component patches.

### Phase 3. Core page batches

#### 3A. Auth and entry pages
- [x] Login page
- [x] Register page
- [x] Forgot password page
- [x] Registration form copy and validation copy

#### 3B. Courses
- [x] Course list page
- [x] Course redirect page
- [x] Course offering page
- [x] Course review page
- [x] Frontend `lang` propagation for course semester APIs

Acceptance:
- Migrated pages render in both locales.
- Login/register/forgot-password stay in the current locale.
- English course pages receive localized semester labels.

Rollback:
- Revert only the touched page files; framework remains intact.

### Phase 4. Backend support
- [x] Localize course filter and semester endpoints by `lang`.
- [ ] Review whether other high-frequency endpoints need stable error codes.

Acceptance:
- Course filter and semester payloads change labels based on `lang`.
- Existing Chinese clients remain compatible.

Rollback:
- Revert backend course route changes.

### Phase 5. Debt burn-down
- [ ] Migrate forum pages.
- [ ] Migrate search pages.
- [ ] Migrate matching pages.
- [ ] Migrate settings/admin pages.
- [ ] Tighten the allowlist as debt is removed.

## Verification
- Run `npm run i18n:check`.
- Build with `npm run build`.
- Manually test `/`, `/en`, `/login`, `/en/login`, `/courses`, `/en/courses`.

## Progress Log
- 2026-04-21: Added framework baseline, docs, scripts, locale switch, and first migrated page groups.
