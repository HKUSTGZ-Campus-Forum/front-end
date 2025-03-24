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

## 核心组件

### 基础布局组件

#### `HomePinned.vue` - 顶部导航栏

提供站点的主要导航功能，包含：
- 品牌信息
- 侧边栏切换
- 搜索功能
- 用户菜单

```vue
<HomePinned 
  brandName="UniKorn" 
  :showSearch="true"
  userAvatar="/image/user.jpg"
  username="当前用户" 
  @toggle-sidebar="toggleSidebar" 
/>
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| brandName | String | "uniKorn" | 显示的品牌名称 |
| showSearch | Boolean | true | 是否显示搜索框 |
| userAvatar | String | "/image/testpic1.jpg" | 用户头像URL |
| username | String | "测试" | 用户名 |

| 事件 | 说明 |
|------|------|
| toggle-sidebar | 切换侧边栏状态时触发 |

#### `Sidebar.vue` - 侧边导航栏

控制网站的主要导航菜单，可折叠展开。

```vue
<Sidebar :folded="sidebarFolded" />
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| folded | Boolean | false | 侧边栏是否折叠 |

#### `HomeContainer.vue` - 主体容器

管理侧边栏状态与主体内容的布局。

## 状态管理

项目使用Pinia进行状态管理，主要存储包括：

### `homeStore.js` - 主页状态

```js
// stores/homeStore.js
export const usePersistHomeStore = defineStore('homeStore', {
  state: () => ({
    fold: false, // 侧边栏折叠状态
  }),
  actions: {
    toggleFold() {
      this.fold = !this.fold
    }
  },
  persist: true // 持久化存储
})
```

## 样式指南

### 色彩系统

项目使用CSS变量定义主题色：

```css
:root {
  --kungalgame-blue-5: #0d6efd;  /* 主要蓝色 */
  --kungalgame-blue-6: #0a58ca;  /* 深蓝色 */
  --kungalgame-blue-7: #343a40;  /* 导航栏背景色 */
  
  --light-bg: #f8f9fa;        /* 浅色背景 */
  --border-color: #dee2e6;    /* 边框颜色 */
  --text-color: #212529;      /* 主文本颜色 */
  --text-light: #6c757d;      /* 次要文本颜色 */
}
```

### 响应式设计

使用媒体查询适配不同屏幕尺寸：

```scss
// 移动设备
@media (max-width: 700px) {
  .search-form {
    display: none;
  }
}

// 平板设备
@media (max-width: 991px) and (min-width: 701px) {
  // 平板样式
}
```

## 国际化

项目使用Vue I18n实现多语言支持：

```js
// 在组件中使用
import { useI18n } from "vue-i18n";
const { t } = useI18n();

// 模板中使用
{{ t('search.placeholder', '搜索...') }}
```

## 路由

Nuxt 3使用基于文件系统的路由：

- index.vue → `/`
- `pages/posts.vue` → `/posts`
- `pages/posts/[id].vue` → `/posts/:id`

## 最佳实践

1. **组件命名**
   - 使用PascalCase命名组件文件和组件名
   - 页面组件使用index.vue，例如`pages/posts/index.vue`

2. **CSS编写规范**
   - 使用scoped样式防止样式污染
   - 使用SCSS嵌套减少重复代码
   - 为所有CSS类添加适当注释

3. **TypeScript使用**
   - 为所有props定义明确类型
   - 使用接口定义数据结构
   - 避免使用`any`类型

4. **性能优化**
   - 使用异步组件懒加载
   - 为长列表使用虚拟滚动
   - 避免不必要的计算属性

## 部署

### 构建项目

```bash
npm run build
```

### 静态网站部署

```bash
npm run generate
```

生成的`.output/public`目录可部署到任何静态网站托管服务。

### 服务端渲染部署

详见[Nuxt部署文档](https://nuxt.com/docs/getting-started/deployment)

## 常见问题

### Nuxt启动页面如何移除？

在`nuxt.config.ts`中配置：

```typescript
export default defineNuxtConfig({
  app: {
    pageTransition: false,
    layoutTransition: false,
    keepalive: false
  }
})
```

### 如何处理CORS跨域问题？

当调用外部API时，可能需要在API服务器端启用CORS，或使用Nuxt的server路由代理请求。

### 如何持久化用户状态？

使用Pinia的persist插件：

```js
import { defineStore } from 'pinia'
import { persistedState } from 'pinia-plugin-persistedstate'

export const useUserStore = defineStore('user', {
  // 状态定义
  persist: true
})
```

---

此文档将随项目发展持续更新。如有问题，请联系开发团队。