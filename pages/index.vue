<script setup lang="ts">
import { useHead, useI18n } from "#imports";
import HomeKeguangPage from "~/components/home/KeguangPage.vue";

definePageMeta({ layout: 'keguang' });

const { t } = useI18n();

useHead(() => ({
  title: t("homePage.pageTitle"),
  meta: [{ name: "description", content: t("homePage.metaDescription") }],
}));
</script>

<template>
  <HomeKeguangPage />
</template>
