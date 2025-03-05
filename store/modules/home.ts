// 导入 Pinia 的 defineStore 函数，用于创建状态存储
import { defineStore } from "pinia";
// 导入首页状态存储的类型定义
import type { HomeStorePersist } from "../types/home";

// 创建一个持久化的首页状态存储
export const usePersistHomeStore = defineStore({
  id: "Home", // 存储的唯一标识符
  persist: true, // 启用状态持久化，数据会保存在本地存储中

  // 定义初始状态，使用类型注解确保类型安全
  state: (): HomeStorePersist => ({
    // fold 对象用于控制各个区块的折叠状态
    fold: {
      updates: true, // 更新区块的折叠状态
      topics: true, // 主题区块的折叠状态
      square: true, // 广场区块的折叠状态
      resources: true, // 资源区块的折叠状态
      sitemaps: true, // 站点地图区块的折叠状态
    },
  }),
});
