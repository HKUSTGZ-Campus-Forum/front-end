import { defineStore } from 'pinia'

interface ThemeState {
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundOpacity: number;
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    backgroundColor: '#97d4f3',
    backgroundImage: null,
    backgroundOpacity: 0.7
  }),
  
  actions: {
    setBackgroundColor(color: string) {
      this.backgroundColor = color;
      if (process.client) {
        document.documentElement.style.setProperty('--background-color', color);
      }
    },
    
    setBackgroundImage(imageUrl: string | null) {
      this.backgroundImage = imageUrl;
      if (process.client) {
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
      if (process.client) {
        document.documentElement.style.setProperty('--background-opacity', opacity.toString());
      }
    }
  },
  
  // 条件应用持久化配置
  persist: process.client ? {
    storage: localStorage,
    paths: ['backgroundColor', 'backgroundImage', 'backgroundOpacity']
  } : false
})