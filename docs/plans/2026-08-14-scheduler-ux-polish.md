# 排课功能 UI/UX 优化 —— 开发决策记录与计划草稿

> 状态：进行中（阶段 1 ✅ / 阶段 2 Step 1-3 ✅ / Step 4 ✅ 代码完成 / Step 5 ✅ 代码完成）
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

### 决策九（2026-08-15 补充）：Step 4 = 整个右侧侧边栏 UI/UX 改进

- Step 4 不只做 hover 小浮窗，而是**整个右侧侧边栏的设计改进**
- 设计宗旨：**侧边栏位置紧张，在展示必要信息（不牺牲可读性）的同时尽可能压缩卡片高度**
- 复刻原排课助手 side-panel 布局；有更好方案可提出讨论

### 决策十（2026-08-15 补充）：热度显示粒度收敛

- **出于 UI 设计与隐私考虑**：
  - **不在课表（timetable）卡片显示热度**（移除 compact badge）
  - **不显示 bundle / section 级热度**（移除 bundle 胶囊内每个 section 两行 badge）
  - **只在课程卡头部显示课程级总热度**，极简样式：`[flame icon] 30/8`（looking/scheduling）
- 数据粒度说明：后端只有课程级 + section 级，无 layer/bundle 级；bundle 级需前端聚合
- 热度语义：关注中（looking）= 购物车中停用该课；正在排课（scheduling）= 购物车中启用该课；均为匿名排课意向信号，不是选课注册人数

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

**Step 4：右侧侧边栏整体 UI/UX 改进（含 hover 信息浮窗）**（2026-08-15 范围扩大，决策九）✅ 代码完成（待视觉验收）
- [x] **课程卡头部压缩**（对齐原版 side-panel）：
  - 第一行小字 `CODE · N Credits`，第二行 title 大字（替代当前 code 大字 + title + credits 徽章三件套）
  - `Details` 文字按钮 → ℹ️ 图标（hover 信息浮窗入口）；状态圆点保留
  - 热度改为极简 `[flame] 30/8`（课程级总热度，决策十）；移除 History 按钮（入口后续单独设计）
- [x] **Bundle 区域压缩**（对齐原版）：
  - 移除每层 `Layer N` 标题行 + All/None 文字按钮 → 单行胶囊 + 右侧 `layers-plus`/`trash` 小图标按钮（title/aria-label 用 `scheduler.all`/`scheduler.none`）
  - 移除 bundle 内 section 级热度（决策十）
- [x] **2026-08-15 视觉验收反馈（4 条）**：
  - **credit/credits 统一英文**：`scheduler.credits` / `scheduler.creditsShort` 的中文文案改为英文（`{count} credit | {count} credits` / `{count} cr`），不再翻译为"学分"
  - **credit 按学分数分色**：新增主题变量 `--credit-level-1..6`（light/dark 两套），课程卡与信息浮窗的 credit 文本按 `creditColorVar()` 上色（1→emerald、2→cyan、3→sky、4→indigo、5→fuchsia、≥6→rose）
  - **热度与 meta 行对齐**：`SchedulerPopularitySummary` 保留在 meta 行（`CODE · credits · [flame]`），`align-self: center` 垂直居中于 meta 行、`margin-left: 8px` 离左侧内容远一点（原 `margin-left: 2px` 且作为 inline-flex baseline 对齐，视觉上偏上未对齐）
  - **code/credits/popularity 垂直居中**：`course-card__meta` 从 `align-items: baseline` 改为 `center`（复刻原版 `flex items-center`）——baseline 对齐下 credits（12.96px）比 code（14.4px bold）低约 2px，视觉未对齐；改为 center 后三者垂直中线完全一致
  - **全选/全不选图标不显示修复**：根因是全局 `button { min-height:44px; padding:0.75rem 1rem }` 覆盖了紧凑按钮尺寸，且 `:deep(svg)` 无法匹配 `@nuxt/icon` css-mode 渲染的 `span.iconify`（mask 图标），图标被挤压成 0 宽。修复：按钮加 `min-height:0; padding:0; flex-shrink:0`，`font-size:15px` 驱动图标 1em 尺寸；图标改为 `lucide:layers-plus` / `lucide:trash`
- [x] **2026-08-15 视觉验收反馈第 2 轮（5 条）**：
  - **bundle 按钮圆角**：`border-radius` 从 `999px`（胶囊）降为 `8px`（原版 `rounded` 为 4px，取折中）
  - **selected 态去橙色边框**：移除 `--semantic-warning` 边框 + 外圈 ring；selected 与 active 的区分改为**底色/边框加深变色**（bg 12%→26%、border 40%→72% 的交互主色） + 保留右上角琥珀色圆点（原版即 amber dot）
  - **hover 交互提示增强**：课程卡片 hover 由"仅边框变色"改为"边框变交互色 + 背景 4% 蓝 tint"；bundle 胶囊 hover 由"10% 透明 tint"改为"背景加深 + 边框变交互色 + 文字变亮"（active 20% / selected 32%）；disabled 卡 hover 不变灰蓝（无交互误导）
  - **dark mode 文字对比度**：bundle active/selected 文字与侧边栏 tabs（主课表/KLMS）active 文字原先用 `--interactive-active`（dark=`#1a8fe0`，深蓝、对比不足）→ 新增主题变量 `--interactive-active-text`（light=`#1278c4` 不变 / dark=`#4db6ff` 亮蓝），tabs / bundle / menu-item / tip-state 的 tinted 背景上文字改用该变量
  - **disable/enable 差异**：disabled 课程卡由"仅去阴影 + 42% tint"改为"完整灰化"——`opacity: 0.62` + 纯 `--surface-secondary` 背景 + 灰边框 + code/title 降为 `--text-secondary`（参考原版 `opacity-60` + gray 边框/背景）
- [x] **2026-08-15 视觉验收反馈第 3 轮（dark 更亮 + disabled 弱化）**：
  - **范围确认**：用户选择"仅排课侧边栏交互元素（bundle 胶囊 / tabs 等）在 dark 下更亮，全局主题不动"
  - **bundle 胶囊状态重构为主题变量**：新增 `--scheduler-chip-*` 变量组（bg/border/text + active/selected/disabled × hover），light 保持原 tint 外观；dark 改为原版"贴纸"式：enabled = 亮蓝（pastel `#a8d8ff` 底 + 深蓝 `#0a3a66` 字，hover 更深）、selected = 更强蓝（`#7cc2ff`）、disabled = 灰块（`#5b6b85` 底 + `#22314a` 字，明显弱化）
  - **disabled bundle 弱化（两模式）**：默认态从 `--text-primary` 亮字改为 muted 灰字（light `--text-secondary` / dark `#22314a`）；**hover 不再发蓝**（原实现 disabled hover 变成 18% 蓝 tint，与 enabled 混淆）——改为灰色微变（light `#e8f1fb` / dark `#64748e`），disabled 与 enabled 靠色相（蓝 vs 灰）区分
  - **tabs（主课表/KLMS）dark 更亮**：active 改用 `--scheduler-tab-active-bg/text`——dark 下为实心交互蓝 `var(--interactive-primary)` + `var(--text-inverse)`（深字，参考原版 `dark:bg-indigo-400 dark:text-white`），light 保持原 tint 外观；inactive 增加 hover 底色反馈
  - **文字变量更亮**：dark `--interactive-active-text` 从 `#4db6ff` 提到 `#6cc5ff`（menu-item / tip-state / layer-actions hover 等 tinted 背景文字同步更亮）
  - 备注：期间发现早前 light `--interactive-active-text` 定义与 SidePanel tabs 修改意外丢失（工作区被外部回退），本轮已重新写入并统一改为 chip/tab 变量组，组件与变量一致性已用 grep 复核
- [x] **2026-08-15 视觉验收反馈第 4 轮（点击响应慢根因 = 写后确认，方案 A 乐观更新）**：
  - **根因**：登录用户 toggle 走 `mutateAuthenticated` = `await write()`（PUT 后端）→ `await reconcile()`（全量 GET 购物车），两次网络往返完成才更新 `courses.value` → UI 才亮/灭。游客模式反而乐观即时
  - **方案 A（用户选定）**：乐观更新 + 保留现有确认/安全网。三个 toggle（course/bundle/layer）在登录分支先同步应用 `setGuest*` 纯函数到 `courses.value`（点击即亮/灭），再入队原有 write + reconcile；`requiresReload/reloading` 时先抛 `blocked`（不乐观应用，避免 UI 与服务器不一致）
  - **行为**：正常路径 reconcile 用服务器值覆盖，与乐观值一致无感；写失败/歧义 → reconcile 拉回权威值（自动回滚）+ 现有错误横幅；reconcile 不可用 → 保持乐观值 + `requiresReload` 冻结变更 + 可 reload 拉回权威值
  - **测试**：`cart-refresh.test.ts` 更新——原"reconcile 不可用时保持先前稳定态"改"保持乐观值 + requiresReload"；新增"写 resolve 前本地已翻转"乐观契约测试；其余竞态契约（快速 All/None intent、跨 key 序列化、write 响应丢失 reconcile、GET 瞬时失败重试）全部保持通过
- [x] **课程信息 hover 小浮窗**（新增 `SchedulerCourseInfoPopover.vue`）：
  - ℹ️ 图标 hover → 异步 `getCourseDetail` → 小浮窗（title/code/学分/简介/pre·co-requirement/exclusion）
  - 复用 `createLatestRequestTracker` + loading/error/ready 三态（含 retry）
  - 替代 `SchedulerCourseDetail` 居中弹窗（Dashboard 的 `handleShowInfo`/`closeCourseDetail`/`selectedCourse`/`courseDetailStatus`/`showCourseDetail` 链路已删除；旧组件文件暂留，待用户决定是否删除）
  - 浮窗位置自适应（默认在图标下方、空间不足翻转上方/视口边缘 clamp）、Teleport 到 body 防侧边栏 `overflow:hidden` 裁剪、150ms 延迟关闭、watch courseCode/semesterId 变化时重置
- [x] **课表块**：移除 timetable 内 popularity compact badge（决策十；`SchedulerTimetable` 移除 `popularityByCourse`/`showPopularity` props，`SchedulerPopularityBadge` 组件不再被引用）
- [x] 新增 `SchedulerPopularitySummary.vue`：极简热度 `[flame icon] looking/scheduling`，title=`popularityExplanation`、aria=`popularityAriaLabel`
- [x] 测试更新：`popularity-ui.test.ts` 断言迁移到新契约（课表无 badge / 课程卡仅课程级热度 / History 入口移除但 Dashboard 链路保留）、`hardening-ui.test.ts` 详情加载失败断言改指向 `SchedulerCourseInfoPopover`

**Step 5：课程购物车（CartPanel）UI/UX 复刻**（2026-08-16）✅ 代码完成（待视觉验收）
- [x] **搜索框增强**：左侧 `lucide:search` 图标 + 右侧行内 `lucide:loader-circle` 旋转 spinner（搜索中显示），input flex 布局
- [x] **搜索结果每项状态反馈**（复刻原版 4 态）：per-code `actionStates`（idle/loading/success/fail）+ 自动恢复（success 1.2s / fail 1.8s 回 idle）；loading = 蓝色旋转 spinner、success = 绿色 `circle-check`、fail = 红色 `circle-x` + `cartFailed` 文案、idle = +/- 圆形按钮（`lucide:circle-plus`/`lucide:circle-minus` 替换文字字符）
- [x] **credit 分色**：搜索结果与购物车抽屉的 credit 均用 `creditColorVar()`（`--credit-level-1..6`，与 Step 4 课程卡/信息浮窗一致）；搜索结果 credit 从灰色徽章改为纯文字分色（对齐原版 `creditColor`）
- [x] **购物车抽屉重构**（用户选定复刻原版形态 + 点击外部关闭）：
  - 面板内叠加轻遮罩 `--drawer-backdrop`（light `rgba(26,42,74,.2)` / dark `rgba(0,0,0,.45)`）+ 底部悬浮卡片（`width: min(92%, 560px)`、圆角、向上投影）
  - 卡片结构：标题（`scheduler.cart`）+ `lucide:x` 关闭按钮 / 课程列表（code · credit 分色 + title + hover 蓝 tint）/ 底部 **Total Credits** 总计（`scheduler.totalCredits`）
  - 删除按钮改 `lucide:trash-2` 图标 + pending 时 spinner
  - **交互层级**：点击抽屉遮罩（`@click.self`）→ 关闭抽屉回面板；点击面板外（`cart-panel` `@click.self`）→ 关闭整个面板
- [x] **分页信息**：补 "共 N 条结果"（新增 i18n `scheduler.resultsCount`，zh `共 {total} 条结果` / en `of {total} results`）
- [x] Cart 按钮：加 `lucide:shopping-cart` 图标 + hover 边框/文字变色
- [x] 图标统一 lucide 本地集；新增 `@keyframes cart-spin` 旋转动画
- [x] 测试：`cart-panel.test.ts` 新增 5 个契约测试（三态反馈 / 抽屉遮罩+总计 / credit 分色 / 分页结果数 / 搜索图标+spinner），共 7 个全绿
- [x] i18n：`resultsCount` 新增（zh/en 同步），`i18n:check` 通过（1666 keys）
- [x] **2026-08-16 视觉验收反馈（3 条）**：
  - **credit 格式统一**：搜索结果与购物车抽屉的 credit 前加 `· ` 前缀（`CODE · N credits`），与侧边栏课程卡 meta 行格式一致
  - **+ − 按钮弱化**：从 40px 实心圆形（绿/红底白图标）改为 30px 透明描边图标按钮——`lucide:circle-plus`（交互蓝）/ `lucide:circle-minus`（错误红），与状态图标（circle-check/circle-x/loader）同族同尺寸（22px），hover 时 10% currentColor tint；透明度/风格统一不刺眼
  - **Cart 按钮位置**：从独占一行满宽按钮改为与分页**同一底部栏**——分页居中（flex:1 占位）、Cart 按钮靠右的紧凑胶囊（`lucide:shopping-cart` + "Cart (N)"，圆角 999px、交互蓝 tint 底）
  - 测试相应更新：`cart-panel.test.ts` 的按钮契约改为新样式（30px/透明/圆角/circle 图标），新增"footer 同排布局"与"credit 点号统一"契约，共 9 个全绿
- [x] **2026-08-16 视觉验收反馈第 4 轮（loading/success 状态图标相对 +/- 按钮右偏）**：
  - **根因**：+/- 按钮是 30px 宽容器（22px 图标居中占 4~26px），而 loading/success 状态图标是 22px 直接贴左（占 0~22px），视觉中心右移约 4px
  - **最终修复（status-slot 占位槽）**：loading/success 图标包进 `.cart-panel__status-slot`（`width/height: 30px; display:inline-flex; align-items/justify-content: center`），与 +/- 按钮几何完全一致，图标同样居中占 4~26px
  - **清理无效尝试**：此前的 `transform-origin: center center`（drawer spinner）等对旋转轴无实际作用的改动已回退；`lucide:loader-circle` 与 `mode="svg"`（真实内联 SVG，避免 mask 亚像素错位）保留——有独立价值且为测试契约
  - 测试更新：`cart-panel.test.ts` 新增 status-slot 契约断言（30px / 居中），9 个全绿
- [x] **2026-08-16 视觉验收反馈第 5 轮（科目标签改为硬编码常用两行）**：
  - **反馈**：搜索框下方的科目标签本意是"一点即选"快捷入口，但动态加载全部科目后标签过多，反而失去快捷作用
  - **方案（用户指定）**：移除动态加载，硬编码常用科目两行——第一行 `UFUG UCUG DLED`，第二行 `AIAA AMAT DSAA FTEC MICS ROAS SMMG`（`COMMON_SUBJECT_ROWS` 常量）
  - **改动**：移除 `getSubjects` / `subjectFilters` / `subjectRequests` tracker / `loadSubjectFilters` 及相关 watch；template 改为两行 `.cart-panel__subjects-row`（flex + wrap）；CSS `__subjects` 改纵向 column
  - 测试更新：`cart-panel.test.ts` 契约从"动态加载"反转为"硬编码两行"（含两行清单断言）；`hardening-ui.test.ts` 改为断言 `not.toContain('subjectRequests')`（无未受保护请求），193 全绿
- [x] **2026-08-16 视觉验收反馈第 6 轮（底部翻页按钮去边框 + lucide 图标）**：
  - **反馈**：底部翻页四个按钮无需边框，图标参考课程表控制栏（`SchedulerBottomPanel`）
  - **改动**：`&#171;`/`&#8249;`/`&#8250;`/`&#187;` 字符 → `lucide:skip-back`/`chevron-left`/`chevron-right`/`skip-forward`（复用现有 `scheduler.firstPlan/previousPlan/nextPlan/lastPlan` aria-label，无新 i18n key）；按钮样式对齐 bottom-panel——去边框/背景（`border: none; background: transparent`）、`min-height: 0` 防全局 button 样式覆盖、hover 变交互色（`--interactive-active`）、disabled `opacity: 0.3`
  - 测试更新：`cart-panel.test.ts` 新增"borderless lucide 翻页按钮"契约（4 图标 + 无边框断言），194 全绿

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
