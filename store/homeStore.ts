import { defineStore } from 'pinia';

export const usePersistHomeStore = defineStore('home', {
  // 定义状态
  state: () => ({
    fold: {
      updates: true
    }
  }),
  
  // 添加操作方法
  actions: {
    toggleSidebar() {
      this.fold.updates = !this.fold.updates;
    }
  },
  
  // 启用持久化
  persist: {
    storage: process.client ? localStorage : undefined
  }
});