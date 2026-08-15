# 排课功能 UI/UX 优化 —— 开发决策记录与计划草稿

> 状态：草稿（决策记录）
> 日期：2026-08-14
> 范围：仅排课功能（`/schedule` → `/courses/planner` 及 dashboard/map）的 UI/UX 优化

---

## 1. 背景

原独立项目 `CoursePlan.search`（Next.js + Tailwind + next-themes）已迁移进 uniKorn 主站"课程"板块（Nuxt 3 + SCSS 主题变量），原项目弃用。迁移版"UI 效果和使用体验远不如从前"，在选课开始前需要完善。

迁移相关文档：
- `docs/superpowers/specs/2026-06-01-schedule-parallel-migration-design.md`
- `docs/superpowers/plans/2026-06-01-schedule-parallel-migration.md`

---

## 2. 已确认的决策

### 决策一：本阶段优先级 = 排课功能 UI/UX

只优化"排课"功能（planner / dashboard / map）的 UI/UX 与用户体验。其他板块（课程宇宙、课程探索、学术地图）本阶段不做，后续再优化。

### 决策二：风格基准 = 复刻原排课助手 UI，并重构优化

- 原排课助手 UI 相对简洁、信息层级清晰，比主站"卡片过多、线条过多"更清爽
- 主站风格与排课助手风格有差异，但**以原排课助手为基准复刻**
- 细节上考虑重构与优化（不机械照搬）

### 决策三：交互细节基准 = 保留原版设计，代码层重构

迁移过程改掉了许多原版经过设计的交互细节，例如：
- 暗屏 + emoji 提示（提示弹层）
- 右下角的操作按钮

**保留**这些原版细节设计，**代码层面**可以重构优化。

### 决策四：dark mode = 先修主站全局主题系统

- 原排课助手支持 light/dark（next-themes + Tailwind `dark:`）
- uniKorn 主站当前**只支持 light**，dark mode 缺失/坏掉
- 决定：**先修复主站全局主题系统**，排课板块使用全局主题（一步到位，而不是排课板块内单独做开关）

### 决策五：第一步聚焦 = 排课工作台 dashboard

UI 复刻的第一步聚焦**排课工作台 dashboard**（搜索 / 课表 / 购物车 核心工作区，工作量最大），而不是先做学期选择页或地图。

---

## 3. 现状摸底（调研记录）

### 主站主题系统现状（dark 缺失原因）

| 文件 | 现状 |
|------|------|
| `utils/themes.ts` | **只定义了 1 个主题** `keguang-blue`（category=light）；`docs/THEME_SYSTEM.md` 里写的 6 主题是旧文档，代码里已不存在 |
| `store/themeStore.ts` | `applyTheme()` 有 `if (!process.client) return`，初始化逻辑不完整 |
| `components/setting/ThemeSettings.vue` | 设置界面仍在（分类 tab / 主题网格），但 `availableThemes` 只有 1 个 → 界面残缺 |
| `assets/css/variables.scss` | 只有 `:root` 下科广蓝变量，无 dark 变量 |
| 原排课助手 | `CoursePlan.search/src/components/darkmode-toggle.tsx` 用 next-themes 实现真正的 light/dark 切换 |

### 排课迁移版结构

- 页面：`pages/courses/planner/index.vue`（学期选择）、`pages/courses/planner/[semester].vue`、`pages/schedule/*`（重定向）
- 组件：`components/scheduler/`（Dashboard 664 行、Timetable 389、CartPanel 475、SidePanel 364、Map 289 等）
- 逻辑：`utils/scheduler.ts`、`utils/schedulerCart.ts`、`utils/schedulerAsync.ts`（纯函数，有测试）
- 测试：`tests/scheduler/`（12 个文件）
- i18n：`i18n/locales/{zh,en}.json` 的 `scheduler.*`（zh 154 个 key）

### 原排课助手参考实现

- `CoursePlan.search/src/app/(main)/dashboard/`（学期卡片、side-panel、cart-panel、timetable、bottom-panel）
- `CoursePlan.search/src/app/(main)/map/`（draw.tsx、map.tsx）
- `CoursePlan.search/src/components/darkmode-toggle.tsx`

---

## 4. 建议的工作路径（供后续细化成正式 plan）

### 阶段 0：基线确认
- [ ] 跑通现有测试与构建，确保基线干净
- [ ] 对照原版，产出排课 UI 差异清单（哪些细节被迁移改掉）
- [ ] 确认 dark 主题配色细节（见"待确认"）

### 阶段 1：dark mode 修复（地基）
- [ ] 在主题系统补一个 dark 主题配置（深色背景 + 科广蓝蓝色系强调色，与 light 同源）
- [ ] 修复 `themeStore` / `applyTheme` / `ThemeSettings` 的残缺逻辑
- [ ] 排课板块 + 全局正确响应主题切换

### 阶段 2：排课 UI 复刻 + 重构（核心，分步）
- [ ] dashboard 工作台：搜索、课表、购物车、求解（第一步）
- [ ] 学期选择页（planner 首页）
- [ ] 地图 map
- 全程用主题 CSS 变量（遵守 `docs/THEME_SYSTEM.md` / `CLAUDE.md`），每步独立可验收

### 阶段 3：体验增强（有余力）
- [ ] 骨架屏 / 加载态、移动端适配、空状态文案等

---

## 5. 待确认事项

- [ ] **dark 主题配色风格**（默认建议：深色背景 + 保留主站科广蓝蓝色系作为强调色）
- [ ] 复刻时哪些原版细节**可以适度重构**（避免机械照搬的清单，随差异清单产出）
- [ ] 其他新功能/UI 增强（用户测试后补充）

---

## 6. 参考与约定

- 开发流程遵循 `AGENTS.md`（本仓库工作流规范）
- 组件样式必须使用主题 CSS 变量，禁止硬编码颜色（`CLAUDE.md`）
- UI 文案必须走 i18n（`i18n-guidelines.md`），合并前 `npm run i18n:check`
- 提交前 `npm test` + `npm run build`
- 每个独立小步单独验收、单独 commit（用户同意后）
