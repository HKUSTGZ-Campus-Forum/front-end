<script setup lang="ts">
import { NuxtLayout } from '#components';

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

<script setup>
import { useAuth } from '~/composables/useAuth';

const { init } = useAuth();

// 确保应用启动时检查登录状态
onMounted(() => {
  init();
});
</script>