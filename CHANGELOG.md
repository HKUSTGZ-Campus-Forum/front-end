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
