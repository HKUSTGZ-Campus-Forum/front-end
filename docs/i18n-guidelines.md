# Internationalization reference

Chinese is the default unprefixed locale; English uses `/en`. Configuration is in [nuxt.config.ts](../nuxt.config.ts). Strings live in [zh.json](../i18n/locales/zh.json) and [en.json](../i18n/locales/en.json).

Add semantic keys in both files for every new visible UI string, including empty/loading/error states, labels and accessibility text. Use `useI18n()` for messages and [useAppLocale](../composables/useAppLocale.ts) for route generation. Preserve route query and return context where the feature requires it. User content is not a translation key.

Run `npm run i18n:check`, which invokes [key checking](../scripts/check-i18n-keys.mjs) and [hardcoded scanning](../scripts/scan-hardcoded-i18n.mjs). Review the [allowlist](../scripts/i18n-scan-allowlist.json) before adding a justified exception; do not use it to suppress ordinary untranslated strings.

Check both language layouts at narrow and wide widths. Dates, semester labels and fallback text should use the existing composables/utilities. See [UI conventions](features/ui.md) and [testing](testing.md).
