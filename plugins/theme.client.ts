import { useThemeStore } from '~/store/themeStore';

export default defineNuxtPlugin(() => {
  const themeStore = useThemeStore();
  
  // Initialize theme system
  function initializeTheme() {
    // Try to migrate from legacy settings if needed
    themeStore.migrateFromLegacySettings();
    
    // Apply the current theme
    themeStore.initializeTheme();
  }
  
  // Ensure theme is applied after DOM is ready
  if (document.readyState !== 'loading') {
    initializeTheme();
  } else {
    document.addEventListener('DOMContentLoaded', initializeTheme);
  }
});