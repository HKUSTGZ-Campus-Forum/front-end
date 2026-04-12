import { defineStore } from 'pinia'
import type { ThemeState, ThemeConfig } from '~/types/theme'
import { themes, getThemeById, generateCSSVariables } from '~/utils/themes'

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    currentTheme: 'keguang-blue',
    availableThemes: themes
  }),

  getters: {
    activeTheme(): ThemeConfig | undefined {
      return getThemeById(this.currentTheme) || getThemeById('keguang-blue') || this.availableThemes[0];
    },

    isKeguangTheme(): boolean {
      return this.currentTheme === 'keguang-blue';
    },

    themeVariables(): Record<string, string> {
      if (this.activeTheme) {
        return generateCSSVariables(this.activeTheme);
      }
      return {};
    }
  },

  actions: {
    setTheme(themeId: string) {
      const theme = getThemeById(themeId);
      if (!theme) {
        console.warn(`Theme "${themeId}" not found`);
        return;
      }

      this.currentTheme = themeId;
      this.applyTheme(theme);
    },

    applyTheme(theme: ThemeConfig) {
      if (!process.client) return;

      const variables = generateCSSVariables(theme);
      const documentElement = document.documentElement;

      // Apply all CSS variables
      Object.entries(variables).forEach(([property, value]) => {
        documentElement.style.setProperty(property, value);
      });

      // Update body class for theme-specific styling
      document.body.className = document.body.className
        .replace(/theme-\w+/g, '')
        .trim();
      document.body.classList.add(`theme-${theme.id}`);
    },

    initializeTheme() {
      if (!process.client) return;

      // Fallback to keguang-blue if stored theme no longer exists
      if (!getThemeById(this.currentTheme)) {
        this.currentTheme = 'keguang-blue';
      }

      if (this.activeTheme) {
        this.applyTheme(this.activeTheme);
      }
    }
  },

  persist: process.client ? {
    storage: localStorage,
    paths: ['currentTheme']
  } : false
})
