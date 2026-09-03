# UniKorn 前端开发记忆

本文只记录当前代码仍然成立、下一位开发者容易踩错的约定。历史变更请查
`CHANGELOG.md`，架构取舍请查 `docs/architecture.md`，工作流以 `AGENTS.md` 为准。

## 当前产品与技术边界

- Nuxt 3 SSR、Vue 3、TypeScript、SCSS、Pinia、Vue I18n。
- 当前正式产品是 `https://unikorn.hkust-gz.edu.cn`，发布到 `unikorn-school` 学校服务器；旧 `unikorn.axfff.com` production workflow 不是当前正式发布路径。环境细节见 `docs/production-environment.md`。
- 正式发布由后端仓库 `school-production` 分支的 manifest 成对指定前后端 `main` SHA；前端 `main` 的自动部署目标始终是共享 dev。
- 默认中文，英文路径使用 `/en/*`；新增界面必须同时提供 `zh` / `en` 文案。
- 当前支持 `keguang-blue` 与 `deep-dark` 两套主题。组件只能使用
  `assets/css/variables.scss` 中的主题 token，不要硬编码界面颜色。
- 产品视觉是稳定、理性、低学习成本的“科广蓝校园工具风”；主站页面优先复用
  `keguang` 布局、白/深色表面卡片、轻量阴影和既有响应式断点。
- `l2d@2.1.1` 的 npm `main` 字段指向不存在的根 `index.js`；桌宠渲染器必须从
  `l2d/dist/index.js` 动态导入，避免 Nuxt SSR 执行浏览器运行时，也避免 Vite 包入口解析失败。

## 认证：SSO-only

- HKUST(GZ) OIDC SSO 是唯一的终端用户登录方式。不要恢复密码登录、自助注册、
  忘记密码、重置密码或修改密码入口。
- `/login` 只负责读取 OIDC 状态、跳转学校 SSO，以及用一次性 `oidc_code` 调用
  `/api/auth/oidc/exchange` 换取 UniKorn access/refresh token。
- `useAuth.ts` 是认证端点的集中实现；它有意直接调用认证接口，避免与
  `useApi()` 的自动刷新形成循环依赖。
- 旧认证 URL 会跳回登录页；后端旧帐密端点返回 `410 sso_only`。

### 首次 SSO 登录资料确认

- 仅“由 SSO 新建”的账号拥有 `onboarding_required: true`。迁移前已有用户，以及
  首次关联到既有已验证账号的用户，都视为已完成，不能被误拦截。
- SSO exchange 后，登录页把未完成用户送到本地化的 `/onboarding` 或
  `/en/onboarding`。`middleware/onboarding.global.ts` 会持续守卫，防止用户靠刷新或
  直接输入 URL 绕过。
- 引导页要求确认 2–50 字符公开用户名，头像可选；学校邮箱只做遮罩后的已验证
  身份提示。提交调用 `POST /api/users/me/onboarding`。
- 完成接口是幂等的。前端必须保存接口返回的完整用户对象，让 localStorage 中的
  `onboarding_required` 立即变为 `false`。
- `redirect` 必须经过 `safePostOnboardingReturnTo()`，只允许站内路径，并避免回到
  login/onboarding 形成循环。
- 未完成用户仍可访问 `/help/rules` 与 `/help/privacy`（含英文路径）；不要让全局
  守卫拦截引导页上的规则和隐私链接。

## API 调用

- 普通受保护接口：`useApi().fetchWithAuth()`，统一处理 access token 和刷新。
- 普通公开接口：`useApi().fetchPublic()`；需要完整 URL 时用 `getApiUrl()`。
- 不要在业务组件里随意写裸 `fetch()`。认证流程是明确例外，集中在
  `composables/useAuth.ts`。
- 开发服务器的 `/api` 由 `nuxt.config.ts` 转发。团队联调通常复制 `.env.example`
  并连接 `https://dev.unikorn.axfff.com`；不要在功能代码中写死环境地址。

## 文件上传与头像显示

- 上传仍由 `useCustomFileUpload()` 处理：先向后端申请签名 URL，再用 XHR 直传
  OSS，最后轮询文件状态。申请 URL 和轮询必须走 `fetchWithAuth()`。
- 浏览器展示头像时不能直接使用 OSS 地址。后端返回同源、稳定的 UniKorn 头像
  URL；`components/user/UserAvatar.vue` 会丢弃旧缓存中的 `aliyuncs.com` URL，并从
  `/api/users/public/:id` 刷新数据库派生的同源地址。
- 新头像场景优先复用 `<UserAvatar>`，并始终提供 username 与 user id，让首字母
  占位和刷新兜底可用。

## 布局与组件命名

- 主站布局：`layouts/keguang.vue` → `<HomeKeguangContainer>`。
- 当前导航组件是 `components/home/KeguangPinned.vue` 与
  `components/home/KeguangSidebar.vue`；Nuxt 自动导入名分别为
  `<HomeKeguangPinned>` 与 `<HomeKeguangSidebar>`。
- 主侧栏的唯一组队入口保留 `nav.teamMatching` 文案和
  `sidebar_matching.svg` 图标，但规范路由是 `/teamup`；旧 `/matching` 只作为兼容地址
  永久重定向，不要重新增加第二个“课程组队”入口。
- 不要照搬旧文档中的 `<HomePinned>` / `<HomeSidebar>`；这些文件名已经不存在。
- 登录和首次资料确认使用 `layouts/keguang-auth.vue`，保持轻量顶栏和居中的认证
  卡片体验。

## 国际化、可访问性与移动端

- UI 文案进入 `i18n/locales/zh.json` 与 `en.json`，使用相同语义 key；不要在组件
  模板中硬编码中英文。
- 表单必须有可见 label、键盘焦点、错误提示关联、loading/disabled 状态；图标若
  只是装饰应加 `aria-hidden="true"`。
- 每个页面同时验收桌面和手机视口。窄屏重点检查长英文、邮箱、课程 ID、按钮和
  卡片是否横向溢出。

## 主题

- 主题状态在 `store/themeStore.ts`，持久化键为 `theme`。
- SSR 首屏固定以 `keguang-blue` hydrate；`app.vue` 的首屏脚本先防 FOUC，
  `plugins/theme.client.ts` 在 `app:suspense:resolve` 后恢复 Pinia 状态。
- 不要把 persisted-state 提前到 hydration 前，否则会重现深色页面与主题按钮状态
  不一致的问题。
- 常用 token：`--background-primary`、`--surface-primary`、
  `--surface-secondary`、`--text-primary`、`--text-secondary`、
  `--border-primary`、`--interactive-primary`、`--semantic-*`、`--shadow-*`。

## 验证命令

```bash
npm run i18n:check
npm test
npm run build
```

涉及 UI 时还要在 `localhost:3000` 实际检查中文/英文、桌面/手机以及深色主题；完成
后关闭本地 dev server。构建中已知的 `CommonMarkdownEditor` 重复自动导入 warning
与本次认证流程无关，但任何新增 error 都必须处理。

## 高频检查清单

1. 认证入口是否仍然只有学校 SSO。
2. 新 SSO 用户是否被持久化引导，既有用户是否不会被误拦截。
3. API 是否走正确的 `useApi` / `useAuth` 层。
4. 头像展示是否保持同源、无 OSS 签名 URL 泄露。
5. 文案是否中英文齐全，颜色是否全部来自主题 token。
6. `HomeKeguang*` 自动导入名是否保持正确。
7. 桌面、手机、浅色、深色是否完成回归。

*Last reconciled with `origin/main`: 2026-08-22*
