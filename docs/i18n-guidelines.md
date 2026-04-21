# UniKorn i18n Guidelines

## Rules
- Write each page once.
- Put all UI strings in locale dictionaries.
- Keep user-generated content in its original language.
- Prefer semantic keys such as `auth.login.title`, not whole sentences as keys.
- Preserve locale in links, redirects, and route guards.

## Key Naming
- `common.*` for shared UI and meta text
- `nav.*` for global navigation
- `actions.*` for buttons and generic verbs
- `auth.*` for login/register/forgot-password
- `courses.*` for course-specific UI
- `search.*` for search UI
- `footer.*` for footer content
- `errors.*` for reusable error messages

## New Page Checklist
1. Add or reuse semantic translation keys in both `zh.json` and `en.json`.
2. Use `useAppLocale()` for locale-aware links and redirects.
3. Use `useDateFormat()` for visible dates/times.
4. Do not hardcode `/login`, `/register`, `/forum`, `/courses`; generate locale-aware paths.
5. If backend display labels depend on locale, pass `lang`.
6. Run `npm run i18n:check` before merging.

## Transitional Policy
- Existing untranslated areas may stay on the scanner allowlist temporarily.
- Newly touched files should be removed from the allowlist.
- Tighten the allowlist as phases are completed.
