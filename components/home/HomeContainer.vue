<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { usePersistHomeStore } from '~/store/modules/home';
import { ref, onMounted, onUnmounted } from 'vue';

// 获取主页状态
const homeStore = usePersistHomeStore();
const { fold } = storeToRefs(homeStore);

// Mobile state management
const isMobile = ref(false);
const showMobileOverlay = ref(false);

// Check if device is mobile
const checkIsMobile = () => {
  if (process.client) {
    isMobile.value = window.innerWidth <= 768;
    // On mobile, sidebar should be collapsed by default
    if (isMobile.value && !fold.value.updates) {
      homeStore.fold.updates = true;
    }
  }
};

// Handle window resize
const handleResize = () => {
  checkIsMobile();
  // Close mobile overlay when switching to desktop
  if (!isMobile.value) {
    showMobileOverlay.value = false;
  }
};

// Toggle mobile sidebar
const toggleMobileSidebar = () => {
  if (isMobile.value) {
    showMobileOverlay.value = !showMobileOverlay.value;
  } else {
    homeStore.toggleSidebar();
  }
};

// Close mobile overlay when clicking outside
const closeMobileOverlay = () => {
  if (isMobile.value) {
    showMobileOverlay.value = false;
  }
};

// 处理侧边栏状态更新
function handleSidebarUpdate(newValue: boolean) {
  homeStore.fold.updates = newValue;
}

// Lifecycle hooks
onMounted(() => {
  checkIsMobile();
  if (process.client) {
    window.addEventListener('resize', handleResize);
  }
});

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('resize', handleResize);
  }
});
</script>

<template>
  <!-- 渲染首页固定内容组件 -->
  <div class="home-container" :class="{ 'mobile-mode': isMobile }">
    <HomePinned 
      :sidebarFolded="fold.updates" 
      :isMobile="isMobile"
      @toggle-sidebar="toggleMobileSidebar" 
    />
    <HomeSidebar 
      :folded="isMobile ? true : fold.updates" 
      :isMobile="isMobile"
      :showOnMobile="showMobileOverlay"
      @update:folded="handleSidebarUpdate"
      @close-mobile="closeMobileOverlay"
    />
    
    <!-- Mobile overlay -->
    <div 
      v-if="isMobile && showMobileOverlay" 
      class="mobile-overlay"
      @click="closeMobileOverlay"
    ></div>
    
    <!-- 添加内容区域 -->
    <div class="main-content" :class="{
      'sidebar-collapsed': fold.updates && !isMobile,
      'mobile-content': isMobile
    }">
      <div class="content-wrapper">
        <slot></slot>
      </div>
      
      <!-- Site Footer -->
      <CommonFooter />
    </div>

    <!-- PWA Install Guide -->
    <PwaInstallGuide />
  </div>
</template>

<style lang="scss" scoped>
.home-container {
  position: relative;
  min-height: 100vh;
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--modal-backdrop);
  z-index: 1005;
  backdrop-filter: var(--effect-blur);
}

.main-content {
  margin-left: 200px; /* 侧边栏展开时的边距 */
  margin-top: 70px; /* 顶部栏高度 */
  min-height: calc(100vh - 70px);
  transition: margin-left 0.3s ease;
  background: var(--bg-primary, transparent); /* Use theme background */
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  
  .content-wrapper {
    flex: 1;
    padding: 1rem;
  }
  
  &.sidebar-collapsed {
    margin-left: 100px; /* 侧边栏折叠时的边距 */
  }
  
  // Mobile styles
  &.mobile-content {
    margin-left: 0;
    margin-top: 60px; /* Shorter mobile header */
    min-height: calc(100vh - 60px);
    
    .content-wrapper {
      padding: 0.75rem;
    }
  }
}

// Mobile-specific layout adjustments
@media (max-width: 768px) {
  .main-content {
    margin-left: 0 !important;
    margin-top: 60px;
    min-height: calc(100vh - 60px);
    
    .content-wrapper {
      padding: 0.75rem;
    }
  }
}

// Tablet landscape adjustments
@media (max-width: 1024px) and (min-width: 769px) {
  .main-content {
    &.sidebar-collapsed {
      margin-left: 80px;
    }
  }
}

// Small mobile devices
@media (max-width: 480px) {
  .main-content .content-wrapper {
    padding: 0.5rem;
  }
}
</style>