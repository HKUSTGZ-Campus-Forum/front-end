import { useThemeStore } from '~/store/themeStore';

export default defineNuxtPlugin(() => {
  const themeStore = useThemeStore();
  
  // 在DOM加载完成后应用主题
  function applyTheme() {
    // 应用背景颜色
    if (themeStore.backgroundColor) {
      document.documentElement.style.setProperty(
        '--background-color',
        themeStore.backgroundColor
      );
    }
    
    // 应用背景图片
    if (themeStore.backgroundImage) {
      document.documentElement.style.setProperty(
        '--background-image',
        `url(${themeStore.backgroundImage})`
      );
    } else {
      document.documentElement.style.setProperty('--background-image', 'none');
    }
    
    // 应用透明度
    document.documentElement.style.setProperty(
      '--background-opacity',
      themeStore.backgroundOpacity.toString()
    );
  }
  
  // 确保在DOM准备好后应用主题
  if (document.readyState !== 'loading') {
    applyTheme();
  } else {
    document.addEventListener('DOMContentLoaded', applyTheme);
  }
});