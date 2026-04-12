import { useThemeStore } from '~/store/themeStore';

export default defineNuxtPlugin(() => {
  const themeStore = useThemeStore();

  function initializeTheme() {
    themeStore.initializeTheme();
  }

  if (document.readyState !== 'loading') {
    initializeTheme();
  } else {
    document.addEventListener('DOMContentLoaded', initializeTheme);
  }
});
