<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import { useHead } from "#imports";

// 获取认证功能
const { init } = useAuth();

// 确保应用启动时检查登录状态
onMounted(() => {
  if (process.client) {
    init();
  }
});

useHead({
  title: 'UniKorn 科广汇',
  meta: [
    { name: 'description', content: 'uniKonwn - Campus Forum' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})
</script>

<!-- this is an example module -->
