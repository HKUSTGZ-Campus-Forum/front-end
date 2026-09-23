// Curated read-only snapshots of public historical posts from 2026-09-23.
export default [
  {
    "key": "legacy-305",
    "id": 305,
    "title": "排课助手迁移公告",
    "title_en": "Scheduling Assistant migration notice",
    "summary_en": "The Scheduling Assistant moved into UniKorn in August 2026. This notice records the migration and the v0.2.1 release.",
    "content": "出于架构不统一与数据库不互通等多种原因，为了未来能够提供更丰富的功能和更好的用户体验，我们决定于2026年8月起，将原排课助手 CoursePlan.search 迁移至 uniKorn 主站。秋季课程数据已经可用，您可前往”课程“板块体验。\n\n现在，原排课助手的所有功能均已迁移至 uniKorn 主站的“课程->排课助手”；此外，还新增了另外三个功能板块“探索”、“图谱“与“学业进度”。“课程”板块仍在持续开发与优化中，欢迎大家前往体验并提出宝贵意见。\n\n⚠️ Warning\n原排课助手已停止更新维护并可能在未来停止服务。如有需要，请尽快手动将历史课程数据迁移至 uniKorn 主站，以免数据丢失。\n\nuniKorn 主站已更新至 v0.2.1！本次更新主要包括：\n\n🚀 Features\n- 全面升级排课助手的 ui 与交互体验。在保留原排课助手设计的同时，融入了 uniKorn 主站的卡片风格并删减了杂乱线条，使整体界面更加简洁清晰。\n- Dark Mode 回归！您可在“头像->主题设置”中设置，或是直接在顶部导航栏中切换。\n- 部分页面 ui 进行了优化，提升了整体的视觉体验。\n\n⏰ Todos\n- 查找 Dark Mode 未完全适配的页面并进行修复。\n- 移动端适配优化，提升在手机端的使用体验。",
    "author": "Appleblue17",
    "created_at": "2026-08-18T11:18:33.841921+08:00",
    "source_post_id": 305,
    "archived": true
  },
  {
    "key": "legacy-270",
    "id": 270,
    "title": "排课助手 v2.0.0 上线",
    "title_en": "Scheduling Assistant v2.0.0 released",
    "summary_en": "Version 2.0.0 added Spring 2025–26 course data and support for postgraduate courses.",
    "content": "排课助手已更新至 v2.0.0。本次更新加入了新学期课程数据，并正式支持 PG 课程。更多优化将会在后续版本中陆续推出，敬请期待！\n\n⚠️ Warning\n由于数据库结构调整，v2.0.0 之前创建的已排课计划将无法保留。您的账号信息不受影响，可正常登录。\n\n🚀 Features\n- Dashboard (functional): 支持在一门课程中独立地选择多种分组类型（例如，Lecture + Lab）。\n- Dashboard (data): 添加了 2025-26 年春季学期的主要课程数据。\n- Dashboard (data): 添加了 PG 课程的数据支持。\n\n✨ Enhancements\n- Dashboard (functional): 现在网站会阻止用户禁用同一分组中的所有 Section，以防止误操作导致无解。\n\n🌟 Coming Soon?\n- 更好的 KLMS 课程支持（需等待 KLMS Course Market 开放）\n- Dashboard UI 优化，包括显示课程详细信息\n- 站内 Notice 系统\n- 管理员权限系统，对 News, Docs 和课程数据更方便的管理\n- 研发新 Course Map 中……\n\n传送门：https://scheduler.unikorn.axfff.com/home\n\n如有任何问题或建议，欢迎随时反馈！",
    "author": "Appleblue17",
    "created_at": "2025-12-27T23:45:22.244882+08:00",
    "source_post_id": 270,
    "archived": true
  },
  {
    "key": "legacy-115",
    "id": 115,
    "title": "更新报告 - 20250623",
    "title_en": "Update report · 23 June 2025",
    "summary_en": "This update introduced the theme system and fixed image previews in posts.",
    "content": "- 添加主题系统，以6套色彩主题取代原有界面配色\n- 添加图像预览，修复原先点击帖子图像后自动下载的问题",
    "author": "axfff",
    "created_at": "2025-06-23T00:10:14.003145+08:00",
    "source_post_id": 115,
    "archived": true
  },
  {
    "key": "legacy-104",
    "id": 104,
    "title": "更新报告 - 20250613",
    "title_en": "Update report · 13 June 2025",
    "summary_en": "This update improved Chinese usernames, the homepage layout, and post recommendations.",
    "content": "- 修复用户名不可用中文，目前接受大多数非特殊标点的字符\n- 优化首页布局，增加外部链接栏\n- 优化贴子推荐机制，提高热帖刷新频率",
    "author": "axfff",
    "created_at": "2025-06-13T19:21:25.915566+08:00",
    "source_post_id": 104,
    "archived": true
  }
]
