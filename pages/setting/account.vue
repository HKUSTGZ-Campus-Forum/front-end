<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePersistHomeStore } from "~/store/modules/home";
import AccountSettings from "~/components/setting/AccountSettings.vue";

definePageMeta({
  title: '账号设置',
  middleware: 'auth',
  layout: 'keguang',
});

useHead({
  title: '账号设置 - UniKorn Campus',
  meta: [{ name: 'description', content: '管理您的账号信息、密码和邮箱验证' }]
});

const homeStore = usePersistHomeStore();
</script>

<template>
  <div class="kg-settings-page">
    <div class="kg-settings-header">
      <h1 class="kg-page-title">账号设置</h1>
      <p class="kg-page-subtitle">管理您的账号信息、密码和邮箱验证</p>
    </div>
    <div class="kg-card">
      <AccountSettings />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-settings-page {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-settings-header { margin-bottom: 24px; }

.kg-page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.kg-page-subtitle { font-size: 0.9rem; color: var(--text-secondary); margin: 0; }

.kg-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-medium);
  padding: 28px 32px;
}
</style>
