<script setup lang="ts">
// 导入 Nuxt 的 useHead 组合式函数，用于设置页面头部信息
import { useHead } from "#imports";
// 导入网站配置信息
import { hkustgz } from "~/config/hkustgz";

// 设置页面的元信息
useHead({
  title: "主页", // 设置页面标题
  meta: [
    {
      name: "description",
      content: hkustgz.description, // 设置页面描述
    },
  ],
  link: [
    {
      rel: "icon",
      type: "image/x-icon",
      href: "/testico1.ico", // 设置网站图标
    },
  ],
});
</script>

<template>
  <!-- 移除多余的HomeContainer嵌套 -->
  <HomeContainer>
    <div class="root">
      <!-- 测试图片 -->
      <!-- <img src="public/image/testpic1.jpg" /> -->
    </div>
  </HomeContainer>
</template>

<style lang="scss" scoped>
/* 根容器样式 */
.root {
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

/* 响应式布局：屏幕宽度小于1000px时的样式 */
@media (max-width: 1000px) {
  .root {
    min-height: calc(100dvh - 63px); // 调整最小高度
    padding: 17px 10px; // 调整水平内边距
  }
}
</style>
