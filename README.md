# UniKorn 前端项目文档

> **UniKorn 科广汇** — 面向校园的论坛与社区 Web 应用（Nuxt 3 SSR）。
> 本仓库为前端项目；后端仓库见 [HKUSTGZ-Campus-Forum/back-end](https://github.com/HKUSTGZ-Campus-Forum/back-end)（工作区 `back-end/`），API 文档见 [HKUSTGZ-Campus-Forum/Docs](https://github.com/HKUSTGZ-Campus-Forum/Docs)（工作区 `Docs/`）。

## 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [开发环境设置](#开发环境设置)
- [项目结构](#项目结构)
- [核心板块](#核心板块)
- [文档索引](#文档索引)
- [国际化](#国际化)
- [主题](#主题)
- [测试](#测试)
- [部署](#部署)
- [常见问题](#常见问题)

## 项目概述

UniKorn 是一个基于 Nuxt 3 框架开发的现代化校园论坛与社区 Web 应用，提供流畅的用户体验与响应式设计。项目采用组件化开发方式，具有高度可定制和可扩展的特性。

### 设计理念

- **组件化** — 所有 UI 元素都被设计成可重用组件
- **响应式** — 适配不同设备尺寸
- **可维护性** — 规范化代码结构和风格
- **高性能** — 优化加载速度和用户交互体验
- **渐进增强** — 新功能优先叠加在既有系统之上，保持向后兼容

## 技术栈

- **框架**：[Nuxt 3](https://nuxt.com/)（SSR）
- **JavaScript 超集**：[TypeScript](https://www.typescriptlang.org/)
- **UI**：自定义组件 + [Nuxt UI](https://ui.nuxt.com/)
- **CSS 预处理器**：[SCSS](https://sass-lang.com/)
- **状态管理**：[Pinia](https://pinia.vuejs.org/)
- **国际化**：[Vue I18n](https://vue-i18n.intlify.dev/)（zh / en）
- **测试**：[Vitest](https://vitest.dev/)
- **图表**：ApexCharts / vue3-apexcharts
- **其他**：dayjs、marked、md-editor-v3、pdfjs-dist、docx-preview、iconify-icon

## 开发环境设置

### 安装依赖

```bash
npm install
```

> 仓库同时维护 `package-lock.json` 与 `pnpm-lock.yaml`，新增依赖时两者需保持一致。

### 启动开发服务器

```bash
npm run dev
```

开发服务器运行于 `http://localhost:3000`。默认通过 `nuxt.config.ts` 的 devProxy 将 `/api` 转发到 `http://localhost:8000`（本地后端）；若需连接开发环境后端，可在 `.env` 中设置：

```
NUXT_PUBLIC_API_BASE_URL=https://dev.unikorn.axfff.com
```

### 构建生产版本

```bash
npm run build
```

### 本地预览生产构建

```bash
npm run preview
```

### 测试与检查

```bash
npm test              # Vitest 测试
npm run test:scheduler  # 仅排课助手测试
npm run i18n:check    # 检查 i18n key 与硬编码扫描
```

## 项目结构

```
front-end/
├── app.vue                 # 根组件
├── nuxt.config.ts          # Nuxt 配置（模块、i18n、路由规则、devProxy、运行时配置）
├── assets/css/             # 全局 SCSS（variables / global / transitions）
├── components/             # 可复用组件
│   ├── home/               # 首页（导航、侧边栏等）
│   ├── forum/              # 论坛组件
│   ├── courses/            # 课程板块组件（含 universe/ 课程宇宙）
│   └── scheduler/          # 排课助手组件
├── composables/            # useApi、useAuth、useAppLocale、useScheduler 等
├── constants/              # 常量定义
├── i18n/locales/           # zh.json / en.json
├── layouts/                # 页面布局（keguang 等）
├── middleware/             # auth / admin 路由守卫
├── pages/                  # 页面路由
│   ├── courses/            # 课程：探索、规划器、学术地图、课程详情
│   ├── schedule/           # 排课助手入口（重定向到 /courses/planner）
│   ├── forum/              # 论坛
│   ├── onboarding.vue      # 首次 SSO 登录公开资料确认
│   └── admin/              # 管理后台（SSR 关闭）
├── plugins/                # iconify / theme / pwa 客户端插件
├── public/                 # 静态资源、PWA manifest
├── server/                 # Nitro server routes（/health 等）
├── store/                  # Pinia store（自动导入）
├── tests/                  # Vitest 测试
├── utils/                  # 纯逻辑工具（scheduler、schedulerCart、courseUniverse 等）
├── docs/                   # 项目文档（见下方"文档索引"）
├── deploy/                 # 原子发布脚本与说明
├── README.nuxt.md          # Nuxt 官方模板存档（已不再作为主页）
└── version.ts              # 版本号与版本历史
```

## 核心板块

- **课程板块**（`/courses`）：课程宇宙图谱、课程探索、规划器（排课助手）、学术地图、课程详情与评论
- **排课助手**（`/schedule` → `/courses/planner`）：由原 `CoursePlan.search` 迁移而来，支持课程筛选、课表求解、冲突检测、收藏夹
- **论坛**（`/forum`）：帖子、评论、表情回应、标签
- **管理后台**（`/admin`）：反馈审核、身份核验、内容管理（SSR 关闭）
- **学校认证**（`/login`）：仅支持 HKUST(GZ) SSO；由 SSO 新建的账号首次登录需在 `/onboarding` 确认公开用户名，可选设置头像

## 文档索引

| 文档 | 说明 |
|------|------|
| `CHANGELOG.md` | 正式版本变更日志 |
| `AGENTS.md` | Agent 工作流规范（代码规范、提交规范、文档要求） |
| `CLAUDE.md` | 前端开发笔记：主题、认证、上传、导航系统、易错点 |
| `docs/architecture.md` | 架构决策记录（ADR） |
| `docs/THEME_SYSTEM.md` | 主题系统设计 |
| `docs/i18n-guidelines.md` | 国际化规范 |
| `docs/i18n-execution-plan.md` | 国际化执行计划 |
| `docs/plans/` | 大型功能计划与设计（本仓库工作流；另有 `docs/superpowers/` 为外部工具遗留） |
| `deploy/README.md` | 部署机制说明（原子发布、PM2） |
| `PWA_IMPLEMENTATION.md` | PWA 实现说明 |
| `PWA_NOTIFICATION_SETUP.md` | PWA 通知设置 |

## 国际化

项目支持中文（默认）与英文双语，采用 Vue I18n 的 `prefix_except_default` 策略（`/en/*` 为英文路径）。

- 所有 UI 文案必须写入 `i18n/locales/{zh,en}.json`，使用语义化 key（如 `courses.*`、`scheduler.*`）
- 禁止在组件中硬编码界面字符串
- 规则详见 `docs/i18n-guidelines.md`，合并前运行 `npm run i18n:check`

## 主题

项目采用**科广蓝 / 深邃黑双主题** + CSS 自定义变量体系：

- 新组件必须使用主题变量（`var(--surface-primary)`、`var(--text-primary)` 等），**禁止硬编码颜色**
- 详见 `docs/THEME_SYSTEM.md`

## 测试

- 测试框架：Vitest（`npm test`）
- 覆盖范围：排课求解器/购物车（`tests/scheduler/`）、课程工具（`tests/courses/`）、课程宇宙（`tests/course-universe/`）、学术地图（`tests/academic-map/`）、部署脚本（`tests/deploy/`）
- 纯逻辑放 `utils/` 便于单测，Vue 组件保持薄交互层

## 部署

- 开发环境：push 到 `main` 自动部署（`.github/workflows/deploy.yml`）
- 生产环境：push 到 `production` 自动部署（`.github/workflows/deploy-frontend-prod.yml`）
- 采用不可变发布目录 + 原子切换 + PM2 进程管理，详见 `deploy/README.md`
- CI（`.github/workflows/frontend-ci.yml`）：PR 时执行 i18n 检查、测试、构建与镜像构建

## 常见问题

1. **401 错误**：确认 API 调用使用 `useApi()` 的 `fetchWithAuth`/`fetchPublic`，而非直接 `fetch`
2. **导航栏消失**：检查组件引用命名（如 `<HomeKeguangPinned>` / `<HomeKeguangSidebar>`），Nuxt 自动导入目录前缀不可省略
3. **头像不显示**：确认接口返回 UniKorn 同源头像 URL；浏览器不应直接加载 OSS 签名地址，`UserAvatar` 会按 user id 刷新
4. **图标缺失**：Font Awesome 不可靠时使用 Unicode fallback
5. **i18n 漏翻**：新页面先补 `zh.json`/`en.json` key，再跑 `npm run i18n:check`
6. **颜色硬编码**：新样式必须使用主题 CSS 变量
