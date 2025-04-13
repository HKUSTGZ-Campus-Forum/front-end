import type { SiteConfig } from "./config";

// 导出香港科技大学(广州)网站的配置对象
export const hkustgz: SiteConfig = {
  // 基本网站信息
  name: "HKUST GZ", // 网站名称
  title: "HKUST GZ", // 网站标题
  titleShort: "HKUST GZ", // 简短标题
  titleTemplate: "%s - HKUST GZ", // 页面标题模板，%s 会被替换为具体页面标题
  description: "HKUST GZ", // 网站描述
  keywords: ["HKUST GZ"], // 网站关键词
  canonical: "https://hkustgz.com", // 规范链接
  themeColor: "#006FEE", // 主题色

  // GitHub 相关配置
  github: "https://github.com/yourusername", // GitHub 仓库地址
  authorGitHub: "yourusername", // GitHub 用户名

  // 作者信息配置
  author: [
    { name: "", url: "" }, // 作者1信息
    { name: "", url: "" }, // 作者2信息
  ],

  // 创建者信息
  creator: {
    name: "", // 创建者名称
    mention: "", // 社交媒体提及
    url: "", // 创建者链接
  },

  // 发布者信息
  publisher: {
    name: "", // 发布者名称
    mention: "", // 社交媒体提及
    url: "", // 发布者链接
  },

  // 域名相关配置
  domain: {
    main: "https://hkust-gz.com", // 主域名
    imageBed: "https://cdn.jsdelivr.net/gh/yourusername/hkustgz@main/public", // 图床地址
    storage: "https://cdn.jsdelivr.net/gh/yourusername/hkustgz@main/public", // 存储地址
    telegram_group: "https://t.me/yourgroup", // Telegram 群组链接
    patch: "", // 补丁地址
    backup: "", // 备份地址
    sticker: "", // 贴纸地址
    nav: "", // 导航地址
    doc: "", // 文档地址
  },

  // Open Graph 协议配置
  og: {
    title: "HKUST GZ", // OG 标题
    description: "HKUST GZ", // OG 描述
    image: "/images/testpic1.jpg", // OG 图片
    url: "", // OG URL
  },

  // 网站图片配置
  images: [
    {
      url: "/images/testpic1.jpg", // 图片URL
      width: 1200, // 图片宽度
      height: 630, // 图片高度
      alt: "HKUST GZ", // 图片替代文本
    },
  ],
};
