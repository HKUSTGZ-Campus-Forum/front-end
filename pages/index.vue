<script setup lang="ts">
import { useHead } from "#imports";
import { hkustgz } from "~/config/hkustgz";
import HomeKeguangPage from "~/components/home/KeguangPage.vue";

definePageMeta({ layout: 'keguang' });

useHead({
  title: "主页 - UniKorn 科广汇",
  meta: [{ name: "description", content: hkustgz.description }],
});
</script>

<template>
  <HomeKeguangPage />
</template>
