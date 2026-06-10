# Admin System Phase 0 Record

Date: 2026-06-07

## Completed

- Audited the current frontend admin entry points.
- Confirmed the current admin UI only covers overview, feedback governance, and identity verification.
- Mapped whole-site modules that need admin coverage.
- Defined a phased frontend plan for a broad UniKorn operations console.

## Current Frontend Admin Files

- `layouts/admin.vue`
- `middleware/admin.ts`
- `pages/admin/index.vue`
- `pages/admin/feedback.vue`
- `pages/admin/identity-management.vue`
- `components/admin/*`
- `composables/useFeedbackAdmin.ts`
- `composables/useIdentity.ts`
- `i18n/locales/en.json`
- `i18n/locales/zh.json`

## Notes

- The existing admin shell is usable and visually aligned enough to extend.
- The navigation is too small for a full-site console and should become grouped module navigation.
- Overview counts currently fetch from separate feature endpoints; a single backend overview endpoint is needed.

