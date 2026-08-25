<template>
  <NuxtLayout>
    <NuxtPage />
    <AppUpdateToast />
    <MascotOverlay />
  </NuxtLayout>
</template>

<script setup lang="ts">
import AppUpdateToast from "~/components/pwa/AppUpdateToast.vue";
import MascotOverlay from "~/components/mascot/Overlay.client.vue";
import { useAuth } from "~/composables/useAuth";
import { useHead, useI18n } from "#imports";

const { init } = useAuth();
const { t } = useI18n();

onMounted(() => {
  if (process.client) {
    init();
  }
});

useHead(() => ({
  title: t("common.appTitle"),
  meta: [{ name: "description", content: t("common.description") }],
  link: [{ rel: "icon", type: "image/x-icon", href: "/favicon-white.ico" }],
  script: [
    {
      // Prevent FOUC: apply persisted theme before first paint.
      // Key "theme" matches the Pinia persisted state store id (see store/themeStore.ts).
      key: 'theme-fouc',
      innerHTML: `(function(){try{var r=localStorage.getItem('theme');var id=r?JSON.parse(r).currentTheme:null;if(id){var el=document.documentElement;el.dataset.theme=id;if(id==='deep-dark'){el.style.colorScheme='dark';}}}catch(e){}})();`,
    },
  ],
}));
</script>

<!-- this is an example module -->
