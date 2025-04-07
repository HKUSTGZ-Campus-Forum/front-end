<template>
  <div class="settings-page">
    <h1>用户设置</h1>
    <BackgroundSettings />
    <!-- 可能的其他设置组件 -->
  </div>
</template>

<script setup lang="ts">
import BackgroundSettings from "~/components/setting/BackgroundSettings.vue";
</script>

<style lang="scss" scoped>
.settings-page {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}
</style>
