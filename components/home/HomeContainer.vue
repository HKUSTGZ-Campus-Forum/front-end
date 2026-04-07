<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { usePersistHomeStore } from '~/store/modules/home';
import { ref, onMounted, onUnmounted } from 'vue';

const homeStore = usePersistHomeStore();
const { fold } = storeToRefs(homeStore);

// Mobile state management
const isMobile = ref(false);
const showMobileOverlay = ref(false);

const checkIsMobile = () => {
  if (process.client) {
    isMobile.value = window.innerWidth <= 768;
    if (isMobile.value && !fold.value.updates) {
      homeStore.fold.updates = true;
    }
  }
};

const handleResize = () => {
  checkIsMobile();
  if (!isMobile.value) {
    showMobileOverlay.value = false;
  }
};

const toggleMobileSidebar = () => {
  if (isMobile.value) {
    showMobileOverlay.value = !showMobileOverlay.value;
  } else {
    homeStore.toggleSidebar();
  }
};

const closeMobileOverlay = () => {
  if (isMobile.value) {
    showMobileOverlay.value = false;
  }
};

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
      @update:folded="homeStore.fold.updates = $event"
      @close-mobile="closeMobileOverlay"
    />

    <!-- Mobile overlay -->
    <div
      v-if="isMobile && showMobileOverlay"
      class="mobile-overlay"
      @click="closeMobileOverlay"
    ></div>

    <!-- 主内容区 -->
    <div class="main-content" :class="{
      'sidebar-collapsed': fold.updates && !isMobile,
      'mobile-content': isMobile,
    }">
      <div class="content-wrapper">
        <slot></slot>
      </div>
      <CommonFooter />
    </div>

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
  margin-left: 200px;
  margin-top: 70px;
  min-height: calc(100vh - 70px);
  transition: margin-left 0.3s ease;
  background: var(--bg-primary, transparent);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;

  .content-wrapper {
    flex: 1;
    padding: 1rem;
  }

  &.sidebar-collapsed {
    margin-left: 100px;
  }

  &.mobile-content {
    margin-left: 0;
    margin-top: 60px;
    min-height: calc(100vh - 60px);

    .content-wrapper {
      padding: 0.75rem;
    }
  }
}

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

@media (max-width: 1024px) and (min-width: 769px) {
  .main-content {
    &.sidebar-collapsed {
      margin-left: 80px;
    }
  }
}

@media (max-width: 480px) {
  .main-content .content-wrapper {
    padding: 0.5rem;
  }
}
</style>
