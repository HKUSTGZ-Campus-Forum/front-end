# Architecture Decision Records

本文档记录 UniKorn 前端项目中的重要技术决策及其理由，便于后续 Agent 与开发者查阅。
每项决策包含：背景（Context）、决策（Decision）、理由（Consequences/Justification）。

> 新决策由 Agent 或开发者按模板追加到文末。格式参考 [MADR](https://adr.github.io/madr/)。

---

## ADR-001：主题系统采用"单一主题 + CSS 自定义属性"

- **日期**：2025-04
- **状态**：已采纳
- **背景**：早期组件大量硬编码颜色，导致主题切换与视觉统一困难。
- **决策**：以"科广蓝"（keguang-blue）为唯一主题，通过 CSS 自定义属性（`var(--surface-primary)`、`var(--text-primary)`、`var(--border-primary)`、`var(--shadow-small)` 等）定义颜色；未来新增主题仅替换颜色变量，布局保持一致。所有新组件禁止硬编码颜色。
- **理由**：低侵入地实现全站视觉一致；为后续暗色/浅色变体预留扩展点；避免引入重型主题框架。
- **相关文档**：`docs/THEME_SYSTEM.md`、`assets/css/variables.scss`

## ADR-002：所有后端 API 调用统一走 `fetchWithAuth` / `fetchPublic`

- **日期**：2025-04
- **状态**：已采纳
- **背景**：JWT access token 过期后，直接 `fetch` 调用会返回 401，且无法自动刷新。
- **决策**：封装 `useApi()` 组合式函数，提供 `fetchWithAuth`（带自动刷新）与 `fetchPublic`（公开接口）；除认证端点（`useAuth.ts`，避免循环依赖）、公开端点、OSS 直传（XMLHttpRequest + 签名 URL）外，禁止直接 `fetch`。
- **理由**：统一令牌刷新逻辑、减少 401 事故、便于注入基址（同源 `/api` 或绝对 URL）。
- **相关文档**：`CLAUDE.md`、`composables/useApi.ts`

## ADR-003：导航组件沿用 Nuxt 自动导入命名约定（`HomePinned`/`HomeSidebar`）

- **日期**：2024-12
- **状态**：已采纳
- **背景**：将顶部导航与侧边栏迁移到 `components/home/` 后，若在模板中使用文件原名（`<Pinned>`）会导致导航栏消失；曾尝试"修正"命名导致回归。
- **决策**：严格遵守 Nuxt 自动导入规则 —— `components/home/Pinned.vue` 在模板中写作 `<HomePinned>`、`Sidebar.vue` 写作 `<HomeSidebar>`；不得把模板引用改成与文件名一致。
- **理由**：组件按目录前缀自动命名；破坏该约定会静默破坏导航系统。同类问题通过"优先级 + 兜底"策略（如头像三级回退）解决，而非替换既有行为。
- **相关文档**：`CLAUDE.md`

## ADR-004：排课助手迁移为并行迁移，旧站保持只读可用

- **日期**：2026-06
- **状态**：已采纳（实施中）
- **背景**：原独立项目 `CoursePlan.search`（Next.js）需要并入主站"课程"板块；但旧站用户、购物车、数据不可破坏，且需要回滚路径。
- **决策**：
  - 主站新入口 `/schedule`（重定向到 `/courses/planner`）；旧站 `scheduler.unikorn.axfff.com` 保持独立可用；
  - 只迁移两个核心界面（课表 dashboard、地图 map），不迁移旧账号与历史购物车；
  - 公共课程数据通过只读快照导入（事务性、可重入），绝不回写旧库；
  - 游客购物车存浏览器本地，登录用户购物车通过主站 JWT 接口持久化。
- **理由**：并行迁移可在开发/验收期间保持旧站稳定，支持随时回滚，避免"一刀切"切换风险。
- **相关文档**：`docs/superpowers/specs/2026-06-01-schedule-parallel-migration-design.md`、`docs/superpowers/plans/2026-06-01-schedule-parallel-migration.md`

## ADR-005：课程宇宙图谱采用"纯适配器 + 薄组件"架构

- **日期**：2026-06
- **状态**：已采纳（实施中）
- **背景**：课程宇宙画布只渲染 `category === 0` 的课程节点，过滤了前置/共修/互斥逻辑节点，导致关系连线错位、图谱不完整。
- **决策**：在 `utils/courseUniverse.ts` 中提供纯图适配器（完整图节点、路由连线、可见性集合、悬停遍历），组件层（`CourseUniverseCanvas.vue`）只负责 Vue 交互状态与 SVG 渲染；坐标/可见性等纯计算放入工具函数以便 Vitest 覆盖。
- **理由**：图谱计算可单测、组件保持薄交互层、与参考实现（`CoursePlan.search` 的 `map/draw.tsx`）行为对齐且不依赖其 React/Redux 结构。
- **相关文档**：`docs/superpowers/specs/2026-06-02-course-universe-complete-graph-rendering-design.md`、`docs/superpowers/plans/2026-06-02-course-universe-complete-graph-rendering.md`

## ADR-006：部署采用不可变发布目录 + 原子符号链接切换

- **日期**：2026-06
- **状态**：已采纳
- **背景**：早期直接覆盖部署存在"半发布"窗口与回滚困难。
- **决策**：每次构建上传到唯一 `.incoming/<git-sha>-<run>-<attempt>` 目录，校验完整文件清单后加锁（no-follow、close-on-exec）串行切换，将目录移入 `releases/` 并原子切换 `current` 符号链接；PM2 始终从 `current/.output/server/index.mjs` 启动；仅当所有进程报告预期 Git SHA 且 `/health` 探测通过才判定部署成功。
- **理由**：消除部分写入状态、保证可回滚（切换回旧 symlink）、部署身份可校验。
- **相关文档**：`deploy/README.md`、`.github/workflows/deploy.yml`

## ADR-007：学校 SSO 使用后端 OIDC + 一次性前端登录票据

- **日期**：2026-08
- **状态**：已采纳
- **背景**：HKUST(GZ) SSO 使用 OAuth 2.0 Authorization Code Flow 与 OIDC。现有前端把 UniKorn JWT 保存在浏览器中，但学校的 client secret、授权码交换和 ID Token 校验必须留在可信后端，同时回调 URL 不能携带本地 access/refresh token。
- **决策**：后端使用 Authlib、PKCE S256、state/nonce 和 Discovery 元数据完成学校认证；以 `(issuer, sub)` 作为外部身份主键，只自动关联已验证的校内邮箱；回调生成两分钟、单次消费的数据库票据，前端通过 `/api/auth/oidc/exchange` 换取现有 UniKorn JWT；统一登出使用 HttpOnly ID Token cookie 生成学校 end-session URL。
- **理由**：client secret 与学校 Token 不进入前端，避免 JWT 出现在查询字符串；稳定 subject 不依赖可能变化或回收的邮箱；一次性票据兼容现有认证状态而无需重写全站 API。
- **相关文档**：`back-end/docs/campus-sso.md`、`back-end/migrations/versions/20260819_campus_oidc.py`

## ADR-008：课程评价按课程聚合，按开课学期归属

- **日期**：2026-08
- **状态**：已采纳
- **背景**：评价页此前以学期作为浏览粒度，从某学期开课页进入后只显示该学期评价，导致历史评价存在但用户误以为课程没有评价。
- **决策**：课程评价浏览入口采用 `/courses/<course>/reviews` 的课程级路径，默认聚合该 canonical course 的全部评价；每条评价继续通过后端 `CoursePostOfferingTarget` 关联具体 `CourseOffering` 并显示学期。写评价仍要求确定开课学期，旧 `/reviews/<semesterTag>` 地址保留兼容跳转。
- **理由**：课程评价的主要用途是帮助选课，历史体验需要集中发现；学期仍是评价的重要上下文，但不应成为默认的信息隔离边界。使用结构化 offering target 查询也避免把论坛标签当作课程开课事实。
- **相关文档**：`PRODUCT.md`、`pages/courses/[id]/reviews/index.vue`、后端 `app/routes/course.py`

## ADR-009：用户认证仅保留学校 SSO

- **日期**：2026-08
- **状态**：已采纳
- **背景**：学校 OIDC 已在正式域名完成联调。继续提供 UniKorn 帐密登录、自助注册与密码恢复会形成重复身份入口，并保留不必要的密码处理与攻击面。
- **决策**：登录页只展示 HKUST(GZ) SSO；旧注册、忘记密码与重置密码 URL 跳转到登录页；后端旧帐密认证端点统一返回 `410 sso_only`。保留已有用户与外部身份关联数据，不删除密码字段；JWT 刷新/登出继续承载站内会话，邮箱验证仅用于已登录用户维护联系邮箱。
- **理由**：所有登录身份统一由学校认证，减少凭据泄露、弱密码、撞库和账号重复风险；保留数据结构和现有会话机制可避免破坏用户内容与 OIDC 账号关联，并为安全回滚留下空间。
- **相关文档**：`pages/login/index.vue`、`composables/useAuth.ts`、后端 `app/routes/auth.py`、`back-end/docs/campus-sso.md`

---

*模板（新决策追加时使用）：*

```markdown
## ADR-0XX：<决策标题>

- **日期**：YYYY-MM
- **状态**：已采纳 / 提议 / 已废弃
- **背景**：<问题与约束>
- **决策**：<做了什么选择>
- **理由**：<为什么这样选，代价与收益>
- **相关文档**：<链接>
```
