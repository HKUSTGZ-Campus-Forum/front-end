import { useThemeStore } from '~/store/themeStore';

export default defineNuxtPlugin((nuxtApp) => {
  const themeStore = useThemeStore();

  // Restore the persisted theme AFTER the component tree has hydrated. The
  // server always renders with the default (light) theme because it has no
  // access to localStorage, so the client store must also be light during the
  // initial render/hydration pass. Applying the stored theme earlier (e.g. on
  // app:mounted) would still race the async layout hydration and produce a Vue
  // "hydration class mismatch" on theme-dependent markup (the topbar dark
  // toggle), which production does NOT rectify (check-only) - leaving the
  // toggle permanently out of sync with the actual theme.
  // app:suspense:resolve fires after the async layout/page have rendered, so
  // flipping the store here triggers a clean reactive re-render. The visual
  // theme is already applied before first paint by the FOUC script in app.vue
  // (data-theme on <html> consumed by assets/css/variables.scss), so deferring
  // this store update does not flash the wrong background.
  nuxtApp.hook('app:suspense:resolve', () => {
    themeStore.initializeTheme();
  });
});
