<script setup lang="ts">
import type { CommunitySection } from "~/composables/useCommunitySection";

const props = defineProps<{
  modelValue: CommunitySection;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: CommunitySection): void;
}>();

const { t } = useI18n();
const route = useRoute();

const options: CommunitySection[] = ["forum", "feedback", "activity"];

function isCommunitySection(value: unknown): value is CommunitySection {
  return value === "forum" || value === "feedback" || value === "activity";
}

const currentSection = computed<CommunitySection>(() => {
  const section = Array.isArray(route.query.section)
    ? route.query.section[0]
    : route.query.section;

  if (isCommunitySection(section)) {
    return section;
  }

  if (import.meta.client) {
    const browserSection = new URLSearchParams(window.location.search).get("section");
    if (isCommunitySection(browserSection)) {
      return browserSection;
    }
  }

  return props.modelValue;
});
</script>

<template>
  <div class="community-primary-tabs">
    <button
      v-for="section in options"
      :key="section"
      type="button"
      :class="['community-primary-tabs__button', { active: currentSection === section }]"
      @click="emit('update:modelValue', section)"
    >
      {{ t(`community.sections.${section}`) }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.community-primary-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.community-primary-tabs__button {
  padding: 6px 18px;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  background: #ffffff;
  color: #4a6080;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #26a4ff;
    color: #26a4ff;
  }

  &.active {
    background: #26a4ff;
    border-color: #26a4ff;
    color: #fff;
    font-weight: 600;
  }
}
</style>
