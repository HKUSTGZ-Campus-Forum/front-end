// 网站域名相关配置接口
export interface SiteDomain {
  main: string; // 主域名
  imageBed: string; // 图床域名
  storage: string; // 存储域名
  telegram_group: string; // Telegram群组链接
  patch: string; // 补丁服务域名
  backup: string; // 备份服务域名
  sticker: string; // 贴纸服务域名
  nav: string; // 导航服务域名
  doc: string; // 文档服务域名
}

// 网站作者信息接口
export interface SiteAuthor {
  name: string; // 作者名称
  url: string; // 作者个人链接
}

// Open Graph 协议配置接口
export interface SiteOpenGraph {
  title: string; // OG标题
  description: string; // OG描述
  image: string; // OG图片URL
  url: string; // OG链接
}

// 网站创建者信息接口
export interface SiteCreator {
  name: string; // 创建者名称
  mention: string; // 社交媒体提及
  url: string; // 创建者链接
}

// 网站图片配置接口
export interface SiteImage {
  url: string; // 图片URL
  width: number; // 图片宽度
  height: number; // 图片高度
  alt: string; // 图片替代文本
}

// 主要网站配置接口
export interface SiteConfig {
  name: string; // 网站名称
  title: string; // 网站标题
  titleShort: string; // 简短标题
  titleTemplate: string; // 标题模板
  description: string; // 网站描述
  keywords: string[]; // 关键词列表
  canonical: string; // 规范链接
  themeColor: string; // 主题颜色
  github: string; // GitHub仓库地址
  authorGitHub: string; // GitHub用户名
  author: SiteAuthor[]; // 作者信息数组
  creator: SiteCreator; // 创建者信息
  publisher: SiteCreator; // 发布者信息
  domain: SiteDomain; // 域名配置
  og: SiteOpenGraph; // Open Graph配置
  images: SiteImage[]; // 图片配置数组
}
