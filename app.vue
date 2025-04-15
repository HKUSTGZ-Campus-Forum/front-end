<script setup lang="ts">
import { NuxtLayout } from '#components';
import { useAuth } from '~/composables/useAuth';

const { init } = useAuth();

// 确保应用启动时检查登录状态
onMounted(() => {
  init();
});

</script>

<template>
  <!-- <div> -->
  <!-- <NuxtRouteAnnouncer />
    <NuxtWelcome /> -->
<NuxtLayout>
  <NuxtPage />
</NuxtLayout>
  <!-- </div> -->
</template>