# Home Carousel Administration Design

## Goal

Move the home-page carousel from a hard-coded frontend array to an
administrator-managed, bilingual content surface without changing the existing
home-page visual language.

## User flows

- Visitors see only active slides targeted to the current locale, ordered by an
  administrator-defined position.
- If the public API is unavailable, the home page falls back to the existing
  bundled scheduler and locale-matching welcome slides.
- Administrators can create, edit, activate, deactivate, reorder, archive, and
  restore slides from `/admin/carousel`.
- A slide contains an image, a locale target (`zh`, `en`, or both), localized
  accessible alt text, and an optional internal or HTTPS destination.
- Uploaded carousel images use the existing verified OSS upload flow and are
  served through a stable same-origin URL.

## Information architecture

The admin shell gains a dedicated “Home carousel” destination. Existing
“Content” is moderation for user-generated posts, comments, gugu messages, and
files, so carousel operations remain a separate site-content workflow.

The page uses an inline editor rather than a modal. The slide list remains
visible while editing, supports keyboard-operable move up/down actions, and
shows locale, publication state, destination, and image preview.

## Backend design

`home_carousel_slides` stores:

- locale target (`zh`, `en`, `all`)
- an uploaded `files` reference or a bundled static image path
- Chinese and English alt text
- optional destination URL
- presentation variant for the existing localized scheduler poster
- active, archived, and order state
- creator/updater/deleter attribution and timestamps

Public reads use `GET /api/home/carousel?locale=zh|en`. Admin CRUD, reorder,
archive, and restore routes live under `/api/admin/carousel` and use the shared
admin guard and audit log.

Only administrators may request a `carousel_image` upload. Public carousel
files are exposed through the existing same-origin file proxy only while linked
to a non-archived slide.

## Initial data

The migration inserts the three current slides:

1. localized scheduler poster, visible in both languages
2. Chinese welcome banner, visible only in Chinese
3. English welcome banner, visible only in English

The migration does not copy runtime or test content and does not overwrite any
existing row.

## Failure and empty states

- Public API failure falls back to bundled slides with correct locale filtering.
- An intentionally empty published carousel renders no broken controls.
- Admin loading, empty, validation, upload, save, and API error states are
  explicit and preserve unsaved form input.
- Archived slides remain recoverable.

## Security

- Admin mutations require the existing `admin` role on the backend.
- Destination URLs accept same-origin paths or HTTPS URLs only.
- Carousel uploads accept raster image MIME types and reject SVG/script content.
- Public responses never expose OSS credentials or expiring signed URLs.
- Every mutation writes an admin audit record.

## Accessibility and responsive behavior

- Form controls have visible labels and associated help/error text.
- Reordering and state changes are keyboard accessible.
- Controls keep a minimum 44 px touch target on narrow screens.
- The admin editor collapses to a single column on phones.
- Carousel motion honors `prefers-reduced-motion`.
- Chinese and English copy are supplied through Vue I18n.

## Verification

- Backend model, validation, permissions, public filtering, CRUD, audit, file
  delivery, and migration tests.
- Frontend mapping/fallback tests, i18n checks, full test suite, and production
  build.
- Local Chinese/English, light/dark, desktop/mobile browser checks.
- Shared dev end-to-end verification before production release.
