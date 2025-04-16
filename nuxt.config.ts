import pkg from "./package.json";

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
  i18n: {
    bundle: {
      optimizeTranslationDirective: false, // 明确禁用此选项
    },
    // 其他 i18n 配置...
  },
  imports: {
    dirs: ["store/**"],
  },
  devServer: {
    host: "127.0.0.1",
    port: 3000,
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
      "/api": {
        target: "https://dev.unikorn.axfff.com",
        changeOrigin: true,
      },
    },
    preset: "static",
    prerender: {
      crawlLinks: false, // prevent crawler from following <a> to /users etc.
      failOnError: false, // ignore 404 during prerender
      routes: ["/", "/login", "/register"], // optional: define known static routes
    },
  },
  runtimeConfig: {
    public: {
      appVersion: pkg.version,
    },
  },
  ssr: true,
});
