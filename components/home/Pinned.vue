<script setup lang="ts">
// 从 vue-i18n 导入国际化钩子，用于多语言支持
import { useI18n } from "vue-i18n";
// 导入置顶主题的类型定义接口
import type { HomePinnedTopic } from "~/types/api/home.d.ts";
// 获取当前语言环境设置
const { locale } = useI18n();

// 使用 Nuxt 的 useLazyFetch 钩子异步获取置顶主题数据
const { data } = await useLazyFetch<HomePinnedTopic[]>(`/types/api/home/pin`, {
  method: "GET",
});
</script>

<template>
  <!-- 置顶主题容器 -->
  <div class="pinned">
    <!-- 使用 v-for 遍历置顶主题数据，生成主题链接列表 -->
    <NuxtLink
      v-for="(topic, index) in data"
      :key="index"
      :to="`/topic/${topic.tid}`"
    >
      <!-- 显示置顶图标 -->
      <Icon class="icon" name="lucide:pin" />
      <!-- 显示主题标题 -->
      <span>{{ topic.title }}</span>
      <!-- 显示格式化后的发布时间 -->
      <span>{{ formatTimeDifference(topic.time) }}</span>
    </NuxtLink>
  </div>
</template>

<style lang="scss" scoped>
/* 置顶主题容器样式 */
.pinned {
  display: flex; // 使用弹性布局
  flex-wrap: wrap; // 允许内容换行

  /* 链接样式 */
  a {
    color: var(--kungalgame-blue-5); // 使用主题蓝色
    font-size: 18px; // 设置字体大小
    font-weight: bold; // 加粗字体
    margin-bottom: 7px; // 下方间距
    margin-right: 17px; // 右侧间距

    /* 时间显示样式（最后一个span元素） */
    span:last-child {
      color: var(--kungalgame-font-color-0); // 使用主题字体颜色
      font-size: small; // 小号字体
      font-weight: initial; // 恢复默认字重
      margin-left: 17px; // 左侧间距
    }
  }
}

/* 置顶图标样式 */
.icon {
  color: var(--kungalgame-red-5); // 使用主题红色
  font-size: 17px; // 图标大小
  margin-right: 10px; // 右侧间距
}

/* 响应式设计：移动端适配（屏幕宽度 ≤ 700px） */
@media (max-width: 700px) {
  .pinned {
    padding-right: 17px; // 右侧内边距

    a {
      margin-right: 0; // 移除右侧间距
      font-size: 15px; // 减小字体大小
    }
  }
}
</style>
