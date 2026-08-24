<script setup lang="ts">
import { computed } from "vue";
import { buildHighlightedTextSegments } from "~/utils/textHighlight";

const props = withDefaults(defineProps<{
  text?: string | null;
  query?: string | null;
}>(), {
  text: "",
  query: "",
});

const segments = computed(() => buildHighlightedTextSegments(props.text, props.query));
</script>

<template>
  <template v-for="(segment, index) in segments" :key="`${index}-${segment.text}`">
    <mark v-if="segment.highlighted">{{ segment.text }}</mark>
    <template v-else>{{ segment.text }}</template>
  </template>
</template>
