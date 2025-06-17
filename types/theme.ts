// Theme system types
export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  category: 'light' | 'dark' | 'colored';
  
  // Background styling
  background: {
    primary: string;
    secondary?: string;
    image?: string;
    gradient?: string;
  };
  
  // Component colors
  colors: {
    // Text colors
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    
    // Surface colors
    surface: {
      primary: string;
      secondary: string;
      elevated: string;
      overlay: string;
    };
    
    // Interactive colors
    interactive: {
      primary: string;
      secondary: string;
      hover: string;
      active: string;
      disabled: string;
    };
    
    // Semantic colors
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    
    // Border colors
    border: {
      primary: string;
      secondary: string;
      focus: string;
    };
  };
  
  // Component-specific styling
  components: {
    sidebar: {
      background: string;
      backdrop?: string;
      shadow?: string;
    };
    
    topbar: {
      background: string;
      backdrop?: string;
      shadow?: string;
    };
    
    card: {
      background: string;
      shadow?: string;
      border?: string;
    };
    
    modal: {
      background: string;
      backdrop: string;
      shadow?: string;
    };
  };
  
  // Effects and overlays
  effects: {
    blur: string;
    shadow: {
      small: string;
      medium: string;
      large: string;
    };
    opacity: {
      low: number;
      medium: number;
      high: number;
    };
  };
}

export interface ThemeState {
  currentTheme: string;
  availableThemes: ThemeConfig[];
  // Legacy support
  backgroundColor?: string;
  backgroundImage?: string | null;
  backgroundOpacity?: number;
  customTheme?: Partial<ThemeConfig>;
}