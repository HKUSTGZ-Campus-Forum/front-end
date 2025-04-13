export default defineNuxtConfig({
  compatibilityDate: "2025-03-24",
  devtools: { enabled: false },
  modules: [
    // Pinia 配置
    "@pinia/nuxt",
    "@pinia-plugin-persistedstate/nuxt",
    "dayjs-nuxt",
    "@nuxtjs/i18n",
  ],
  // i18n: {
  //   langDir: 'locales',
  //   defaultLocale: 'zh',
  //   locales: [
  //     { code: 'zh', file: 'zh.json' }
  //   ]
  // },
  imports: {
    dirs: ["store/**"],
  },
  devServer: {
    host: "127.0.0.1",
    port: 1007,
  },
  app: {
    layoutTransition: false,
    keepalive: false,
    head: {
      // 可以在这里自定义 head 内容
    },
  },
  css: [
    "~/assets/css/variables.scss",
    "~/assets/css/global.scss",
    "~/assets/css/transitions.scss",
  ],
  nitro: {
    devProxy: {
      '/api': {
        target: 'https://dev.unikorn.axfff.com',
        changeOrigin: true
      }
    }
  }
});
