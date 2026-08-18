# Changelog

本项目的所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。
本文件为本仓库唯一正式的变更日志（早期 0.1.x 记录已并入本文件）。

---

## [Unreleased]

### Fixed

- **发布页深色模式背景残留**：`/forum/postMessage` 页面卡片的硬编码浅色背景/边框/标题/返回链接颜色改为主题 token（`--surface-primary` / `--border-primary` / `--card-shadow` / `--text-primary` / `--interactive-primary`），darkmode 下不再显示白底
- **帖子详情页右上角按钮渲染错误**：分享/复制/删除小图标按钮被全局 `button { min-height: 44px }` 规则撑高变形，重置 `min-height: 0`；`ForumUiIcon` 手写 SVG 统一替换为 lucide 图标（`lucide:eye` / `lucide:share` / `lucide:check` / `lucide:trash-2`），与全站图标方案一致

## [0.2.1] - 2026-08-17

### Added

- **语义色 token**：新增 `--semantic-purple` 及 `--success/-warning/-error/-info/-purple-color`、`-background` 等别名块；primary 按钮统一 `--btn-primary-bg` + `--text-inverse`（新增 `--interactive-hover` 等交互 token）
- **课程图谱独立 URL**：课程图谱从 `/courses` 迁至 `/courses/graph`，`/courses` 作为课程板块入口重定向至 `/courses/planner`
- **顶栏 logo hover 卡片**（复刻原排课助手）：悬停时卡片突出顶栏下方并上浮，logo 放大
- **顶栏主题切换控件**（复刻原排课助手 darkmode-toggle）：expand 动画太阳/月亮图标 + 滑动开关，点击在 `keguang-blue` / `deep-dark` 间互切
- **顶栏语言切换下拉菜单**：双按钮 → globe 图标 + 当前语言单按钮 + 下拉选项（当前项勾选），点击外部关闭
- **账户页更换邮箱表单样式补齐**：切换按钮由浏览器默认样式改为次级按钮（边框 + 交互色 + hover/展开激活态），展开表单改为 `--surface-secondary` 卡片
- i18n 新增 `common.theme.label/light/dark`

### Changed

- **全组件硬编码颜色 token 化**：forum、feedback、scheduler、admin 图表、academic-map、common、ui、home、identity、setting、user、matching、contest、profile 等全部组件与页面的硬编码颜色统一替换为主题变量（`--surface-*` / `--text-*` / `--border-*` / `--interactive-*` / `--semantic-*` / `--shadow-*` 等），深色主题下不再有亮色残留
- **四页宽度统一**：Planner / Explore / Academic Map / Course Map 四页 `max-width` 统一为 1100px、水平内边距统一 20px，切换页面时导航按钮位置不再跳变
- **顶栏高度 84→64px**：顶栏与内容区偏移同步
- **搜索框图标 lucide 化**：`SearchDropdown.vue` 全部 emoji 替换为 lucide 图标
- **通用页脚优化**：配色/边框/间隔对齐深色主题；二维码白色卡片 96px + `loading="lazy"`；邮箱链接 `📧` emoji → `lucide:mail` 图标；内容区与全站 1100px 断点/内边距统一
- **账户页邮箱验证徽标统一**：`已验证` / `未验证` 均改为纯文字胶囊徽标（绿/黄圆角底），任意窗口宽度下与邮箱地址保持同一排
- **账户页操作按钮同排**：`重新发送验证邮件`（未验证时）与 `更换邮箱地址` 合并到同一操作行
- **账户页垂直节奏压缩**：section 间距、标题边距、表单组/操作区边距与按钮 padding 整体收紧
- **全局装饰性 emoji → lucide 图标**：`ForgotPassword`、`IdentityRequestForm`、`IdentitySelector`、`AccountSettings`、`Register`、`ThemeSettings`、`matching/projects/create` 7 个文件，统一 `<Icon name="lucide:...">` 并带 `aria-hidden` / 对齐样式
- **排课求解提示 emoji → lucide 图标**：`SchedulerDashboard` 求解提示（信息/警告/错误）替换，en/zh 文案精简
- **i18n 扫描白名单**：10 个含中文说明注释的组件加入 `i18n-scan-allowlist.json`

### Fixed

- **顶栏主题切换控件 4 个 bug**：全局按钮规则撑高紧凑控件（统一 `min-height: 0` 重置）；SVG `clipPath` 属性大小写（须为 `clip-path`）致月亮裁切不生效；knob 基准位移叠加致超出轨道；`--text-inverse` 在深色主题为近黑色致 knob 变黑、off 轨道浅色下不可见
- **头像菜单修复**：图标改 lucide；`font: inherit` 简写致字体异常 → `font-family: inherit`；头像 hover 热区 240px→100%（原横跨语言按钮下方，选语言时误触发头像菜单）
- **月亮图标深色 hover 保持黄色**：修复通用 hover 规则（`--interactive-active` 蓝色）覆盖深色主题下月亮图标 hover 变蓝的问题
- **banned 格可见性**：筛选（banned）格在非编辑模式始终渲染（保持可见），仅编辑模式可点击切换

### Notes

- **刻意保留的硬编码（均带注释说明）**：PDF/Office 查看器白底、全屏图片查看器恒定深色、动态头像 pastel 色板、课程学科彩色节点文字、8 色图表分类色板、搜索关键词高亮、白色 toggle knob 等——因 token 无法表达或需跨主题恒定而刻意保留

## [0.2.0] - 2026-08-16

### 主题系统

- **新增深色主题 `deep-dark`（深邃黑）**：深蓝黑背景 + 科广蓝强调色，与 `keguang-blue` 同源配色；FOUC 防护（首屏前应用主题）、原生控件 `color-scheme` 同步；设置页深色分类可选
- **深色适配补齐**：顶栏 logo、设置页、课程详情/开课信息/评论页的硬编码颜色改为主题变量，深色下不再有亮色残留
- 修复设置页自动深色模式的 3 个 bug（不存在的主题 id 引用、事件监听清理失效、初始判断恒为 false）

### 课程板块

- **排课助手迁移**：原 `CoursePlan.search` 的核心功能（课表求解、课程收藏、冲突检测）迁入 `/courses/planner`；新增求解器与购物车模块及配套测试；游客使用本地购物车，登录用户 JWT 接口持久化
- **排课工作台全面复刻原版交互**：求解提示遮罩、侧边栏底部功能栏、课表与底部控制栏、侧边栏课程卡压缩 + 课程信息浮窗、课程购物车面板、整体布局细节（可拖拽侧边栏并记忆宽度、banned 格增强、标题栏压缩等）
- **购物车操作乐观更新**：课程/bundle/层 toggle 点击即反馈，后端确认失败自动回滚
- **状态持久化**：方案编号按学期记忆、显示偏好全局记忆、侧边栏宽度记忆（均 localStorage）
- **图标方案统一**：安装本地 lucide 图标集，排课板块全部图标统一为 `<Icon name="lucide:...">`，并修复图标加载 404 问题
- **课程宇宙图谱**：前置/共修/互斥逻辑节点、路由连线、悬停高亮、拖拽平移，含回归测试
- **课程探索与详情**：课程探索页、课程详情与评论、开课信息、学季筛选
- **学术地图**：学术要求矩阵、进度计算、专业标签
- **排课热度**：课程热度信号、热度历史曲线

### 管理后台

- Admin 控制台：反馈审核、合并请求、身份核验、用户/内容管理、可视化图表（`/admin`）

### 部署与稳定性

- 不可变前端发布：`.incoming/<sha>` 目录 + 原子 `current` 符号链接切换 + PM2 进程健康校验
- 原生 OpenSSH 部署、锁竞争处理、回滚身份校验
- 生产与开发环境分离部署工作流
- 修复排课购物车竞态、排课认证恢复、课表/地图几何问题

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
