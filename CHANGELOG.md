# Changelog

本项目的所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。
本文件为本仓库唯一正式的变更日志（早期 0.1.x 记录已并入本文件）。

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
