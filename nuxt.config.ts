import pkg from "./package.json";

export default defineNuxtConfig({
  compatibilityDate: "2025-03-24",
  devtools: { enabled: false },
  ui: {
    fonts: false,
  },
  modules: [
    // Pinia 配置
    "@pinia/nuxt",
    "@pinia-plugin-persistedstate/nuxt",
    "dayjs-nuxt",
    "@nuxtjs/i18n",
    "@nuxt/ui",
  ],
  i18n: {
    locales: [
      {
        code: "zh",
        name: "中文",
        file: "zh.json",
      },
      {
        code: "en",
        name: "English",
        file: "en.json",
      },
    ],
    defaultLocale: "zh",
    strategy: "no_prefix",
    langDir: "locales/",
    lazy: true,
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
      link: [
        {
          rel: "icon",
          type: "image/x-icon",
          href: "/favicon.ico",
        },
      ],
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
    // preset: "static",
    prerender: {
      crawlLinks: true, // prevent crawler from following <a> to /users etc.
      failOnError: false, // ignore 404 during prerender
      // routes: ["/", "/login", "/register"], // optional: define known static routes
      ignore: [
        // 忽略特定路径，不进行预渲染
        "/user", // 排除用户相关页面
        "/user/**", // 排除用户相关的所有子路径
        // "/admin/**", // 排除管理员路径
        // "/profile/**", // 排除个人资料页面
        "/settings/**", // 排除设置页面
      ],
    },
  },

  runtimeConfig: {
    public: {
      appVersion: pkg.version,
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? "http://127.0.0.1:3000" : "https://unikorn.axfff.com"),
    },
  },
  ssr: true,
});
