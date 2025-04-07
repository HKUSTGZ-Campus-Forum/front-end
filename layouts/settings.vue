<template>
  <div class="settings-layout">
    <div class="settings-sidebar">
      <h3>设置</h3>
      <nav>
        <NuxtLink to="/setting/background">背景设置</NuxtLink>
        <NuxtLink to="/setting/account">账号设置</NuxtLink>
        <NuxtLink to="/setting/notifications">通知设置</NuxtLink>
        <!-- 更多设置链接 -->
      </nav>
    </div>

    <div class="settings-content">
      <slot />
      <!-- 这里会渲染各个设置页面 -->
    </div>
  </div>
</template>

<script setup lang="ts">
// 任何设置相关的逻辑
</script>

<style lang="scss" scoped>
.settings-layout {
  display: flex;
  min-height: calc(100vh - 56px); /* 减去顶部导航栏高度 */

  .settings-sidebar {
    width: 250px;
    background-color: #f5f5f5;
    padding: 1rem;

    h3 {
      margin-top: 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }

    nav {
      display: flex;
      flex-direction: column;
      gap: 8px;

      a {
        padding: 8px 10px;
        border-radius: 4px;
        text-decoration: none;
        color: #333;

        &:hover {
          background-color: #e0e0e0;
        }

        &.router-link-active {
          background-color: #0d6efd;
          color: white;
        }
      }
    }
  }

  .settings-content {
    flex: 1;
    padding: 1rem 2rem;
  }
}
</style>
