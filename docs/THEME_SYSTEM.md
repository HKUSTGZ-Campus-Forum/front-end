# Theme reference

Current themes are `keguang-blue` (light) and `deep-dark` (dark). Both share layout and component structure. Use CSS custom properties in feature styles.

Start with [UI conventions](features/ui.md). Sources: [definitions](../utils/themes.ts), [types](../types/theme.ts), [store](../store/themeStore.ts), [composable](../composables/useTheme.ts), [plugin](../plugins/theme.client.ts), [SCSS variables](../assets/css/variables.scss), and [before-paint setup](../app.vue).

Add or change semantic tokens at their source and propagate them through the existing theme application path. Verify both themes with [theme tests](../tests/theme/themes.test.ts) and affected browser views. Do not copy static color palettes into every component or restore the historical single-theme assumption.
