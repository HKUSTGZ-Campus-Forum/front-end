<script setup lang="ts">
import { ref } from 'vue'

const sidebarExpanded = ref(false)
</script>

<template>
  <div class="kg-layout">
    <HomeKeguangSidebar @update:expanded="sidebarExpanded = $event" />

    <HomeKeguangPinned :sidebar-expanded="sidebarExpanded" />

    <div
      class="kg-layout__main"
      :class="{ 'kg-layout__main--expanded': sidebarExpanded }"
    >
      <div class="kg-layout__content">
        <slot />
      </div>
      <CommonFooter />
    </div>

    <ClientOnly>
      <PwaInstallGuide />
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.kg-layout {
  position: relative;
  min-height: 100vh;
  background: #EBF6FC;
}

.kg-layout__main {
  margin-left: 72px;
  margin-top: 84px;
  min-height: calc(100vh - 84px);
  background: #EBF6FC;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;

  &--expanded {
    margin-left: 200px;
  }
}

.kg-layout__content {
  flex: 1;
}

@media (max-width: 768px) {
  .kg-layout__main {
    margin-left: 0;
    margin-top: 64px;
    min-height: calc(100vh - 64px);

    &--expanded {
      margin-left: 0;
    }
  }
}
</style>
