import pkg from "./package.json";

const appBuildVersion =
  process.env.NUXT_PUBLIC_APP_BUILD_VERSION ||
  process.env.GITHUB_SHA ||
  process.env.GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  pkg.version;

export default defineNuxtConfig({
  compatibilityDate: "2025-03-24",
  devtools: { enabled: false },
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === "iconify-icon",
    },
  },
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
    strategy: "prefix_except_default",
    lazy: true,
    langDir: "locales",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "unikorn_locale",
      redirectOn: "root",
      alwaysRedirect: false,
      fallbackLocale: "zh",
    },
    bundle: {
      optimizeTranslationDirective: false
    }
  },
  imports: {
    dirs: ["store/**"],
  },
  devServer: {
    host: "localhost",
    port: 3000,
  },
  vite: {
    server: {
      hmr: {
        port: 3001,
        host: 'localhost'
      }
    }
  },
  app: {
    layoutTransition: false,
    keepalive: false,
    head: {
      meta: [
        // PWA meta tags
        { name: 'application-name', content: 'UniKorn Campus Forum' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'UniKorn' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'msapplication-config', content: '/browserconfig.xml' },
        { name: 'msapplication-TileColor', content: '#4f46e5' },
        { name: 'msapplication-tap-highlight', content: 'no' },
        { name: 'theme-color', content: '#4f46e5' },
        // Standard meta tags
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'University online community platform' },
        { name: 'keywords', content: 'university, forum, community, education, students' }
      ],
      link: [
        {
          rel: "icon",
          type: "image/x-icon",
          href: "/favicon.ico",
        },
        // PWA manifest
        {
          rel: 'manifest',
          href: '/manifest.json'
        },
        // Apple touch icons
        {
          rel: 'apple-touch-icon',
          sizes: 'any',
          href: '/image/uniKorn.png'
        },
        // Additional PWA assets
        {
          rel: 'mask-icon',
          href: '/icons/topbar_logo.svg',
          color: '#4f46e5'
        }
      ],
    },
  },
  css: [
    "~/assets/css/variables.scss",
    "~/assets/css/global.scss",
    "~/assets/css/transitions.scss",
  ],
  nitro: {
    // 匹配 /api 后会把剩余路径拼到 target 上；target 必须带上 /api，
    // 否则 /api/auth/login 会变成上游 /auth/login 导致 404。
    devProxy: {
      "/api": {
        target: "https://dev.unikorn.axfff.com/api",
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
        "/profile", // 当前登录用户主页（会重定向）
        "/user", // 排除用户相关页面
        "/user/**", // 排除用户相关的所有子路径
        "/users/**", // 排除动态用户主页
        // "/admin/**", // 排除管理员路径
        "/setting/**", // 排除设置页面
      ],
    },
  },

  runtimeConfig: {
    public: {
      appVersion: pkg.version,
      appBuildVersion,
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? "http://127.0.0.1:3000" : "https://unikorn.axfff.com"),
    },
  },
  ssr: true,
});
