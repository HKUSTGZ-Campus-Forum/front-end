<script setup lang="ts">
import type { FeedbackVersion } from "~/types/feedback";

const props = defineProps<{
  versions: FeedbackVersion[];
}>();

const { t, locale } = useI18n();

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);
</script>

<template>
  <section class="version-history-panel">
    <h3>{{ t("feedbackModule.versionHistory.title") }}</h3>
    <div v-if="props.versions.length" class="version-history-panel__list">
      <article v-for="version in props.versions" :key="version.id" class="version-history-panel__item">
        <div class="version-history-panel__meta">
          <strong>{{ t("feedbackModule.versionHistory.version", { count: version.version_number }) }}</strong>
          <span>{{ dateFormatter.format(new Date(version.created_at)) }}</span>
        </div>
        <p>{{ version.markdown_content.slice(0, 120) }}{{ version.markdown_content.length > 120 ? "..." : "" }}</p>
      </article>
    </div>
    <p v-else class="version-history-panel__empty">{{ t("feedbackModule.versionHistory.empty") }}</p>
  </section>
</template>

<style scoped lang="scss">
.version-history-panel {
  padding: 24px 28px;
  border-radius: 16px;
  background: var(--surface-primary);
  border: 1.5px solid var(--border-primary);
  box-shadow: var(--shadow-small);

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    line-height: 1.4;
    font-weight: 700;
  }
}

.version-history-panel__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.version-history-panel__item {
  padding-top: 14px;
  border-top: 1px solid var(--border-secondary);

  &:first-child {
    padding-top: 0;
    border-top: none;
  }

  p {
    margin: 8px 0 0;
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.65;
    white-space: pre-wrap;
  }
}

.version-history-panel__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-primary);
  font-size: 0.86rem;

  span {
    color: var(--text-secondary);
  }
}

.version-history-panel__empty {
  margin: 16px 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .version-history-panel {
    padding: 20px;
  }
}
</style>
