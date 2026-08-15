# 排课功能 UI/UX 优化 —— 开发决策记录与计划草稿

> 状态：进行中（阶段 1 ✅ / 阶段 2 Step 1-3 ✅，Step 4 课程信息 hover 小浮窗待做）
> 日期：2026-08-14（2026-08-15 补充细化）
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

### 决策六（2026-08-15 补充）：侧边栏空间紧张 → 功能按钮收敛到底部小栏

- 右侧侧边栏空间紧张，希望大部分区域都是**课程卡片**内容，功能按钮不应占据过多空间
- 原版设计正是如此：顶部只留紧凑 tabs，功能按钮（Filter / Menu / Cart）集中到底部一小栏
- 当前迁移版在顶部放折叠面板 + 按钮，占空间较多 → **重构为底部小栏 + 浮层**
- 具体：display options 从顶部 details 面板移入 Menu 浮层；Filter 加 hover tooltip 说明；popularity note 先移除（后续再说）

### 决策七（2026-08-15 补充）：课程信息 = hover 小浮窗

- 课程信息交互从"居中弹窗"改为 **hover ℹ️ 图标显示小浮窗**（复刻原版），替代 `SchedulerCourseDetail` 弹窗
- 复用现有异步 `getCourseDetail` 加载 + request tracker 逻辑，只改展示方式
- 课表（timetable）内的 hover 浮窗**暂不做**，后续再评估
- 触发位置：侧边栏课程卡上的 ℹ️ 图标（避免滑过整卡频繁弹窗）

### 决策八（2026-08-15 补充）：不机械复刻，允许优化

- 以原版为基准，但**不机械照搬**；发现更好的设计方案 / 可改进点，先与用户讨论
- 重点沟通场景：用户体验与交互逻辑（何时 hover、浮层位置、按钮布局等）

---

## 2.1 阶段 1 完成记录（2026-08-15）

- commit `5cec45b`：新增 `deep-dark` 深邃黑主题、修复主题管线（themeStore / ThemeSettings / FOUC）、修复 `KeguangContainer` 硬编码背景（排课页面 dark 背景根因）
- 排课板块使用全局主题变量，dark 下背景正确

---

## 2.2 排课工作台 dashboard 差异清单（当前迁移版 vs 原版）

| # | 差异点 | 原版（决策要求保留） | 当前迁移版 | 处理 |
|---|--------|---------------------|-----------|------|
| 1 | 求解提示 | 全屏暗遮罩 + emoji（😉 info / 😲 warning / 😢 error）+ 大标题 + 副文案 | 仅顶部一条通知条 | **复刻暗屏弹层** |
| 2 | 侧边栏底部按钮组 | Filter/Menu/Cart 可扩展按钮（hover 展开文字）+ Filter tooltip | 顶部两个普通胶囊按钮 + details 面板 | **重构为底部小栏 + 浮层** |
| 3 | 课程信息 | hover ℹ️ 显示小浮窗 | 居中弹窗 | **改为 hover 小浮窗** |
| 4 | 方案 slider | 可拖动 + tooltip + spring 动画 | 仅点击跳转 | 增强拖动 |
| 5 | display options 入口 | Menu 浮层（SettingsMenu） | details 折叠面板 | 移入 Menu 浮层 |
| 6 | 登录横幅 | 顶部渐变横幅 + Log in 链接 | warning 通知条，无登录链接 | 补登录链接 |
| 7 | 搜索弹层 | 每项 loading/success/fail 状态图标 | 仅 pending 禁用 | 补状态反馈 |

搜索弹层、课程卡、课表主体功能已齐备，差异集中在交互细节与视觉层级。

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
- [x] 跑通现有测试与构建，确保基线干净
- [x] 对照原版，产出排课 UI 差异清单（§2.2）
- [x] 确认 dark 主题配色细节（深邃黑 `deep-dark`，用户选定）

### 阶段 1：dark mode 修复（地基）✅ 已完成（commit `5cec45b`）
- [x] 新增 `deep-dark` 主题配置（深色背景 + 科广蓝蓝色系强调色，与 light 同源）
- [x] 修复 `themeStore` / `applyTheme` / `ThemeSettings` 的残缺逻辑
- [x] 排课板块 + 全局正确响应主题切换

### 阶段 2：排课 UI 复刻 + 重构（核心，分步，正在执行）

**Step 1：暗屏 + emoji 提示弹层** ✅ 已完成
- [x] `planMessage` 升级为分级状态（info 😉 / warning 😲 / error 😢），映射现有 solver 状态（empty-cart→info、all-disabled→warning、unavailable-layer/no-solution/search-limit→error、truncated→info）
- [x] 新增全屏暗遮罩弹层（主题变量 `--overlay-backdrop/--overlay-text`，pointer-events-none，覆盖 dashboard，不盖 cart-panel 弹层）
- [x] i18n：为每个状态新增 Title key（描述沿用现有 key），保留 `planCountTruncated/planCountIncomplete/plansTruncated/searchLimited`（测试契约）
- [x] 暗屏显示时隐藏 guestHint / popularity 通知条，避免重叠

**Step 2：侧边栏布局重构 —— 功能按钮收敛到底部小栏** ✅ 已完成
- [x] 顶部：只留紧凑 tabs（Main/KLMS）+ 学分一行
- [x] 中部：课程卡片列表（空间最大化），移除顶部 details 折叠面板和 popularity note
- [x] 底部：一行小按钮栏 = Filter / Menu / Cart（原版 ExpandableButton：hover 展开文字标签，不占高度）
- [x] display options 移入 Menu 浮层（原版 SettingsMenu，点击外部关闭 + 200ms 防误触）
- [x] Filter 加 hover tooltip 说明浮层（原版 FilterTip："编辑模式可点击课表屏蔽时段"）
- [x] 遮罩只覆盖课表卡片区域（复刻原版），侧边栏保持可见；修复 `.side-panel` / `.timetable-card` 定位（`position: relative`）确保浮层/遮罩定位正确
- [x] 三个底部按钮等宽（`flex: 1`）；移除课表空状态文字（"课表还没有课程…"），由遮罩承担全部提示职责

**Step 2.5：暂移除项（2026-08-15）** ✅ 已完成
- [x] **顶部"验证账号邮箱后即可查看匿名课程热度信号"通知条已移除**（`popularity.forbidden` 触发的 `popularityVerifiedOnly` 通知）
  - 原因：顶部通知过多，与 guestHint 等并存时干扰；热度提示方案待整体重新设计
  - 现状：`popularityVerifiedOnly` i18n key 保留（zh/en 一致，未删除），`popularity.forbidden` 逻辑仍由 composable 计算，仅 UI 不再展示
  - 待办：后续统一设计热度信号的可达性提示（登录横幅内嵌 / 课程卡内提示等），届时再决定该 key 去留
- [x] 课表空状态文案（`emptyTimetableTitle/Description`）已移除，i18n key 已删除；若后续需要课表空状态提示，重新设计（如结合遮罩）

**Step 3：左侧课程表 + 底部控制栏 UI/交互复刻**（2026-08-15 用户调整优先级，先于原 Step 3；复刻原版 `timetable.tsx` + `bottom-panel.tsx`）✅ 已完成
- [x] 整体布局：去掉 `dashboard__timetable-card` 圆角矩形卡片效果（border/radius/shadow/背景），`.timetable` 去掉自身 border/radius，`.bottom-panel` 去掉 border/radius/背景；遮罩 overlay 圆角同步去掉
- [x] 时间刻度线对齐：标签中线对齐水平刻度线（`top = header - rowHeight/2 + i*rowHeight`）；补末尾 21:00 标签（原版 9 个 vs 当前 8 个）
- [x] 网格线：header 底边加粗 3px、行/列线加粗 2px（复刻原版视觉层级）
- [x] 周六/周日课程：确认 `getMaxDayNum` 已支持（`max(5, 最大day)` + `v-for="d in maxDayNum"`），切换方案时列数联动
- [x] 卡片 hover 自动展开：JS 测量内容高度 → 高度动画展开 + z-index 提升 + 大阴影（`--shadow-large`）
- [x] 卡片配色复刻原版浅色方案：`getCourseColor` 改为浅底（light: sat40/light85；dark: sat25/light70）+ 深色文字 `hsl(hue,sat,30%)`；新增 `getCourseTimetableColors` 返回 background/text/accent（纯函数 + 单测）
- [x] 底部按钮：去掉边框/背景（纯 icon + hover 变色）、换内联 SVG 大图标（skip-start/caret-left/caret-right/skip-end）
- [x] 中间计数器：加数字图标 + 大号索引（复刻原版 `text-3xl` 数字）
- [x] slider：占满宽度（去掉 `max-width: 440px`）
- [x] slider 交互：mousedown 定位 + window mousemove/mouseup 拖拽 + 拖动时 tooltip 显示索引 + thumb 放大（spring 过渡用 CSS transition 近似）

**Step 3.5：图标方案统一（lucide，2026-08-15）** ✅ 已完成
- [x] 主站图标现状调查：无统一图标库，混用 `<Icon>`（@nuxt/icon 内置，无本地图标集时从远端 iconify API 拉取，离线空白）/ `<iconify-icon>` / Unicode 字符 / 内联 SVG
- [x] `npm i -D @iconify-json/lucide` 安装本地图标集；@nuxt/icon 自动发现（build 输出 `discovered local-installed 1 collections: lucide`，icons.mjs 566 kB 打进 server bundle）
- [x] 排课板块 11 处图标全部统一为 `<Icon name="lucide:xxx">`（timetable：list/map-pin/user/clock；side-panel 底部：sliders-horizontal/menu/shopping-cart；bottom-panel 控制条：skip-back/chevron-left/chevron-right/skip-forward）
- [x] **裸名称修复**：`<Icon name="map-pin">` 会被 Iconify 解析成 `map:pin`（错误集合），`list` 等简单名解析成空前缀，全部加载失败；必须用 `lucide:` 前缀
- [x] **devProxy 劫持修复**：`nuxt.config.ts` 加 `icon.localApiEndpoint: "/_nuxt_icon"`（nitro devProxy 在 listener 层拦截所有 `/api/*`，默认 `/api/_nuxt_icon` 被转发到后端而 404）
- [x] lockfile 双同步：`package-lock.json`（npm install --package-lock-only）+ `pnpm-lock.yaml`（python 精确插入 3 处 lucide 条目，避免 pnpm 全量重解析产生 1500+ 行无关 diff）
- [x] 验证：dev/prod 的 `/_nuxt_icon/lucide.json?icons=...` 均 200；SSR 正确内联 CSS 图标；`i18n:check` / `npm test` 185/185 / `npm run build` 全绿
- [ ] 遗留：全站还有 ~48 处其他组件裸 `<Icon name>`（matching 等）同样存在解析问题，依赖远端 API，离线空白；不在本阶段范围，建议后续跟进

**Step 4：课程信息 hover 小浮窗**
- [ ] 课程卡 ℹ️ 图标 hover → 异步 `getCourseDetail` → 小浮窗（title/code/学分/简介/pre·co-requirement/exclusion）
- [ ] 复用现有 `detailRequests` request tracker + loading/error 状态
- [ ] 替代 `SchedulerCourseDetail` 居中弹窗（组件可删除或保留待用）
- [ ] 浮窗位置自适应（靠近图标、防溢出视口），鼠标离开图标/浮窗关闭

**收尾（每步独立验收）**
- [ ] 每步完成后 `npm run i18n:check` + `npm test` + `npm run build`
- [ ] 每步独立 commit（用户同意后）

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
