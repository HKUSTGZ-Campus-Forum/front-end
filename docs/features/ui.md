# UI, theme and localization conventions

[Product direction](../product.md) describes audience and design intent. Extend the established UniKorn shell and controls rather than introducing a separate component language for each feature.

## Theme and layout

Use CSS custom properties for new styles. [Theme definitions](../../utils/themes.ts), [theme types](../../types/theme.ts), [Pinia store](../../store/themeStore.ts), [useTheme](../../composables/useTheme.ts), [theme plugin](../../plugins/theme.client.ts) and [SCSS variables](../../assets/css/variables.scss) form the chain. Both `keguang-blue` and `deep-dark` are implemented; the older single-theme description is superseded. Changing theme changes colors, not layout structure.

Use `keguang`, `keguang-auth` or `admin` layouts as appropriate. Nuxt component auto-imports include directory prefixes: `components/home/KeguangPinned.vue` is `<HomeKeguangPinned>`. Preserve navigation, responsive folding and active-route behavior.

## Localization and accessibility

All new UI strings use semantic keys in [Chinese](../../i18n/locales/zh.json) and [English](../../i18n/locales/en.json). Use [useAppLocale](../../composables/useAppLocale.ts) for localized navigation; default Chinese routes are unprefixed and English routes use `/en`. Preserve user-generated text as supplied rather than translating or treating it as a locale key.

Run `npm run i18n:check`: it checks key consistency and scans hardcoded copy. The existing scanner allowlist is for reviewed exceptions, not a place to hide newly untranslated interfaces.

Use semantic labels, visible focus, keyboard-accessible controls, dialog focus/escape behavior, meaningful loading/error states and adequate touch targets. Avoid color-only status and respect reduced motion. Check real content in both languages, both themes and narrow/wide screens.

## Rendering

Use shared Markdown and highlight components for UGC. Browser-only charts/document/mascot rendering needs `.client.vue` or a client lifecycle boundary. Preserve SSR hydration: do not create setup composables inside click handlers or read `window` at server import time.

Tests include [themes](../../tests/theme/themes.test.ts), [navigation](../../tests/navigation), [home](../../tests/home), and [rendering safety](../../tests/security/xssRendering.test.ts). See [testing](../testing.md) for browser and full-gate expectations.
