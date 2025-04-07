<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePersistHomeStore } from "~/store/homeStore";
import BackgroundSettings from "~/components/setting/BackgroundSettings.vue";
// 获取主页状态
const homeStore = usePersistHomeStore();
const { fold } = storeToRefs(homeStore);

// 处理侧边栏状态更新
function handleSidebarUpdate(newValue: boolean) {
  homeStore.fold.updates = newValue;
}
</script>
<template>
  <HomePinned
    :sidebarFolded="fold.updates"
    @toggle-sidebar="homeStore.toggleSidebar()"
  />
  <HomeSidebar :folded="fold.updates" @update:folded="handleSidebarUpdate" />
  <div class="settings-page">
    <h1 class="settings-title">用户设置</h1>
    <BackgroundSettings />
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.settings-title {
  margin-bottom: 1rem; /* 增加标题和内容之间的间距 */
  padding-top: 2rem; /* 添加顶部内边距，防止标题被遮住 */
  font-size: 2rem; /* 设置标题大小 */
  color: var(--text-color, #333); /* 使用变量控制文本颜色 */
}
</style>
