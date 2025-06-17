import { defineStore } from 'pinia'
import type { ThemeState, ThemeConfig } from '~/types/theme'
import { themes, getThemeById, generateCSSVariables } from '~/utils/themes'

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    currentTheme: 'light',
    availableThemes: themes,
    // Legacy compatibility
    backgroundColor: '#97d4f3',
    backgroundImage: null,
    backgroundOpacity: 0.7,
    customTheme: undefined
  }),
  
  getters: {
    activeTheme(): ThemeConfig | undefined {
      return getThemeById(this.currentTheme) || this.availableThemes[0];
    },
    
    isLegacyTheme(): boolean {
      return this.currentTheme === 'legacy' || !getThemeById(this.currentTheme);
    },
    
    themeVariables(): Record<string, string> {
      if (this.activeTheme) {
        return generateCSSVariables(this.activeTheme);
      }
      
      // Legacy fallback
      return {
        '--background-color': this.backgroundColor,
        '--background-image': this.backgroundImage ? `url(${this.backgroundImage})` : 'none',
        '--background-opacity': this.backgroundOpacity.toString()
      };
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
    
    // Legacy methods for backward compatibility
    setBackgroundColor(color: string) {
      this.backgroundColor = color;
      if (this.currentTheme === 'legacy' && process.client) {
        document.documentElement.style.setProperty('--background-color', color);
      }
    },
    
    setBackgroundImage(imageUrl: string | null) {
      this.backgroundImage = imageUrl;
      if (this.currentTheme === 'legacy' && process.client) {
        if (imageUrl) {
          document.documentElement.style.setProperty(
            '--background-image', 
            `url(${imageUrl})`
          );
        } else {
          document.documentElement.style.setProperty('--background-image', 'none');
        }
      }
    },
    
    setBackgroundOpacity(opacity: number) {
      this.backgroundOpacity = opacity;
      if (this.currentTheme === 'legacy' && process.client) {
        document.documentElement.style.setProperty('--background-opacity', opacity.toString());
      }
    },
    
    // Initialize theme on app start
    initializeTheme() {
      if (!process.client) return;
      
      if (this.activeTheme) {
        this.applyTheme(this.activeTheme);
      } else {
        // Apply legacy theme if no modern theme is set
        this.setBackgroundColor(this.backgroundColor);
        this.setBackgroundImage(this.backgroundImage);
        this.setBackgroundOpacity(this.backgroundOpacity);
      }
    },
    
    // Migration helper
    migrateFromLegacySettings() {
      if (this.currentTheme === 'legacy' || !getThemeById(this.currentTheme)) {
        // Try to find a matching theme based on legacy settings
        if (this.backgroundColor === '#0f172a' || this.backgroundColor.includes('1e293b')) {
          this.setTheme('dark');
        } else if (this.backgroundColor.includes('#fef7ed') || this.backgroundColor.includes('fed7aa')) {
          this.setTheme('cafe');
        } else if (this.backgroundColor.includes('#f0f9ff') || this.backgroundColor.includes('0ea5e9')) {
          this.setTheme('ocean');
        } else {
          this.setTheme('light');
        }
      }
    }
  },
  
  persist: process.client ? {
    storage: localStorage,
    paths: ['currentTheme', 'backgroundColor', 'backgroundImage', 'backgroundOpacity', 'customTheme']
  } : false
})