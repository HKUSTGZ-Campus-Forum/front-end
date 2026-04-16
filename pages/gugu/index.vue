<script setup lang="ts">
import { useHead } from "#imports";

definePageMeta({ layout: "keguang" });

useHead({
  title: "咕咕 - UniKorn 科广汇",
  meta: [{ name: "robots", content: "noindex" }],
});

await navigateTo("/", { replace: true });
</script>

<template>
  <div />
</template>
