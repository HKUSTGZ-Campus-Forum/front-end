<script setup lang="ts">
import { usePersistHomeStore } from "~/store/modules/home";
import { useThemeStore } from "~/store/themeStore";

definePageMeta({ layout: 'keguang' });

const homeStore = usePersistHomeStore();
const themeStore = useThemeStore();

onMounted(() => {
  navigateTo('/setting/theme');
});
</script>

<template>
  <div class="kg-redirect">
    <div class="kg-spinner"></div>
    <p>正在跳转到主题设置页面...</p>
  </div>
</template>

<style lang="scss" scoped>
.kg-redirect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  color: #4a6080;
  gap: 16px;
  p { margin: 0; }
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
