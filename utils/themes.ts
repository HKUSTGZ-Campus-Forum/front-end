import type { ThemeConfig } from '~/types/theme';

// Predefined theme configurations
export const themes: ThemeConfig[] = [
  // ── 科广蓝 ──────────────────────────────────────────────────
  {
    id: 'keguang-blue',
    name: '科广蓝',
    description: '科广汇定制主题，清爽蓝调配色与全新首页布局',
    category: 'light',

    background: {
      primary: '#d7edf9',
      secondary: '#f5fbfe',
      gradient: 'linear-gradient(160deg, #d7edf9 0%, #eaf4fd 100%)'
    },

    colors: {
      text: {
        primary: '#1a2a4a',
        secondary: '#4a6080',
        muted: '#b3b3b3',
        inverse: '#ffffff'
      },
      surface: {
        primary: '#ffffff',
        secondary: '#f5fbfe',
        elevated: '#ffffff',
        overlay: 'rgba(255, 255, 255, 0.96)'
      },
      interactive: {
        primary: '#26a4ff',
        secondary: '#bfd7fb',
        hover: '#1a8fe0',
        active: '#1278c4',
        disabled: '#b3d4f0'
      },
      semantic: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#26a4ff',
        purple: '#7c3aed'
      },
      border: {
        primary: '#bfd7fb',
        secondary: '#daeef9',
        focus: '#26a4ff'
      }
    },

    components: {
      sidebar: {
        background: '#283965',
        backdrop: 'none',
        shadow: '2px 0 12px rgba(40, 57, 101, 0.18)'
      },
      topbar: {
        background: '#f5fbfd',
        backdrop: 'blur(8px)',
        shadow: '0 1px 4px rgba(40, 57, 101, 0.08)'
      },
      card: {
        background: '#ffffff',
        shadow: '0 2px 8px rgba(38, 164, 255, 0.08)',
        border: '1px solid #daeef9'
      },
      modal: {
        background: '#ffffff',
        backdrop: 'rgba(26, 42, 74, 0.45)',
        shadow: '0 20px 40px rgba(26, 42, 74, 0.15)'
      }
    },

    effects: {
      blur: 'blur(8px)',
      shadow: {
        small: '0 1px 3px rgba(38, 164, 255, 0.08)',
        medium: '0 4px 12px rgba(38, 164, 255, 0.12)',
        large: '0 10px 24px rgba(38, 164, 255, 0.16)'
      },
      opacity: {
        low: 0.6,
        medium: 0.85,
        high: 0.96
      }
    }
  },

  // ── 深邃黑 ──────────────────────────────────────────────────
  {
    id: 'deep-dark',
    name: '深邃黑',
    description: '科广汇定制深色主题，深蓝黑背景搭配科广蓝强调色',
    category: 'dark',

    background: {
      primary: '#0e1726',
      secondary: '#16233a',
      gradient: 'linear-gradient(160deg, #0e1726 0%, #16233a 100%)'
    },

    colors: {
      text: {
        primary: '#e6edf7',
        secondary: '#9fb0c9',
        muted: '#64748b',
        inverse: '#0e1726'
      },
      surface: {
        primary: '#16233a',
        secondary: '#1d2d49',
        elevated: '#223453',
        overlay: 'rgba(14, 23, 38, 0.96)'
      },
      interactive: {
        primary: '#26a4ff',
        secondary: '#2d4a73',
        hover: '#4db6ff',
        active: '#1a8fe0',
        disabled: '#33507a'
      },
      semantic: {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#26a4ff',
        purple: '#a78bfa'
      },
      border: {
        primary: '#2d4a73',
        secondary: '#24375a',
        focus: '#26a4ff'
      }
    },

    components: {
      sidebar: {
        background: '#0b1220',
        backdrop: 'none',
        shadow: '2px 0 12px rgba(0, 0, 0, 0.35)'
      },
      topbar: {
        background: 'rgba(22, 35, 58, 0.85)',
        backdrop: 'blur(8px)',
        shadow: '0 1px 4px rgba(0, 0, 0, 0.3)'
      },
      card: {
        background: '#16233a',
        shadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        border: '1px solid #24375a'
      },
      modal: {
        background: '#1d2d49',
        backdrop: 'rgba(0, 0, 0, 0.6)',
        shadow: '0 20px 40px rgba(0, 0, 0, 0.45)'
      }
    },

    effects: {
      blur: 'blur(8px)',
      shadow: {
        small: '0 1px 3px rgba(0, 0, 0, 0.3)',
        medium: '0 4px 12px rgba(0, 0, 0, 0.35)',
        large: '0 10px 24px rgba(0, 0, 0, 0.4)'
      },
      opacity: {
        low: 0.6,
        medium: 0.85,
        high: 0.96
      }
    }
  }
];

// Helper functions
export function getThemeById(id: string): ThemeConfig | undefined {
  return themes.find(theme => theme.id === id);
}

export function getThemesByCategory(category: 'light' | 'dark'): ThemeConfig[] {
  return themes.filter(theme => theme.category === category);
}

// Logo filter generation for theme adaptation
export function getLogoFilter(themeId: string): string {
  switch (themeId) {
    case 'keguang-blue':
    case 'deep-dark':
      // 科广蓝/深邃黑：侧边栏深色，图标调亮为白色
      return 'brightness(10) saturate(0)';

    default:
      return 'none';
  }
}

// CSS Variable generation
export function generateCSSVariables(theme: ThemeConfig): Record<string, string> {
  const variables: Record<string, string> = {};

  // Background variables
  variables['--bg-primary'] = theme.background.primary;
  if (theme.background.secondary) {
    variables['--bg-secondary'] = theme.background.secondary;
  }
  if (theme.background.gradient) {
    variables['--bg-gradient'] = theme.background.gradient;
  }
  if (theme.background.image) {
    variables['--bg-image'] = theme.background.image;
  }

  // Text color variables
  variables['--text-primary'] = theme.colors.text.primary;
  variables['--text-secondary'] = theme.colors.text.secondary;
  variables['--text-muted'] = theme.colors.text.muted;
  variables['--text-inverse'] = theme.colors.text.inverse;

  // Surface color variables
  variables['--surface-primary'] = theme.colors.surface.primary;
  variables['--surface-secondary'] = theme.colors.surface.secondary;
  variables['--surface-elevated'] = theme.colors.surface.elevated;
  variables['--surface-overlay'] = theme.colors.surface.overlay;

  // Interactive color variables
  variables['--interactive-primary'] = theme.colors.interactive.primary;
  variables['--interactive-secondary'] = theme.colors.interactive.secondary;
  variables['--interactive-hover'] = theme.colors.interactive.hover;
  variables['--interactive-active'] = theme.colors.interactive.active;
  variables['--interactive-disabled'] = theme.colors.interactive.disabled;

  // Semantic color variables
  variables['--semantic-success'] = theme.colors.semantic.success;
  variables['--semantic-warning'] = theme.colors.semantic.warning;
  variables['--semantic-error'] = theme.colors.semantic.error;
  variables['--semantic-info'] = theme.colors.semantic.info;
  if (theme.colors.semantic.purple) {
    variables['--semantic-purple'] = theme.colors.semantic.purple;
  }

  // Border color variables
  variables['--border-primary'] = theme.colors.border.primary;
  variables['--border-secondary'] = theme.colors.border.secondary;
  variables['--border-focus'] = theme.colors.border.focus;

  // Component-specific variables
  variables['--sidebar-bg'] = theme.components.sidebar.background;
  variables['--topbar-bg'] = theme.components.topbar.background;
  variables['--card-bg'] = theme.components.card.background;
  variables['--modal-bg'] = theme.components.modal.background;
  variables['--modal-backdrop'] = theme.components.modal.backdrop;

  if (theme.components.sidebar.backdrop) {
    variables['--sidebar-backdrop'] = theme.components.sidebar.backdrop;
  }
  if (theme.components.topbar.backdrop) {
    variables['--topbar-backdrop'] = theme.components.topbar.backdrop;
  }
  if (theme.components.sidebar.shadow) {
    variables['--sidebar-shadow'] = theme.components.sidebar.shadow;
  }
  if (theme.components.topbar.shadow) {
    variables['--topbar-shadow'] = theme.components.topbar.shadow;
  }
  if (theme.components.card.shadow) {
    variables['--card-shadow'] = theme.components.card.shadow;
  }
  if (theme.components.card.border) {
    variables['--card-border'] = theme.components.card.border;
  }
  if (theme.components.modal.shadow) {
    variables['--modal-shadow'] = theme.components.modal.shadow;
  }

  // Effect variables
  variables['--effect-blur'] = theme.effects.blur;
  variables['--shadow-small'] = theme.effects.shadow.small;
  variables['--shadow-medium'] = theme.effects.shadow.medium;
  variables['--shadow-large'] = theme.effects.shadow.large;
  variables['--opacity-low'] = theme.effects.opacity.low.toString();
  variables['--opacity-medium'] = theme.effects.opacity.medium.toString();
  variables['--opacity-high'] = theme.effects.opacity.high.toString();

  // Logo filter for theme adaptation
  variables['--logo-filter'] = getLogoFilter(theme.id);

  return variables;
}
