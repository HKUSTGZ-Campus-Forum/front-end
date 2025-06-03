<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";

// 获取认证功能
const { init } = useAuth();

// 确保应用启动时检查登录状态
onMounted(() => {
  if (process.client) {
    init();
  }
});
</script>

<!-- this is an example module -->
