<script setup lang="ts">
// 导入国际化相关功能（如果需要）
import { useI18n } from "vue-i18n";
const { t } = useI18n();
</script>

<script setup>
defineProps({
  folded: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div class="sidebar" :class="{ 'collapsed': folded }">
    <div class="sidebar-content">
      <div class="sidebar-header">
        <h3>导航菜单</h3>
      </div>
      <ul class="nav-items">
        <li><NuxtLink to="/">首页</NuxtLink></li>
        <li><NuxtLink to="/posts">论坛</NuxtLink></li>
        <li><NuxtLink to="/users">用户</NuxtLink></li>
        <!-- 更多菜单项 -->
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 56px; /* 与顶部导航栏高度相匹配 */
  height: calc(100vh - 56px);
  width: 250px;
  background-color: #343a40;
  color: white;
  transition: all 0.3s ease;
  z-index: 1000;
  
  &.collapsed {
    width: 60px;
    
    .nav-items span {
      display: none;
    }
  }
  
  .sidebar-content {
    padding: 1rem;
  }
  
  .nav-items {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      margin-bottom: 0.5rem;
    }
    
    a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      display: block;
      padding: 0.5rem;
      border-radius: 4px;
      
      &:hover, &.active {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }
}
</style>