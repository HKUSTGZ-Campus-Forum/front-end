import { defineStore } from 'pinia'
import type { ThemeState, ThemeConfig } from '~/types/theme'
import { themes, getThemeById, generateCSSVariables } from '~/utils/themes'

// localStorage key matches the Pinia store id so the FOUC script in app.vue
// and this store's manual persistence read/write the same value.
const THEME_STORAGE_KEY = 'theme';

function readStoredThemeId(): string | null {
  if (!process.client) return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.currentTheme;
    return typeof id === 'string' && getThemeById(id) ? id : null;
  } catch {
    return null;
  }
}

function persistThemeId(themeId: string) {
  if (!process.client) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ currentTheme: themeId }));
  } catch {
    /* ignore storage errors (private mode / quota) */
  }
}

export const useThemeStore = defineStore('theme', {
  // Always start on the default light theme. On SSR pages the server can't see
  // localStorage, so the client must render the SAME initial state during
  // hydration to avoid a Vue hydration mismatch; the persisted theme is
  // restored after `app:mounted` by the theme.client plugin. (readStoredThemeId
  // is still used by initializeTheme for that post-hydration restore.)
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
      // Persist synchronously. The persistedstate plugin is intentionally NOT
      // used for this store (see the `persist: false` below), so this manual
      // write is what the FOUC script / initializeTheme read on the next load.
      persistThemeId(themeId);
    },

    applyTheme(theme: ThemeConfig) {
      if (!process.client) return;

      const variables = generateCSSVariables(theme);
      const documentElement = document.documentElement;

      // Apply all CSS variables
      Object.entries(variables).forEach(([property, value]) => {
        documentElement.style.setProperty(property, value);
      });

      // Sync native color-scheme so scrollbars/form controls follow the theme
      documentElement.style.colorScheme = theme.category;

      // Sync data-theme attribute (used by SCSS fallback for FOUC prevention)
      documentElement.dataset.theme = theme.id;

      // Update body class for theme-specific styling
      document.body.className = document.body.className
        .replace(/\btheme-\w+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      document.body.classList.add(`theme-${theme.id}`);
    },

    initializeTheme() {
      if (!process.client) return;

      // Restore the persisted theme from localStorage (the single source of
      // truth, written by setTheme()). Runs after hydration via the
      // theme.client plugin so the store agrees with the data-theme attribute
      // the FOUC script applied before first paint.
      const storedId = readStoredThemeId();
      if (storedId) {
        this.currentTheme = storedId;
      }

      // Fallback to keguang-blue if stored theme no longer exists
      if (!getThemeById(this.currentTheme)) {
        this.currentTheme = 'keguang-blue';
      }

      if (this.activeTheme) {
        this.applyTheme(this.activeTheme);
      }
    }
  },

  // Do NOT let the persistedstate plugin hydrate this store at creation time.
  // The server renders with the default (light) theme (it has no localStorage),
  // so if the client store was hydrated to the persisted (dark) theme before
  // the first render, SSR/client markup would diverge and Vue's hydration
  // mismatch is check-only in production - leaving theme-dependent UI (the
  // topbar toggle) stuck on the server-rendered state. Instead the store keeps
  // the SSR value during hydration and the theme.client plugin restores the
  // persisted theme after `app:mounted` via initializeTheme(). Persistence is
  // handled manually in setTheme()/initializeTheme() (localStorage 'theme').
  persist: false
})
