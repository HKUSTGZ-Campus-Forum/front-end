<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { usePersistHomeStore } from '~/store/homeStore';

// 获取主页状态
const homeStore = usePersistHomeStore();
const { fold } = storeToRefs(homeStore);

// 处理侧边栏状态更新
function handleSidebarUpdate(newValue: boolean) {
  homeStore.fold.updates = newValue;
}
</script>

<template>
  <!-- 渲染首页固定内容组件 -->
  <div>
    <HomePinned :sidebarFolded="fold.updates" @toggle-sidebar="homeStore.toggleSidebar()" />
    <HomeSidebar :folded="fold.updates" @update:folded="handleSidebarUpdate" />
    
    <!-- 添加内容区域 -->
    <div class="main-content" :class="{'sidebar-collapsed': fold.updates}">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.main-content {
  margin-left: 200px; /* 侧边栏展开时的边距 */
  margin-top: 70px; /* 顶部栏高度 */
  padding: 1rem;
  min-height: calc(100vh - 70px);
  transition: margin-left 0.3s ease;
  
  &.sidebar-collapsed {
    margin-left: 100px; /* 侧边栏折叠时的边距 */
  }
}
</style>