<script setup lang="ts">
definePageMeta({ layout: "keguang" });

const route = useRoute();
const { getLocalePath } = useAppLocale();
const courseIdentifier = String(route.params.id || "");
const offering = String(route.params.semesterTag || "");

await navigateTo(getLocalePath({
  path: `/courses/${courseIdentifier}/reviews`,
  query: {
    ...route.query,
    ...(offering ? { offering } : {}),
  },
}), {
  replace: true,
  redirectCode: 301,
});
</script>

<template>
  <div></div>
</template>
