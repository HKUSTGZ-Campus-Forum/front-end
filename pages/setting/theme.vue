<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePersistHomeStore } from "~/store/homeStore";
import ThemeSettings from "~/components/setting/ThemeSettings.vue";

// 获取主页状态
const homeStore = usePersistHomeStore();

// 设置页面元数据
definePageMeta({
  title: '主题设置'
});

// 设置头部信息
useHead({
  title: '主题设置 - UniKorn Campus',
  meta: [
    { name: 'description', content: '自定义您的校园论坛主题外观' }
  ]
});
</script>

<template>
  <HomeContainer>
    <div class="settings-container">
      <h1 class="page-title">主题设置</h1>
      <ThemeSettings />
    </div>
  </HomeContainer>
</template>

<style lang="scss" scoped>
.settings-container {
  max-width: 1200px;
  margin: 1rem auto;
  padding: 1rem;
  
  @media (min-width: 768px) {
    margin: 1.5rem auto;
    padding: 1.5rem;
  }
  
  .page-title {
    text-align: center;
    margin-top: 0;
    margin-bottom: 2rem;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-primary);
    padding: 0;
    
    @media (min-width: 768px) {
      text-align: left;
      font-size: 2rem;
    }
  }
}
</style>