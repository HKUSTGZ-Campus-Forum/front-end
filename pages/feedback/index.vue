<script setup lang="ts">
definePageMeta({
  layout: "keguang",
});

const { getLocalePath } = useAppLocale();
const { persistSection } = useCommunitySection();

persistSection("feedback");

await navigateTo(
  {
    path: getLocalePath("/forum"),
    query: { section: "feedback" },
  },
  { replace: true }
);
</script>
