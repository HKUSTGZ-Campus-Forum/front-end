import { defineStore } from 'pinia'

// 定义主题状态的接口
interface ThemeState {
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundOpacity: number;
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    backgroundColor: '#97d4f3', // 默认背景颜色
    backgroundImage: null,
    backgroundOpacity: 0.7
  }),
  
  actions: {
    setBackgroundColor(color: string) {
      this.backgroundColor = color;
      document.documentElement.style.setProperty('--background-color', color);
    },
    
    setBackgroundImage(imageUrl: string | null) {
      this.backgroundImage = imageUrl;
      if (imageUrl) {
        document.documentElement.style.setProperty(
          '--background-image', 
          `url(${imageUrl})`
        );
      } else {
        document.documentElement.style.setProperty('--background-image', 'none');
      }
    },
    
    setBackgroundOpacity(opacity: number) {
      this.backgroundOpacity = opacity;
      document.documentElement.style.setProperty('--background-opacity', opacity.toString());
    }
  },
  
  persist: true // 持久化存储用户设置
})