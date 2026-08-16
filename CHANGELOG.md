# Changelog

本项目的所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。
本文件为本仓库唯一正式的变更日志（早期 0.1.x 记录已并入本文件）。

---

## [Unreleased]

### 主题系统

- **新增深色主题 `deep-dark`（深邃黑）**：深蓝黑背景 + 科广蓝强调色，与 `keguang-blue` 同源配色
  - 主题注册：`utils/themes.ts` 新增 `deep-dark` 配置（`category: 'dark'`），设置页 `/setting/theme` 深色分类可用
  - FOUC 防护：`app.vue` 内联脚本首屏前读取持久化主题设置 `data-theme`；`assets/css/variables.scss` 补充 `:root[data-theme='deep-dark']` 变量覆盖块
  - `themeStore.applyTheme()` 同步 `color-scheme`（原生滚动条/表单控件跟随）与 `data-theme` 属性
  - 修复 `ThemeSettings` 自动深色模式：`selectTheme('dark')` 引用不存在的主题 id、`removeEventListener` 传空函数失效、`onMounted` 判断恒为 false 三个 bug
  - 主题文档：`docs/THEME_SYSTEM.md` 更新当前启用的 2 个主题，早期设计的 6 个主题保留在"Planned / Not Yet Enabled Themes"（暂未使用）

### 课程板块（排课助手迁移与完善）

- **排课助手迁移**：将原 `CoursePlan.search` 的核心功能（课表求解、课程收藏、冲突检测）迁移进主站
  - 新增 `/schedule` 路由并重定向至 `/courses/planner`；课程板块入口统一到课程宇宙
  - 新增排课组件：`SchedulerDashboard`、`SchedulerTimetable`、`SchedulerSidePanel`、`SchedulerCourseCard`、`SchedulerCartPanel`、`SchedulerBottomPanel`、`SchedulerCourseDetail`、`SchedulerMap`
  - 新增纯逻辑模块：`utils/scheduler.ts`（多层求解器）、`utils/schedulerCart.ts`（购物车规范化）
  - 游客使用浏览器本地购物车，登录用户通过 JWT 接口持久化
  - 新增 `tests/scheduler/` 系列测试（solver、cart、geometry、async-state、popularity 等）
- **排课工作台 UI/UX 优化（第一阶段）**：复刻原排课助手的求解提示交互
  - 新增全屏暗遮罩 + emoji 求解提示（😉 信息 / 😲 警告 / 😢 错误），`SchedulerDashboard` 的 `planMessage` 升级为分级结构（标题 + 描述），替代原有顶部通知条
  - 新增主题变量 `--overlay-backdrop` / `--overlay-text` / `--overlay-text-secondary`（light/dark 同值，深底浅字）
  - i18n 新增 6 个求解状态标题 key（`emptyCartTitle` / `allDisabledTitle` / `unavailableLayerTitle` / `noSolutionTitle` / `searchLimitedTitle` / `plansTruncatedTitle`）
- **排课工作台 UI/UX 优化（第二阶段）**：侧边栏功能按钮收敛到底部小栏（复刻原版布局）
  - 顶部仅保留紧凑 tabs（主课表/KLMS）+ 学分；移除顶部 display options 折叠面板与 popularity note 说明条，中部空间全部让给课程卡片
  - 底部新增一行小按钮栏：筛选（⚙，带编辑模式 tooltip 说明）/ 菜单（☰，展开 display options 浮层）/ 课程购物车（🛒，主按钮）
  - display options 移入 Menu 浮层（点击外部关闭 + 200ms 防误触），选中项高亮并显示计数
  - 筛选按钮支持编辑模式高亮态（`filterMode` 经 prop 传入），hover 显示"编辑模式"说明浮层
  - i18n 新增 `menu` / `filterTip*`（编辑模式说明）key；移除侧边栏未再引用的 `popularityUpdatedAt` 逻辑与 `popularityGeneratedAt` 传递
- **排课工作台 UI/UX 优化（第三阶段）**：左侧课程表 + 底部控制栏复刻原版
  - 去掉课程表外层圆角矩形卡片（border/圆角/阴影/背景），课程表与侧边栏融入页面背景；求解提示遮罩同步去圆角
  - 时间刻度线对齐：标签中线对齐水平刻度线，补齐末尾 21:00 标签（原版 9 条刻度线 vs 此前 8 个）；网格线移入独立层（`__grid`，只覆盖主体区域，不延伸到时间标签列），表头竖线由表头自身边框提供，避免刻度文字被线穿过及首行首列双重刻度线
  - 课程块配色改为原版浅色方案（浅底深字，light: `hsl(hue 40% 85%)`，dark: `hsl(hue 25% 70%)`），新增 `getCourseTimetableColors` 纯函数
  - 课程块 hover 自动展开：按内容自然高度展开 + z-index 提升；内容不足一槽高的卡片保持槽位高度不回缩（`Math.max(槽位高, 内容高)`）
  - 课程块 hover 反馈：hover 高亮环（dark 白边 / light 灰边）+ 大阴影 + 向下位移 4px；内容溢出的卡片底部常驻渐变遮罩提示"还有内容"（hover 展开后消失）
  - 课程块字体放大（课程号 0.85rem / 标题 0.75rem / 明细 0.7rem）
  - 底部控制栏：按钮去掉边框/背景改为纯图标（内联 SVG：skip-start/caret/skip-end），计数器改大号索引 + `/ total`
  - 方案 slider 占满整行宽度；支持点击定位 + 自由拖拽（mousedown + window mousemove/mouseup），拖动时显示索引 tooltip + thumb 放大
  - 周六/周日课程随方案列数联动（`getMaxDayNum`，原有逻辑确认保留）
- **排课工作台图标方案统一（lucide 本地图标集）**：
  - 安装 `@iconify-json/lucide` 本地图标集（devDependency），@nuxt/icon 自动发现，build 产物内联图标（icons.mjs）
  - 排课板块 11 处图标统一为 `<Icon name="lucide:xxx">`：课表（list/map-pin/user/clock）、侧边栏底部栏（sliders-horizontal/menu/shopping-cart）、底部控制栏（skip-back/chevron-left/chevron-right/skip-forward）
  - 修复图标加载失败根因：裸名称会被解析成错误/空前缀集合（如 `map-pin` → `map:pin`），必须使用 `lucide:` 前缀
  - `nuxt.config.ts` 配置 `icon.localApiEndpoint: '/_nuxt_icon'`，避开 devProxy 对 `/api/*` 的拦截导致图标接口 404
  - lockfile 双同步（`package-lock.json` + `pnpm-lock.yaml`）
- **底部控制栏图标可见性修复**：
  - 根因：全局按钮样式 `padding: 0.75rem 1rem` 叠加 `box-sizing: border-box`，使 40px 按钮内容区仅剩 4px，flex 收缩把图标压成 4px 细线（肉眼几乎不可见）
  - 修复：按钮 `padding: 0; min-height: 0`，图标 `flex-shrink: 0`
  - 复刻原版：移除 `:disabled`（导航按钮永不禁用，越界点击由 `goToStart/goPrev/goNext/goToEnd` 自动 clamp），去掉 `opacity: 0.3` 变暗
  - 四个导航图标统一 26px（此前外侧 26px / 内侧 22px）
- **课程块网格对齐与 hover 展开高度修复**：
  - 课程块横向居中：卡片在 2px 网格竖线之间对称居中（左偏移 `+3`，此前 `+2` 使卡片紧贴左线、距右线 2px，整体偏左 1px）
  - 课程块下移 1px：卡片上缘不再盖住水平刻度线（复刻原版 `top + 1`）
  - 修复 hover 展开高度不随显示项变化：高度测量 `watch` 逐个跟踪 5 个 display options key（此前只跟踪对象引用，侧边栏 Menu 原地修改属性不触发 watch，导致展开高度停留在旧值，内容多时被裁、少时留白）
- **排课工作台 UI/UX 优化（第四阶段）**：右侧侧边栏整体压缩 + hover 信息浮窗
  - 课程卡头部压缩：第一行小字 `CODE · N Credits` + 课程级总热度 `[flame icon] 30/8`（looking/scheduling，决策十），第二行 title 大字；`Details` 文字按钮 → ℹ️ 图标；状态圆点保留；移除 History 按钮（入口后续单独设计）
  - 新增 `SchedulerPopularitySummary.vue`：极简热度样式（title=`popularityExplanation`、aria=`popularityAriaLabel`）
  - Bundle 区域压缩：移除每层 `Layer N` 标题行 + All/None 文字按钮 → 单行胶囊 + 右侧 `layers-plus`/`trash` 小图标按钮（title/aria-label 用 `scheduler.all`/`scheduler.none`）；修复图标不显示（全局 `button` 的 min-height/padding 覆盖紧凑按钮 + `:deep(svg)` 无法匹配 css-mode 的 `span.iconify` 导致图标 0 宽）——按钮加 `min-height:0; padding:0; flex-shrink:0`，`font-size:15px` 驱动图标 1em 尺寸
  - 视觉验收反馈：credit/credits 统一英文（zh `scheduler.credits` 改 `{count} credit | {count} credits`、`creditsShort` 改 `{count} cr`）；credit 按学分数分色（新增 `--credit-level-1..6` 主题变量 light/dark 两套，课程卡与信息浮窗 `creditColorVar()` 上色：1 emerald/2 cyan/3 sky/4 indigo/5 fuchsia/≥6 rose）；热度保留在 meta 行并修正对齐（`align-self: center` 垂直居中、`margin-left: 8px` 离左侧更远）；`course-card__meta` 改 `align-items: center` 让 code/credits/popularity 垂直中线一致（原 baseline 对齐下小号 credits 低约 2px）
  - 视觉验收反馈第 2 轮：bundle 胶囊圆角 `999px`→`8px`；selected 态移除橙色边框/ring（区分改为基础/边框加深变色 12%→26% / 40%→72% + 保留琥珀色圆点）；hover 反馈增强（课程卡边框变交互色 + 背景 4% 蓝 tint；bundle 胶囊背景加深 + 边框变色 + 文字变亮，disabled 卡 hover 保持灰化不误导）；dark mode 文字对比度（新增 `--interactive-active-text` 主题变量：light `#1278c4` / dark `#4db6ff`，bundle active/selected 文字与侧边栏 tabs/menu-item/tip-state 的 tinted 背景文字改用该变量，替代 dark 下过深的 `--interactive-active` `#1a8fe0`）；disable/enable 差异强化（disabled 卡 `opacity: 0.62` + 纯灰背景 + 灰边框 + code/title 降为 `--text-secondary`）
  - 视觉验收反馈第 3 轮（dark 更亮 + disabled 弱化，用户确认范围=仅排课侧边栏交互元素）：bundle 胶囊状态重构为 `--scheduler-chip-*` 主题变量组（light 保持原 tint；dark 改原版"贴纸"式——enabled 亮蓝 pastel `#a8d8ff` 底 + 深蓝字、selected 更强蓝、disabled 灰块 `#5b6b85` 底 + 暗灰字）；disabled bundle 默认文字由亮字改 muted 灰、**hover 不再发蓝**（改为灰色微变，与 enabled 靠色相区分）；tabs 改用 `--scheduler-tab-active-*`（dark 下实心交互蓝 + 深字，light 不变），inactive 补 hover 底色；dark `--interactive-active-text` 提到 `#6cc5ff`；layer-actions 图标 hover 色改用 `--interactive-active-text`
  - 点击响应优化（方案 A 乐观更新）：登录用户 toggle（课程/bundle/layer）原先需等待"PUT 写后端 + 全量 GET 购物车"两次往返完成才更新 UI（点击后明显延迟）；现改为**先乐观应用 `setGuest*` 纯函数到本地 `courses.value`（点击即亮/灭），再入队原有 write + reconcile 确认**——正常路径服务器值覆盖无感、写失败 reconcile 拉回权威值（自动回滚）+ 错误横幅、reconcile 不可用时保持乐观值 + `requiresReload` 冻结变更可 reload 拉回；`requiresReload/reloading` 时先抛 `blocked` 不乐观应用。`cart-refresh.test.ts` 新增乐观契约测试并更新 reconcile 失败语义，其余竞态契约（快速 All/None intent、跨 key 序列化、write 响应丢失、GET 瞬时失败重试）全部保持通过
  - 新增 `SchedulerCourseInfoPopover.vue`：ℹ️ 图标 hover 异步 `getCourseDetail` 显示小浮窗（title/code/学分/简介/pre·co-requirement/exclusion），loading/error/ready 三态（含 retry）、位置自适应防溢出、Teleport 到 body 防侧边栏裁剪、150ms 延迟关闭；替代 `SchedulerCourseDetail` 居中弹窗（Dashboard 的 `handleShowInfo`/`closeCourseDetail`/`selectedCourse`/`courseDetailStatus`/`showCourseDetail` 链路删除）
  - 移除课表块内 popularity compact badge（决策十：不在课表/bundle/section 级显示热度）；`SchedulerTimetable` 移除 `popularityByCourse`/`showPopularity` props，`SchedulerPopularityBadge` 不再被引用
  - 测试更新：`popularity-ui.test.ts` 迁移到新契约（课表无 badge / 课程卡仅课程级热度 / History 入口移除但 Dashboard 链路保留）、`hardening-ui.test.ts` 详情加载失败断言改指向 `SchedulerCourseInfoPopover`
- **排课工作台 UI/UX 优化（第五阶段）**：课程购物车面板复刻原版
  - 搜索框增强：左侧 `lucide:search` 图标 + 右侧行内旋转 spinner（搜索中显示）
  - 搜索结果每项状态反馈（复刻原版 4 态）：per-course loading/success/fail 状态图标（蓝色 spinner / 绿色勾选 / 红色叉 + 文案），自动恢复（1.2s/1.8s）；+/- 按钮由 40px 实心圆形改为 30px 透明描边图标（`circle-plus` 交互蓝 / `circle-minus` 错误红），与状态图标同族同尺寸
  - 购物车抽屉重构：面板内叠加轻遮罩 + 底部悬浮卡片（标题 + 关闭 / 课程列表 code·credit 分色 / Total Credits 总计 / `trash-2` 删除按钮）；点击抽屉遮罩关抽屉回面板，点击面板外关整个面板
  - credit 分色统一：搜索结果与抽屉 credit 用 `creditColorVar()`（`--credit-level-1..6`）+ `· ` 前缀，与侧边栏课程卡 meta 行一致
  - 分页与购物车按钮同排底部栏：分页居中 + Cart 胶囊按钮靠右（`shopping-cart` + "Cart (N)"）
  - 科目标签改为硬编码常用两行（`UFUG UCUG DLED` / `AIAA AMAT DSAA FTEC MICS ROAS SMMG`），移除动态加载全部科目（过多反而失去一点即选的快捷作用）
  - 底部翻页按钮去边框改 lucide 图标（`chevrons-left`/`chevron-left`/`chevron-right`/`chevrons-right`，与底部控制栏一致）；loading/success 状态图标包进 30px 居中占位槽，与 +/- 按钮几何一致消除水平偏移
  - 底部控制栏两端图标同步：`skip-back`/`skip-forward` → `chevrons-left`/`chevrons-right`（保持两处翻页图标一致）
  - 测试更新：`cart-panel.test.ts` 扩至 10 个契约（状态反馈 / 抽屉 / credit 分色 / 分页 / 硬编码科目两行 / borderless 翻页图标等）；`hardening-ui.test.ts` 同步（subject 请求移除断言）
- **课程宇宙图谱**：完整课程关系图渲染（前置/共修/互斥逻辑节点、路由连线、悬停高亮、拖拽平移）
  - 新增 `utils/courseUniverse.ts` 完整图适配器与 `tests/course-universe/` 回归测试
- **课程探索与详情**：课程探索页、课程详情与评论、开课信息、学季筛选
- **学术地图**：学术要求矩阵、进度计算、专业标签、成绩默认保留
- **排课热度**：课程热度信号、热度历史曲线（`SchedulerPopularity*`）

### 管理后台

- Admin 控制台：反馈审核、合并请求、身份核验、用户/内容管理、可视化图表（`/admin`，SSR 关闭）

### 部署与稳定性

- 不可变前端发布：唯一 `.incoming/<sha>` 目录 + 原子 `current` 符号链接切换 + PM2 进程健康校验（见 `deploy/README.md`）
- 原生 OpenSSH 部署、锁竞争处理、回滚身份校验
- 生产与开发环境分离部署工作流（`deploy-frontend-prod.yml` / `deploy.yml`）
- 修复排课购物车竞态、排课认证恢复、课表/地图几何问题

### 其他

- 课程宇宙图谱回归测试与交互修复

## [0.1.2] - 2025-04-16

- 修复 JWT 令牌问题
- 支持发帖与查看帖子
- 图片上传实现上传，尚未关联到帖子

## [0.1.1] - 2025-04-14

- 更新自动化版本管理（standard-version）

## [0.1.0] - 2025-04-14

### 初始功能

- 测试版本发布
- 用户注册和登录功能
- 基础页面结构
- 前后端注册和登录打通

---

*说明：早期 0.1.x 记录来自 `version.ts` 与旧 `docs/CHANGELOG.md`（现已合并删除）；更早的历史提交未按版本整理，如需完整提交历史请参阅 `git log`。*
