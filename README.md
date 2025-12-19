# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

# UniKorn 前端项目文档

## API 文档位置：https://github.com/HKUSTGZ-Campus-Forum/Docs

## 目录

- 项目概述
- 技术栈
- 开发环境设置
- 项目结构
- 核心组件
- 状态管理
- 样式指南
- 国际化
- 路由
- 最佳实践
- 部署
- 常见问题

## 项目概述

UniKorn是一个基于Nuxt 3框架开发的现代化Web应用，提供了流畅的用户体验和响应式设计。项目采用组件化开发方式，具有高度可定制和可扩展的特性。

### 设计理念

- **组件化** - 所有UI元素都被设计成可重用组件
- **响应式** - 适配不同设备尺寸
- **可维护性** - 规范化代码结构和风格
- **高性能** - 优化加载速度和用户交互体验

## 技术栈

- **框架**：[Nuxt 3](https://nuxt.com/)
- **JavaScript 超集**：[TypeScript](https://www.typescriptlang.org/)
- **UI框架**：自定义组件
- **CSS预处理器**：[SCSS](https://sass-lang.com/)
- **状态管理**：[Pinia](https://pinia.vuejs.org/)
- **国际化**：[Vue I18n](https://vue-i18n.intlify.dev/)
- **图标**：[Font Awesome](https://fontawesome.com/)

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:3000` 运行

### 构建生产版本

```bash
npm run build
```

### 本地预览生产构建

```bash
npm run preview
```

## 项目结构

```
web/
├── assets/            # 静态资源文件
│   ├── css/           # 全局CSS
│   └── image/         # 图片资源
├── components/        # 可复用的Vue组件
│   ├── home/          # 首页相关组件
│   └── layout/        # 布局相关组件
├── composables/       # 组合式函数
├── layouts/           # 页面布局模板
├── middleware/        # 路由中间件
├── pages/             # 页面组件
├── plugins/           # Vue插件
├── public/            # 公共静态资源
├── server/            # 服务端API
├── stores/            # Pinia状态管理
├── types/             # TypeScript类型定义
├── utils/             # 工具函数
├── nuxt.config.ts     # Nuxt配置文件
└── package.json       # 项目依赖管理
```
