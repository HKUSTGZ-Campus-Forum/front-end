# Architecture Decision Records

本文档记录 UniKorn 前端项目中的重要技术决策及其理由，便于后续 Agent 与开发者查阅。
每项决策包含：背景（Context）、决策（Decision）、理由（Consequences/Justification）。

> 新决策由 Agent 或开发者按模板追加到文末。格式参考 [MADR](https://adr.github.io/madr/)。

---

## ADR-001：主题系统采用"统一 token + 多主题配置"

- **日期**：2025-04
- **状态**：已采纳
- **背景**：早期组件大量硬编码颜色，导致主题切换与视觉统一困难。
- **决策**：通过 CSS 自定义属性（`var(--surface-primary)`、`var(--text-primary)`、`var(--border-primary)`、`var(--shadow-small)` 等）定义颜色；当前提供 `keguang-blue` 与 `deep-dark`，主题只替换 token，布局保持一致。所有新组件禁止硬编码界面颜色。
- **理由**：低侵入地实现全站视觉一致；为后续暗色/浅色变体预留扩展点；避免引入重型主题框架。
- **相关文档**：`docs/THEME_SYSTEM.md`、`assets/css/variables.scss`

## ADR-002：所有后端 API 调用统一走 `fetchWithAuth` / `fetchPublic`

- **日期**：2025-04
- **状态**：已采纳
- **背景**：JWT access token 过期后，直接 `fetch` 调用会返回 401，且无法自动刷新。
- **决策**：封装 `useApi()` 组合式函数，提供 `fetchWithAuth`（带自动刷新）与 `fetchPublic`（公开接口）；除认证端点（`useAuth.ts`，避免循环依赖）、公开端点、OSS 直传（XMLHttpRequest + 签名 URL）外，禁止直接 `fetch`。
- **理由**：统一令牌刷新逻辑、减少 401 事故、便于注入基址（同源 `/api` 或绝对 URL）。
- **相关文档**：`CLAUDE.md`、`composables/useApi.ts`

## ADR-003：导航组件沿用 Nuxt 自动导入命名约定

- **日期**：2024-12
- **状态**：已采纳
- **背景**：将顶部导航与侧边栏迁移到 `components/home/` 后，若在模板中使用文件原名（`<Pinned>`）会导致导航栏消失；曾尝试"修正"命名导致回归。
- **决策**：严格遵守 Nuxt 自动导入规则 —— 当前 `components/home/KeguangPinned.vue` 在模板中写作 `<HomeKeguangPinned>`、`KeguangSidebar.vue` 写作 `<HomeKeguangSidebar>`；不得省略目录前缀。
- **理由**：组件按目录前缀自动命名；破坏该约定会静默破坏导航系统。同类问题通过"优先级 + 兜底"策略（如头像三级回退）解决，而非替换既有行为。
- **相关文档**：`CLAUDE.md`

## ADR-004：排课助手迁移为并行迁移，独立 CoursePlan 保持可用

- **日期**：2026-06
- **状态**：已采纳（已完成）
- **背景**：原独立项目 `CoursePlan.search`（Next.js）需要并入主站"课程"板块；但旧站用户、购物车、数据不可破坏，且需要回滚路径。
- **决策**：
  - 主站入口 `/schedule` 重定向到 `/courses/planner`；独立 CoursePlan 继续由 `scheduler.unikorn.hkust-gz.edu.cn` 提供服务；
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
- **状态**：已采纳（axfff 开发/旧栈）
- **背景**：早期直接覆盖部署存在"半发布"窗口与回滚困难。
- **决策**：`dev.unikorn.axfff.com` 及迁移前旧 axfff production 的前端 workflow 将每次构建上传到唯一 `.incoming/<git-sha>-<run>-<attempt>` 目录，校验完整文件清单后加锁串行切换，将目录移入 `releases/` 并原子切换 `current` 符号链接；PM2 从 `current/.output/server/index.mjs` 启动；仅当所有进程报告预期 Git SHA 且 `/health` 探测通过才判定部署成功。学校正式服使用 ADR-011 的联合 release，不使用该旧 production workflow。
- **理由**：消除部分写入状态、保证可回滚（切换回旧 symlink）、部署身份可校验。
- **相关文档**：`deploy/README.md`、`.github/workflows/deploy.yml`

## ADR-007：学校 SSO 使用后端 OIDC + 一次性前端登录票据

- **日期**：2026-08
- **状态**：已采纳
- **背景**：HKUST(GZ) SSO 使用 OAuth 2.0 Authorization Code Flow 与 OIDC。现有前端把 UniKorn JWT 保存在浏览器中，但学校的 client secret、授权码交换和 ID Token 校验必须留在可信后端，同时回调 URL 不能携带本地 access/refresh token。
- **决策**：后端使用 Authlib、PKCE S256、state/nonce 和 Discovery 元数据完成学校认证；以 `(issuer, sub)` 作为外部身份主键，只自动关联已验证的校内邮箱；回调生成两分钟、单次消费的数据库票据，前端通过 `/api/auth/oidc/exchange` 换取现有 UniKorn JWT。用户主动退出时撤销并清除 UniKorn 本地会话，始终返回对应语言的站内主页，不再把当前页面导航到学校 end-session URL；学校 SSO 会话保持有效，后续点击 SSO 登录可能直接完成认证。
- **理由**：client secret 与学校 Token 不进入前端，避免 JWT 出现在查询字符串；稳定 subject 不依赖可能变化或回收的邮箱；一次性票据兼容现有认证状态而无需重写全站 API。退出统一留在站内可避免学校登出完成页无法回跳造成的体验分叉，同时保留学校统一认证带来的快捷再次登录。
- **相关文档**：后端 `CAMPUS_SSO.md`、`migrations/versions/20260819_campus_oidc.py`

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
- **相关文档**：`pages/login/index.vue`、`composables/useAuth.ts`、后端 `app/routes/auth.py` 与 `CAMPUS_SSO.md`

## ADR-010：由 SSO 新建的账号必须完成一次公开资料确认

- **日期**：2026-08
- **状态**：已采纳
- **背景**：学校 OIDC 能稳定提供身份 subject 和校内邮箱，但这些字段不等于用户希望公开展示的社区身份。直接把 SSO 派生的临时用户名投入帖子、评论和个人主页，会造成难以理解的公开名字；同时仅用前端 localStorage 判断“首次登录”可被刷新、换设备或清缓存绕过。
- **决策**：后端在 `users.onboarding_completed_at` 持久化完成状态，并在自己的用户响应中给出 `onboarding_required`。只有 SSO 自动创建的新账号初始为未完成；迁移前既有账号及首次关联的既有已验证账号直接视为完成。前端在 SSO exchange 后及全局路由守卫中将未完成用户送往本地化的 `/onboarding`，要求确认 2–50 字符公开用户名，头像保持可选；`POST /api/users/me/onboarding` 以幂等方式完成状态。规则和隐私页面在守卫期间保持可访问，站内返回地址经过白名单式校验以避免开放重定向和循环。
- **理由**：把学校身份与公开社区身份明确分层，同时保证引导跨刷新、跨设备一致；对既有用户做完成态回填可避免上线后全量拦截。头像可选可以降低首次进入门槛，用户名强制确认则能阻止临时 SSO 名称意外公开。
- **相关文档**：`pages/onboarding.vue`、`middleware/onboarding.global.ts`、`utils/onboarding.ts`、后端 `CAMPUS_SSO.md` 与 `migrations/versions/20260822_sso_onboarding.py`

## ADR-011：学校正式服采用前后端联合不可变 release

- **日期**：2026-08
- **状态**：已采纳
- **背景**：正式产品已迁移到学校域名和学校服务器；前端、后端、数据库迁移、Nginx 与同机 CoursePlan 需要在一个受控发布边界内验证，旧 axfff `production` workflow 无法代表该拓扑。
- **决策**：正式产品固定为 `https://unikorn.hkust-gz.edu.cn`。在 `unikorn-school` 上使用后端仓库 `deploy/school/deploy-release.sh`，以干净 checkout 和前后端完整 SHA 构建 `/srv/unikorn/releases/<release-id>`，执行已验证备份和 Alembic 后原子切换 `current`，并以 systemd 管理 Nuxt、Flask 和独立 Redis。Nginx 仅在模板变化时通过 `activate-nginx.sh` 更新；每次发布都必须验证 SSO 和 `courseplan.service`。旧 `unikorn.axfff.com` production workflow 只属于迁移前旧栈，不是当前正式发布路径。
- **理由**：精确记录前后端版本、消除半发布状态、把数据库迁移和应用切换纳入同一保护流程，同时保持 CoursePlan 的目录、服务和端口隔离。
- **相关文档**：`docs/production-environment.md`、后端 `deploy/school/README.md`

## ADR-012：排课方案采用结构化引用与不可变快照双轨存储

- **日期**：2026-08
- **状态**：已采纳
- **背景**：排课工作区是可变的课程购物车，课程班别与上课时间也会随学校数据同步更新。如果只保存求解结果序号，重新求解后无法还原；如果只保存外键，班别取消或变更后历史方案无法阅读；如果把方案直接当作购物车，又会错误影响选课热度。
- **决策**：方案独立于购物车，以 `CourseOffering` / `CourseSection` 结构化引用支持校验和筛选，同时保存课程、班别和会议快照用于历史预览。方案保存、查看、分享和复制不写入热度；只有显式“使用方案”才在完整验证后原子替换工作区并记录热度转换。可见性分为私密、仅链接和公开，屏蔽时段只向所有者返回且不参与其他用户应用共享方案时的判断。
- **理由**：双轨模型兼顾当前数据一致性与历史可读性；把方案和排课意向分离可防止公开浏览污染热度统计；快照的代价是额外存储和变更状态比较，但每个用户最多 100 个、每个方案最多 20 门课程，边界明确且可控。
- **相关文档**：`docs/plans/2026-08-22-scheduler-saved-plans-design.md`、`utils/schedulerPlans.ts`、后端 `app/models/scheduler_plan.py`

### 排课热度的小样本隐私保护（2026-08）

- **背景**：已保存方案支持私密、仅链接和公开三种可见性。即使只返回聚合人数，把私密方案纳入课程热度也会违背用户对私密内容的合理预期；小专业或低热度课程的精确个位数还可能增加身份推测风险。
- **决策**：课程卡片的当前热度只统计把课程加入对应学期购物车的已验证校内账号，并按规范化邮箱去重。已保存方案不参与任何可见性下的热度统计；人数为 1–4 时，后端不返回精确值，前端统一显示“少量”。统计仅表示排课意向，不代表正式选课。
- **实现**：`GET /api/scheduler/popularity/<semester>` 对小样本返回 `cart_count: null` 与 `cart_count_suppressed: true`，避免仅在前端遮盖精确值；课程卡片使用站内浮层解释统计口径，并支持鼠标、键盘、触屏和深色主题。

## ADR-013：学校正式服由单一双 SHA 发布控制分支触发

- **日期**：2026-08
- **状态**：已采纳
- **背景**：前后端分仓后，如果两个仓库各自用正式分支触发部署，会产生版本错配和重复发布；学校主机又位于内网，不适合暴露 SSH 给 GitHub 托管 runner。`main` 已承担共享 dev 自动部署，也不能同时等同于正式发布批准。
- **决策**：后端仓库建立只允许修改 release manifest 的 `school-production` 控制分支。manifest 成对记录前后端 `main` 的完整 SHA；GitHub 托管 runner 对这对候选重新执行测试和生产构建并发布固定验证状态，学校服务器上的 root-owned systemd 控制器通过出站连接轮询该状态，验证成功后调用可信安装版联合 release 脚本。控制器只允许版本向前移动，自动阻止未经用户明确批准的 migration 与产品数据变更，并在发布期间协调 SISN 同步定时器。旧 axfff `production` workflows 仅保留手工 dispatch。
- **理由**：一次 manifest 更新明确表达一对可审计版本，避免分仓竞态；学校侧轮询不需要开放入站管理端口；GitHub 验证与主机端独立校验共同限制错误或未批准的发布，同时复用 ADR-011 的备份、迁移、原子切换和健康检查能力。
- **相关文档**：后端 `.github/workflows/validate-school-production-release.yml`、`deploy/school/README.md`、`deploy/school/school-production-controller.py`

## ADR-014：论坛桌宠采用全局壳层与可替换 Live2D 渲染适配器

- **日期**：2026-08
- **状态**：提议
- **背景**：论坛需要一个跨路由常驻、可折叠且不侵入页面业务的站娘/桌宠原型；后续可能由 Agent、TTS 和论坛上下文驱动情绪、动作与口型。直接使用完整看板娘 widget 会把固定定位、提示策略和模型生命周期绑在第三方 UI 中，也容易与 PWA 提示和弹窗层级冲突。
- **决策**：根应用只挂载一个 client-only 的全局悬浮壳层，模型渲染由 `L2dMascotRenderer` 封装 `l2d`，通过动态 import 避开 SSR，并暴露动作、表情和归一化嘴型参数控制。共享开发部署显式启用固定版本的 Live2D 官方 `Hiyori` 示例模型，并放大、偏移成上半身构图；其他构建默认关闭，模型 URL、缩放和内部位置分别通过 `NUXT_PUBLIC_MASCOT_MODEL_URL`、`NUXT_PUBLIC_MASCOT_SCALE`、`NUXT_PUBLIC_MASCOT_POSITION_X/Y` 替换。桌宠位于普通内容之上、模态框和系统级提示之下，移动端与减少动态效果偏好默认收起。用户悬停或键盘聚焦桌宠时显示圆形快捷菜单；个人模型 URL 只保存在浏览器 localStorage，保存后重新挂载渲染器，不进入后端或公共构建配置。
- **理由**：渲染器与壳层解耦后可以在不改页面和 Agent 策略的情况下替换自有 Live2D、静态图或其他运行时；参数驱动口型可先用文本节奏验证，未来再接 TTS 音频振幅。开发环境限定第三方演示素材，避免未经许可的模型进入学校正式发布。
- **相关文档**：`components/mascot/Overlay.client.vue`、`utils/mascotL2d.ts`、`.github/workflows/deploy.yml`

## ADR-015：排课助手在浏览器端执行候选课程精确优选

- **日期**：2026-08
- **状态**：已采纳
- **背景**：原固定排课器要求用户先确定全部课程，只负责寻找每门课的一组可行班别；它无法表达“从较大的意向课程池中选择一定数量，并按个人偏好比较全部可行组合”的需求。优选结果还必须保留截止名次的所有同分方案，不能通过近似算法或隐藏截断改变语义。
- **决策**：保留固定排课为默认模式，并新增完全独立的候选课程优选模式。浏览器先把现有 layer、bundle、module policy、教学日期与屏蔽时段适配成完整课程选项，再使用预计算冲突位集和分片深度优先搜索穷举课程数量范围内的全部无冲突方案。评分字符串统一编译为 `BigInt` 定点数；Top X 表示前 X 个不同分数档位，并保留截止档位的全部并列项。偏好按学期保存在 `localStorage`，只有输入指纹完全一致的完整结果或无解结果才可从有界 IndexedDB 缓存恢复；运行期间输入变化会丢弃旧快照并自动按最新条件重算。候选偏好、求解和缓存均不新增后端 API，也不改变购物车热度语义。
- **理由**：在现有课程模型与保存/分享链路上渐进增强，可以保持固定模式兼容并让评分和并列规则可审计；定点计分与完整遍历保证结果精确，冲突预计算、剪枝、进度分片、取消和缓存降低重复工作并维持页面可操作性。代价是搜索空间仍随候选和班别数指数增长，极端同分组也可能占用较多内存，因此 UI 对最多 10 门及以上给出分级负载提示，但不静默删减结果。
- **相关文档**：`docs/plans/2026-08-23-scheduler-ranked-plans-design.md`、`utils/schedulerOptimizer.ts`、`utils/schedulerOptimizerStorage.ts`、`composables/useSchedulerOptimizer.ts`

## ADR-016：首页轮播采用后台托管、按语言投放与内置容灾

- **日期**：2026-08
- **状态**：已采纳
- **背景**：首页横幅原本硬编码在前端，运营人员无法自行增删或调整顺序；中文首页还会轮播英文欢迎图。横幅图片由管理员上传后，也不能依赖会过期的 OSS 签名地址。
- **决策**：后端以 `home_carousel_slides` 保存语言范围（中文、英文、双语）、稳定图片引用、替代文字、本站或 HTTPS 跳转、顺序、启停和软归档状态，并对写操作做管理员鉴权与审计。公开接口只返回当前语言和双语内容，上传图片通过同源稳定端点读取。前端接口成功返回空列表时尊重运营配置；仅在接口异常或切换语言等待期间使用对应语言的内置横幅容灾，不把另一种语言的欢迎图混入回退结果。
- **理由**：运营配置不再依赖发版，语言投放规则在服务端收口且可审计；同源图片地址避免签名过期和暴露存储信息；内置容灾保证后端短暂不可用时首页仍有可用入口，同时不会恢复原有语言串台问题。
- **相关文档**：`docs/plans/2026-08-28-home-carousel-admin-design.md`、`pages/admin/carousel.vue`、`components/home/CarouselBanner.vue`、后端 `app/routes/home_carousel.py`

## ADR-017：课程组队以独立接入应用提供，主站只拥有入口

- **日期**：2026-09
- **状态**：已采纳
- **背景**：课程组队由外部维护者在独立前后端仓库持续更新；维护者不应因此获得 UniKorn 主仓库、学校服务器、生产数据或部署凭据访问权。
- **决策**：组队业务页面、API、数据、CI 和发布资产留在外部仓库；主站仅增加由运行时开关控制、指向同源 `/teamup/` 的双语硬导航。接入应用使用 UniKorn JWT 和只读用户身份投影，但独立运行于 `/teamup/` 与 `/api/teamup/`，并通过平台审批的精确 SHA 发布。
- **理由**：既保持外部维护自主权和最小主站耦合，也让 UniKorn 控制同源代码信任、入口、路由与 production 发布门禁。
- **相关文档**：工作区 `docs/integrations/README.md`、`docs/integrations/apps/teamup.json`

## ADR-018：论坛助手采用后端模型代理与用户级持久化会话

- **日期**：2026-08
- **状态**：提议
- **背景**：论坛需要先验证一个跨页面可用、能保留历史记录的 AI 对话入口，后续再接网站知识库和桌宠语音；Sub2API 的地址和 Key 不能进入浏览器或 Nuxt 公共运行时配置。
- **决策**：根应用挂载独立的 client-only 对话框，登录用户通过 `useApi().fetchWithAuth` 调用后端 `/api/agent/*`；后端负责供应商调用、上下文裁剪、频率与输出上限，并按用户隔离持久化会话和消息。前端只通过 `NUXT_PUBLIC_AGENT_ENABLED` 控制入口是否展示，共享 dev 显式开启、其他构建默认关闭。Agent 回复复用 `MascotOverlay.speak` 驱动当前文字气泡与参数口型。知识库检索留在后端模型调用前扩展，禁止前端直接拼接私密内容或供应商凭证。
- **理由**：服务端代理保护 Key 并集中控制成本和提示词；数据库历史可跨设备恢复且不依赖 localStorage；聊天 UI 与 Live2D 渲染解耦，后续加入 RAG、TTS 或流式输出时不需要重写页面和模型生命周期。
- **相关文档**：`components/assistant/AgentChat.client.vue`、`composables/useAgentChat.ts`、后端 `docs/agent-assistant-api.md`

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
