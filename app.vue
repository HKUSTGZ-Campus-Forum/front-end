<template>
  <NuxtLayout>
    <NuxtPage />
    <AppUpdateToast />
  </NuxtLayout>
</template>

<script setup lang="ts">
import AppUpdateToast from "~/components/pwa/AppUpdateToast.vue";
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
  link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
}));
</script>

<!-- this is an example module -->
