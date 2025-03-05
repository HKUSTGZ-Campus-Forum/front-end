export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
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
});
