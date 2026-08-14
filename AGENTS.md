# Agent 工作流规范（front-end / UniKorn 前端）

> 本文档定义 AI Agent 在本仓库（`front-end`）中开发时应遵循的工作流程、代码规范、环境配置、文档更新与汇报要求。
> 配套文档：`CLAUDE.md`（前端开发笔记）、`CHANGELOG.md`（正式变更日志）、`docs/architecture.md`（架构决策记录）。

---

## 1. 核心原则

1. **保持文档新鲜**：修改代码前或造成行为变更后，及时更新相关文档（CHANGELOG / architecture / 相关 docs）。
2. **代码可维护**：遵循本文档与 `CLAUDE.md` 中的代码规范，确保代码清晰、易读、易测试。
3. **变更可追溯**：所有用户可见或重要的变更记录在 `CHANGELOG.md`；重要技术决策记录在 `docs/architecture.md`。
4. **及时沟通**：遇到需求不清晰、破坏性变更或不确定的取舍时，先与用户讨论，不要自作主张。
5. **质量内建**：提交前通过 `npm run i18n:check`、`npm test`、`npm run typecheck`（如可用）与构建检查。
6. **重要 Git 操作必须询问**：禁止自动执行 `git commit`、`git push`、合并、开 PR 等操作，交由用户执行或取得明确确认后再执行。
7. **小而可审阅的变更**：优先拆分 PR/branch 而不是一次性大改；每个分支聚焦一个主题。

---

## 2. 环境与构建

### 2.1 本地环境

- 框架：Nuxt 3（SSR）+ Vue 3 + TypeScript + SCSS
- 包管理器：npm（仓库同时维护 `package-lock.json` 与 `pnpm-lock.yaml`；新增依赖时两者保持一致）
- 要求 Node.js 版本与 CI 一致（见 `.github/workflows/frontend-ci.yml`，当前为 Node 22）
- 本地开发 API：默认 `http://localhost:8000`（由 `nuxt.config.ts` 中 `NUXT_PUBLIC_API_BASE_URL` 控制；后端未启动时可通过 `.env` 指向 `https://dev.unikorn.axfff.com`）

### 2.2 常用命令

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖（注意 lockfile 保持对齐） |
| `npm run dev` | 启动开发服务器 `http://localhost:3000` |
| `npm run build` | 生产构建（SSR） |
| `npm run preview` | 本地预览生产构建 |
| `npm test` | 运行 Vitest 单元/集成测试 |
| `npm run test:scheduler` | 仅运行排课助手测试 |
| `npm run i18n:check` | 检查 i18n key 完整性 + 扫描硬编码字符串（**合并前必跑**） |
| `npx nuxi prepare` | 重新生成 Nuxt 类型 |

### 2.3 CI 门槛（合并前必须本地通过）

`.github/workflows/frontend-ci.yml` 在 PR 时执行：

```bash
npm ci
npm run i18n:check
npm test
NUXT_PUBLIC_APP_BUILD_VERSION="${GITHUB_SHA}" npm run build   # 产物构建
docker build ...  # 生产镜像可构建、以 node 用户运行、带健康检查
```

Agent 提交前至少要本地通过 `npm run i18n:check`、`npm test` 与 `npm run build`。

---

## 3. 文档体系

| 文档 | 位置 | 职责 | 维护时机 |
|------|------|------|----------|
| `README.md` | 仓库根 | 项目简介、技术栈、快速开始、目录结构、文档索引（写给用户） | 结构或用法变更时 |
| `CHANGELOG.md` | 仓库根 | 正式的版本变更日志（Keep a Changelog 风格，唯一权威） | 每次合并用户可见变更时 |
| `CLAUDE.md` | 仓库根 | 前端开发笔记：主题、认证、上传、导航系统、易错点 | 代码约定/踩坑变化时 |
| `docs/architecture.md` | 仓库根 | 重要技术决策及理由（ADR） | 每次架构级决策时追加 |
| `docs/THEME_SYSTEM.md` | 仓库根 | 主题系统设计 | 主题相关改动时 |
| `docs/i18n-guidelines.md` | 仓库根 | 国际化规范 | i18n 相关改动时 |
| `docs/superpowers/plans`、`specs` | 仓库根 | 大型功能的计划与设计文档（计划驱动开发） | 大型功能开始前 |
| `deploy/README.md` | 仓库根 | 部署机制（原子发布、PM2） | 部署相关改动时 |

> 临时进度、待办、注意事项请记录在仓库外的草稿文件或与用户约定的位置，**不要提交进仓库**。历史变更只进 `CHANGELOG.md`。

### 3.1 大型功能开发模式（计划驱动）

对跨多文件、多阶段的功能（如排课助手迁移、课程宇宙渲染、Admin 控制台）：

1. 先写 `docs/superpowers/specs/<date>-<slug>-design.md`（设计，含目标/范围/架构/数据模型/验收标准）；
2. 再写 `docs/superpowers/plans/<date>-<slug>.md`（任务清单，每步用 `- [ ]` 可勾选跟踪）；
3. 按计划逐任务实现，每完成一批任务同步跑测试并汇报；
4. 计划文档保留勾选痕迹，作为执行记录。

---

## 4. 开发流程

### 4.1 标准工作流

0. **开始任务前**：先与用户讨论清楚需求细节与验收标准，再从最新 `main` 新建 branch（命名：`agent/<简短主题>`，如 `agent/course-section-polish`）；不要直接在 `main` 上开发。
1. **理解**：阅读相关文档（README / docs / superpowers 计划 / CLAUDE.md）与相关代码；有不清晰或待决策之处，及时向用户提出。
2. **计划**：拟订开发计划，明确任务顺序与依赖；较大功能按 §3.1 产出计划文档。
3. **实现**：按计划逐步实现；遵守 §4.2 代码规范；每个阶段完成后测试并汇报。
4. **测试**：同步编写/更新 Vitest 单元测试与集成测试（新增逻辑尽量写成纯函数以便测试）；本地跑 `npm test` 与 `npm run i18n:check`。
5. **验收**：功能完成后交给用户验收测试，确认符合预期。
6. **记录**：验收通过后，将实际变更写入 `CHANGELOG.md`（必要时补充 `docs/architecture.md`）。
7. **提交**：按用户指令执行 `git commit` / 合并 / push（重要 Git 操作必须先询问）。

### 4.2 代码规范

#### 通用（front-end）

- **主题变量**：所有新组件必须使用 CSS 自定义属性（`var(--surface-primary)`、`var(--text-primary)`、`var(--border-primary)`、`var(--shadow-small)` 等），**禁止硬编码颜色**。详见 `docs/THEME_SYSTEM.md` 与 `CLAUDE.md`。
- **国际化**：UI 文案一律进 `i18n/locales/{zh,en}.json`，使用语义化 key（如 `courses.*`、`scheduler.*`）；禁止硬编码界面字符串；用户生成内容保留原文。详见 `docs/i18n-guidelines.md`。
- **API 调用**：一律走 `useApi()` 的 `fetchWithAuth` / `fetchPublic`，**禁止直接 `fetch()`** 调用后端（401/令牌刷新问题）。例外：认证端点（`useAuth.ts`）、无需认证的公开端点、OSS 直传等。
- **组件命名**：Nuxt 自动导入按目录前缀命名（`components/home/Pinned.vue` → `<HomePinned>`）。**不要**把模板引用改成与文件名一致，这会破坏导航等系统。修改布局/导航后必须回归测试导航栏。
- **渐进增强**：新功能优先叠加在既有系统之上（分层优先、props 兜底、降级策略），而不是替换既有行为。
- **类型**：使用 TypeScript，新增 DTO/工具函数提供类型定义；`definePageMeta({ layout: 'keguang' })` 用于页面布局。
- **测试**：纯逻辑（求解器、购物车、坐标计算、适配器等）写在 `utils/*.ts` 并配 `tests/**` 单测；Vue 组件保持薄交互层。

#### 文档更新要求

| 变更类型 | 需更新的文档 | 注意事项 |
|----------|--------------|----------|
| 用户可见功能 / 修复 | `CHANGELOG.md` | 清晰不啰嗦，一句话概述；必要时链接相关 PR/文档 |
| 架构级决策 | `docs/architecture.md` | 记录背景、方案、理由、备选 |
| 结构 / 用法变化 | `README.md` | 保持目录与命令准确 |
| 代码约定 / 踩坑 | `CLAUDE.md` | 沉淀教训供后续 agent 复用 |
| 大型功能 | `docs/superpowers/` | 先 spec 后 plan，按计划执行 |

### 4.3 Git 提交规范

```
[<type>](<optional-scope>): <subject>
```

**type**：`feat` | `fix` | `docs` | `test` | `refactor` | `perf` | `build` | `ci` | `chore`

- 统一使用英文；简明扼要一句话，无需句号结尾。
- 示例：`feat(article): add publish API with review option`
- 可参照仓库历史提交记录（如 `fix: harden scheduler cart reconciliation`）保持风格一致。
- 由 AI Agent 生成的提交需附带 `Generated with Continue` co-author 信息：

```bash
git commit -m "docs: ...
Generated with [Continue](https://continue.dev)

Co-Authored-By: Continue <noreply@continue.dev>"
```

- **重要 Git 操作（commit/push/merge/PR）必须先征得用户同意。**

---

## 5. 前端仓库结构速览

```
front-end/
├── app.vue                 # 根组件
├── nuxt.config.ts          # Nuxt 配置（模块、i18n、路由规则、devProxy、运行时配置）
├── assets/css/             # 全局 SCSS（variables/global/transitions）
├── components/             # 可复用组件（home/layout/forum/courses/scheduler/...）
├── composables/            # useApi、useAuth、useAppLocale、useScheduler、useSchedulerCart 等
├── i18n/locales/           # zh.json / en.json
├── layouts/                # keguang 等布局
├── middleware/             # auth / admin 路由守卫
├── pages/                  # 页面（courses、schedule、forum、admin、...）
├── plugins/                # iconify / theme / pwa 客户端插件
├── public/                 # 静态资源、PWA manifest
├── server/                 # Nitro server routes（/health 等）
├── store/                  # Pinia store（自动导入）
├── tests/                  # Vitest（scheduler/courses/course-universe/academic-map/deploy）
├── utils/                  # 纯逻辑：scheduler.ts、schedulerCart.ts、courseUniverse.ts 等
├── docs/                   # 文档（CLAUDE、THEME_SYSTEM、i18n、superpowers 计划与设计）
├── deploy/                 # 原子发布脚本与说明
└── version.ts              # 版本号与版本历史
```

**关键页面**：`/courses`（课程宇宙/课程探索/规划器）、`/schedule`（排课助手，重定向到 `/courses/planner`）、`/forum`（论坛）、`/admin`（管理后台，SSR 关闭）。

---

## 6. 排课助手 / 课程板块背景（重要）

- 原独立项目 `CoursePlan.search`（Next.js）已并入 uniKorn 的"课程"板块，原项目弃用。相关迁移设计/计划见 `docs/superpowers/`：
  - `2026-06-01-schedule-parallel-migration(-design).md`
  - `2026-06-02-course-universe-complete-graph-rendering(-design).md`
- 迁移后入口：`/schedule` → `/courses/planner`；`/courses` 提供课程宇宙、探索、规划器、学术地图等。
- 后续工作聚焦"课程"板块的 UI 与体验完善：**开发前务必先对照原 CoursePlan.search 行为（参考实现）**，确保功能与交互对齐，并保持主题变量、i18n、`fetchWithAuth/fetchPublic`、组件命名等既有约定。
- 不要把 UI 效果与体验问题归咎于原实现而推倒重写；采用渐进增强与回归测试的方式改进。

---

## 7. 常见坑（源自 CLAUDE.md 沉淀）

1. **401 错误**：检查是否用了 `fetchWithAuth`/`fetchPublic` 而非直接 `fetch`。
2. **导航栏消失**：检查组件引用命名（`<HomePinned>` 而非 `<Pinned>`），勿改自动导入命名。
3. **图片不显示**：检查 OSS 签名 URL 生成、CORS、URL 过期（`UserAvatar` 已内置自动刷新）。
4. **图标缺失**：Font Awesome 不可靠时使用 Unicode fallback（✏️ ✓ ✕ 📷 👤）。
5. **i18n 漏翻**：新增页面先补 `zh.json`/`en.json` key，跑 `npm run i18n:check`。
6. **颜色硬编码**：新样式必须用主题 CSS 变量。

---

*Last updated: 2026-08-14*
