<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePersistHomeStore } from "~/store/modules/home";
import AccountSettings from "~/components/setting/AccountSettings.vue";

// 获取主页状态
const homeStore = usePersistHomeStore();

// 设置页面元数据
definePageMeta({
  title: '账号设置',
  middleware: 'auth' // Require authentication
});

// 设置头部信息
useHead({
  title: '账号设置 - UniKorn Campus',
  meta: [
    { name: 'description', content: '管理您的账号信息、密码和邮箱验证' }
  ]
});
</script>

<template>
  <HomeContainer>
    <div class="settings-container">
      <h1 class="page-title">账号设置</h1>
      <AccountSettings />
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