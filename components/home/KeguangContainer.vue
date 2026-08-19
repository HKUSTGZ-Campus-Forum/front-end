<script setup lang="ts">
import { ref } from 'vue'

// Desktop: the sidebar auto-expands on hover (72px ⇄ 200px). Mobile: the
// sidebar becomes a slide-in drawer toggled by the topbar hamburger.
const sidebarExpanded = ref(false)
const mobileNavOpen = ref(false)

function openMobileNav() {
  mobileNavOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeMobileNav() {
  mobileNavOpen.value = false
  document.body.style.overflow = ''
}

function toggleMobileNav() {
  if (mobileNavOpen.value) closeMobileNav()
  else openMobileNav()
}
</script>

<template>
  <div class="kg-layout">
    <HomeKeguangSidebar
      @update:expanded="sidebarExpanded = $event"
      :mobile-open="mobileNavOpen"
      @close-mobile-nav="closeMobileNav"
    />

    <HomeKeguangPinned
      :sidebar-expanded="sidebarExpanded"
      :mobile-nav-open="mobileNavOpen"
      @toggle-mobile-nav="toggleMobileNav"
    />

    <div
      class="kg-layout__main"
      :class="{ 'kg-layout__main--expanded': sidebarExpanded }"
    >
      <div class="kg-layout__content">
        <slot />
      </div>
      <CommonFooter />
    </div>

    <!-- Mobile drawer scrim: tap to dismiss the sidebar -->
    <ClientOnly>
      <div
        v-if="mobileNavOpen"
        class="kg-layout__scrim"
        @click="closeMobileNav"
      ></div>
    </ClientOnly>

    <ClientOnly>
      <PwaInstallGuide />
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.kg-layout {
  position: relative;
  min-height: 100vh;
  background: var(--bg-primary);
}

.kg-layout__main {
  margin-left: 72px;
  margin-top: 64px;
  min-height: calc(100vh - 64px);
  background: var(--bg-primary);
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

.kg-layout__scrim {
  position: fixed;
  inset: 0;
  z-index: 1005;
  background: var(--modal-backdrop);
  touch-action: none;
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

  .kg-layout__scrim {
    z-index: 1005;
  }
}
</style>
