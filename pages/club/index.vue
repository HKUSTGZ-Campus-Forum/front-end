<script setup lang="ts">
definePageMeta({ layout: "keguang" });

const { getLocalePath } = useAppLocale();
const { persistSection } = useCommunitySection();

persistSection("activity");

await navigateTo(
  {
    path: getLocalePath("/forum"),
    query: { section: "activity" },
  },
  { replace: true }
);
</script>
