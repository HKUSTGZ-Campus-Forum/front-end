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
  <!-- 页面根容器 -->
  <div class="root">
    <!-- 引入首页主要内容组件 -->
    <HomeContainer />
    <!-- 测试图片 -->
    <img src="/image/testpic1.jpg" />
  </div>
</template>

<style lang="scss" scoped>
/* 根容器样式 */
.root {
  display: flex; // 使用弹性布局
  flex-direction: column; // 垂直方向排列
  height: 100%; // 充满高度
  min-height: calc(100dvh - 75px); // 最小高度为视口高度减去75px
  max-width: 80rem; // 最大宽度限制
  margin: 0 auto; // 水平居中
  padding: 17px; // 内边距

  backdrop-filter: blur(8px); // 背景模糊效果
  background-color: rgba(255, 255, 255, 0.5); // 半透明白色背景
}

/* 响应式布局：屏幕宽度小于1000px时的样式 */
@media (max-width: 1000px) {
  .root {
    min-height: calc(100dvh - 63px); // 调整最小高度
    padding: 17px 10px; // 调整水平内边距
  }
}
</style>
