import { useThemeStore } from "~/store/themeStore";

export default defineNuxtPlugin((nuxtApp) => {
  // 获取主题存储
  const themeStore = useThemeStore();

  // 在应用启动时应用保存的设置
  nuxtApp.hook("app:created", () => {
    // 只在客户端执行DOM操作
    if (process.client) {
      // 应用背景颜色
      document.documentElement.style.setProperty(
        "--background-color",
        themeStore.backgroundColor
      );

      // 应用背景图片
      if (themeStore.backgroundImage) {
        document.documentElement.style.setProperty(
          "--background-image",
          `url(${themeStore.backgroundImage})`
        );
      }

      // 应用透明度
      document.documentElement.style.setProperty(
        "--background-opacity",
        themeStore.backgroundOpacity.toString()
      );
    }
  });
});
