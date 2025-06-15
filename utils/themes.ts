import type { ThemeConfig } from '~/types/theme';

// Predefined theme configurations
export const themes: ThemeConfig[] = [
  // Light Theme
  {
    id: 'light',
    name: '简洁白',
    description: '清新简洁的浅色主题，适合日常使用',
    category: 'light',
    
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      gradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)'
    },
    
    colors: {
      text: {
        primary: '#1e293b',
        secondary: '#475569',
        muted: '#94a3b8',
        inverse: '#ffffff'
      },
      
      surface: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        elevated: '#ffffff',
        overlay: 'rgba(255, 255, 255, 0.95)'
      },
      
      interactive: {
        primary: '#3b82f6',
        secondary: '#e2e8f0',
        hover: '#2563eb',
        active: '#1d4ed8',
        disabled: '#cbd5e1'
      },
      
      semantic: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      
      border: {
        primary: '#e2e8f0',
        secondary: '#f1f5f9',
        focus: '#3b82f6'
      }
    },
    
    components: {
      sidebar: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
      },
      
      topbar: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      },
      
      card: {
        background: '#ffffff',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      },
      
      modal: {
        background: '#ffffff',
        backdrop: 'rgba(0, 0, 0, 0.5)',
        shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }
    },
    
    effects: {
      blur: 'blur(12px)',
      shadow: {
        small: '0 1px 2px rgba(0, 0, 0, 0.05)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.07)',
        large: '0 10px 15px rgba(0, 0, 0, 0.1)'
      },
      opacity: {
        low: 0.6,
        medium: 0.8,
        high: 0.95
      }
    }
  },

  // Dark Theme
  {
    id: 'dark',
    name: '深夜黑',
    description: '优雅的深色主题，减少眼部疲劳',
    category: 'dark',
    
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    },
    
    colors: {
      text: {
        primary: '#f8fafc',
        secondary: '#cbd5e1',
        muted: '#64748b',
        inverse: '#0f172a'
      },
      
      surface: {
        primary: '#1e293b',
        secondary: '#334155',
        elevated: '#2d3748',
        overlay: 'rgba(30, 41, 59, 0.95)'
      },
      
      interactive: {
        primary: '#60a5fa',
        secondary: '#374151',
        hover: '#3b82f6',
        active: '#2563eb',
        disabled: '#4b5563'
      },
      
      semantic: {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa'
      },
      
      border: {
        primary: '#374151',
        secondary: '#4b5563',
        focus: '#60a5fa'
      }
    },
    
    components: {
      sidebar: {
        background: 'rgba(30, 41, 59, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
      },
      
      topbar: {
        background: 'rgba(30, 41, 59, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
      },
      
      card: {
        background: '#1e293b',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        border: '1px solid #374151'
      },
      
      modal: {
        background: '#1e293b',
        backdrop: 'rgba(0, 0, 0, 0.7)',
        shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }
    },
    
    effects: {
      blur: 'blur(12px)',
      shadow: {
        small: '0 1px 2px rgba(0, 0, 0, 0.2)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.3)',
        large: '0 10px 15px rgba(0, 0, 0, 0.4)'
      },
      opacity: {
        low: 0.6,
        medium: 0.8,
        high: 0.95
      }
    }
  },

  // Cafe Theme
  {
    id: 'cafe',
    name: '温暖咖啡',
    description: '温馨的咖啡色调，营造舒适氛围',
    category: 'colored',
    
    background: {
      primary: '#fef7ed',
      secondary: '#fed7aa',
      gradient: 'linear-gradient(135deg, #fef7ed 0%, #fdba74 50%, #d97706 100%)',
      image: 'radial-gradient(circle at 20% 80%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)'
    },
    
    colors: {
      text: {
        primary: '#451a03',
        secondary: '#7c2d12',
        muted: '#92400e',
        inverse: '#fef7ed'
      },
      
      surface: {
        primary: 'rgba(254, 247, 237, 0.9)',
        secondary: 'rgba(254, 215, 170, 0.7)',
        elevated: 'rgba(255, 255, 255, 0.9)',
        overlay: 'rgba(254, 247, 237, 0.95)'
      },
      
      interactive: {
        primary: '#d97706',
        secondary: '#fed7aa',
        hover: '#b45309',
        active: '#92400e',
        disabled: '#d6d3d1'
      },
      
      semantic: {
        success: '#16a34a',
        warning: '#eab308',
        error: '#dc2626',
        info: '#d97706'
      },
      
      border: {
        primary: '#fed7aa',
        secondary: '#fde68a',
        focus: '#d97706'
      }
    },
    
    components: {
      sidebar: {
        background: 'rgba(254, 247, 237, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 4px 24px rgba(217, 119, 6, 0.1)'
      },
      
      topbar: {
        background: 'rgba(254, 247, 237, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 1px 3px rgba(217, 119, 6, 0.1)'
      },
      
      card: {
        background: 'rgba(255, 255, 255, 0.8)',
        shadow: '0 1px 3px rgba(217, 119, 6, 0.1)',
        border: '1px solid rgba(254, 215, 170, 0.5)'
      },
      
      modal: {
        background: 'rgba(254, 247, 237, 0.98)',
        backdrop: 'rgba(69, 26, 3, 0.4)',
        shadow: '0 20px 25px -5px rgba(217, 119, 6, 0.2)'
      }
    },
    
    effects: {
      blur: 'blur(12px)',
      shadow: {
        small: '0 1px 2px rgba(217, 119, 6, 0.1)',
        medium: '0 4px 6px rgba(217, 119, 6, 0.15)',
        large: '0 10px 15px rgba(217, 119, 6, 0.2)'
      },
      opacity: {
        low: 0.7,
        medium: 0.85,
        high: 0.95
      }
    }
  },

  // Pro-Tech Theme
  {
    id: 'pro-tech',
    name: '科技蓝',
    description: '现代科技感主题，专业高端',
    category: 'dark',
    
    background: {
      primary: '#0a0f1c',
      secondary: '#1a1f2e',
      gradient: 'linear-gradient(135deg, #0a0f1c 0%, #1a1f2e 50%, #2563eb 100%)',
      image: 'radial-gradient(circle at 80% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 50%)'
    },
    
    colors: {
      text: {
        primary: '#e2e8f0',
        secondary: '#94a3b8',
        muted: '#64748b',
        inverse: '#0a0f1c'
      },
      
      surface: {
        primary: 'rgba(26, 31, 46, 0.9)',
        secondary: 'rgba(30, 41, 59, 0.8)',
        elevated: 'rgba(51, 65, 85, 0.9)',
        overlay: 'rgba(26, 31, 46, 0.95)'
      },
      
      interactive: {
        primary: '#3b82f6',
        secondary: '#1e293b',
        hover: '#60a5fa',
        active: '#2563eb',
        disabled: '#334155'
      },
      
      semantic: {
        success: '#06d6a0',
        warning: '#ffd23f',
        error: '#f72585',
        info: '#3b82f6'
      },
      
      border: {
        primary: 'rgba(59, 130, 246, 0.3)',
        secondary: 'rgba(148, 163, 184, 0.2)',
        focus: '#3b82f6'
      }
    },
    
    components: {
      sidebar: {
        background: 'rgba(26, 31, 46, 0.95)',
        backdrop: 'blur(16px)',
        shadow: '0 4px 24px rgba(59, 130, 246, 0.1)'
      },
      
      topbar: {
        background: 'rgba(26, 31, 46, 0.95)',
        backdrop: 'blur(16px)',
        shadow: '0 1px 3px rgba(59, 130, 246, 0.2)'
      },
      
      card: {
        background: 'rgba(30, 41, 59, 0.8)',
        shadow: '0 1px 3px rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      },
      
      modal: {
        background: 'rgba(26, 31, 46, 0.98)',
        backdrop: 'rgba(10, 15, 28, 0.8)',
        shadow: '0 20px 25px -5px rgba(59, 130, 246, 0.2)'
      }
    },
    
    effects: {
      blur: 'blur(16px)',
      shadow: {
        small: '0 1px 2px rgba(59, 130, 246, 0.1)',
        medium: '0 4px 6px rgba(59, 130, 246, 0.15)',
        large: '0 10px 15px rgba(59, 130, 246, 0.2)'
      },
      opacity: {
        low: 0.6,
        medium: 0.8,
        high: 0.95
      }
    }
  },

  // Ocean Theme
  {
    id: 'ocean',
    name: '海洋蓝',
    description: '清新海洋色调，宁静舒适',
    category: 'colored',
    
    background: {
      primary: '#f0f9ff',
      secondary: '#e0f2fe',
      gradient: 'linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 50%, #0ea5e9 100%)',
      image: 'radial-gradient(circle at 60% 30%, rgba(14, 165, 233, 0.1) 0%, transparent 60%)'
    },
    
    colors: {
      text: {
        primary: '#0c4a6e',
        secondary: '#075985',
        muted: '#0891b2',
        inverse: '#f0f9ff'
      },
      
      surface: {
        primary: 'rgba(240, 249, 255, 0.9)',
        secondary: 'rgba(224, 242, 254, 0.8)',
        elevated: 'rgba(255, 255, 255, 0.9)',
        overlay: 'rgba(240, 249, 255, 0.95)'
      },
      
      interactive: {
        primary: '#0ea5e9',
        secondary: '#e0f2fe',
        hover: '#0284c7',
        active: '#0369a1',
        disabled: '#cbd5e1'
      },
      
      semantic: {
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        info: '#0ea5e9'
      },
      
      border: {
        primary: '#7dd3fc',
        secondary: '#bae6fd',
        focus: '#0ea5e9'
      }
    },
    
    components: {
      sidebar: {
        background: 'rgba(240, 249, 255, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 4px 24px rgba(14, 165, 233, 0.1)'
      },
      
      topbar: {
        background: 'rgba(240, 249, 255, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 1px 3px rgba(14, 165, 233, 0.1)'
      },
      
      card: {
        background: 'rgba(255, 255, 255, 0.8)',
        shadow: '0 1px 3px rgba(14, 165, 233, 0.1)',
        border: '1px solid rgba(125, 211, 252, 0.5)'
      },
      
      modal: {
        background: 'rgba(240, 249, 255, 0.98)',
        backdrop: 'rgba(12, 74, 110, 0.4)',
        shadow: '0 20px 25px -5px rgba(14, 165, 233, 0.2)'
      }
    },
    
    effects: {
      blur: 'blur(12px)',
      shadow: {
        small: '0 1px 2px rgba(14, 165, 233, 0.1)',
        medium: '0 4px 6px rgba(14, 165, 233, 0.15)',
        large: '0 10px 15px rgba(14, 165, 233, 0.2)'
      },
      opacity: {
        low: 0.7,
        medium: 0.85,
        high: 0.95
      }
    }
  },

  // Sunset Theme
  {
    id: 'sunset',
    name: '夕阳红',
    description: '温暖夕阳色彩，浪漫优雅',
    category: 'colored',
    
    background: {
      primary: '#fef2f2',
      secondary: '#fecaca',
      gradient: 'linear-gradient(135deg, #fef2f2 0%, #fca5a5 30%, #f87171 70%, #dc2626 100%)',
      image: 'radial-gradient(circle at 70% 20%, rgba(248, 113, 113, 0.15) 0%, transparent 50%)'
    },
    
    colors: {
      text: {
        primary: '#7f1d1d',
        secondary: '#991b1b',
        muted: '#dc2626',
        inverse: '#fef2f2'
      },
      
      surface: {
        primary: 'rgba(254, 242, 242, 0.9)',
        secondary: 'rgba(254, 202, 202, 0.8)',
        elevated: 'rgba(255, 255, 255, 0.9)',
        overlay: 'rgba(254, 242, 242, 0.95)'
      },
      
      interactive: {
        primary: '#dc2626',
        secondary: '#fecaca',
        hover: '#b91c1c',
        active: '#991b1b',
        disabled: '#d1d5db'
      },
      
      semantic: {
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626',
        info: '#3b82f6'
      },
      
      border: {
        primary: '#fca5a5',
        secondary: '#fecaca',
        focus: '#dc2626'
      }
    },
    
    components: {
      sidebar: {
        background: 'rgba(254, 242, 242, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 4px 24px rgba(220, 38, 38, 0.1)'
      },
      
      topbar: {
        background: 'rgba(254, 242, 242, 0.95)',
        backdrop: 'blur(12px)',
        shadow: '0 1px 3px rgba(220, 38, 38, 0.1)'
      },
      
      card: {
        background: 'rgba(255, 255, 255, 0.8)',
        shadow: '0 1px 3px rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(252, 165, 165, 0.5)'
      },
      
      modal: {
        background: 'rgba(254, 242, 242, 0.98)',
        backdrop: 'rgba(127, 29, 29, 0.4)',
        shadow: '0 20px 25px -5px rgba(220, 38, 38, 0.2)'
      }
    },
    
    effects: {
      blur: 'blur(12px)',
      shadow: {
        small: '0 1px 2px rgba(220, 38, 38, 0.1)',
        medium: '0 4px 6px rgba(220, 38, 38, 0.15)',
        large: '0 10px 15px rgba(220, 38, 38, 0.2)'
      },
      opacity: {
        low: 0.7,
        medium: 0.85,
        high: 0.95
      }
    }
  }
];

// Helper functions
export function getThemeById(id: string): ThemeConfig | undefined {
  return themes.find(theme => theme.id === id);
}

export function getThemesByCategory(category: 'light' | 'dark' | 'colored'): ThemeConfig[] {
  return themes.filter(theme => theme.category === category);
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
  
  // Legacy compatibility
  variables['--background-color'] = theme.background.primary;
  variables['--background-image'] = theme.background.image || 'none';
  variables['--background-opacity'] = theme.effects.opacity.medium.toString();
  
  return variables;
}