<script setup lang="ts">
import type { Feedback } from "~/types/feedback";

const props = defineProps<{
  feedback: Feedback;
}>();

const { getLocalePath, locale } = useAppLocale();
const { t } = useI18n();

const excerpt = computed(() => {
  const content = props.feedback.current_version?.markdown_content || "";
  return content.length > 140 ? `${content.slice(0, 140)}...` : content;
});

const authorName = computed(() =>
  props.feedback.author || t("feedbackModule.card.authorFallback", { id: props.feedback.author_id })
);

const metaItems = computed(() => [
  t("feedbackModule.card.author", { author: authorName.value }),
  t("feedbackModule.card.version", { count: props.feedback.current_version?.version_number || 0 }),
  t("feedbackModule.card.comments", { count: props.feedback.comments?.length || 0 }),
  t("feedbackModule.card.mergeRequests", { count: props.feedback.merge_requests?.length || 0 }),
]);

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
</script>

<template>
  <NuxtLink :to="getLocalePath(`/feedback/${feedback.id}`)" class="feedback-card">
    <div class="feedback-card__head">
      <FeedbackStatusBadge :status="feedback.status" />
      <span class="feedback-card__time">{{ formatUpdatedAt(feedback.updated_at) }}</span>
    </div>

    <h2 class="feedback-card__title">{{ feedback.title }}</h2>
    <p class="feedback-card__excerpt">{{ excerpt || t("feedbackModule.card.emptyExcerpt") }}</p>

    <div class="feedback-card__meta">
      <span v-for="item in metaItems" :key="item" class="feedback-card__meta-pill">{{ item }}</span>
    </div>
  </NuxtLink>
</template>

<style scoped lang="scss">
.feedback-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 100%;
  padding: 1.2rem 1.25rem;
  border-radius: 18px;
  background: var(--surface-primary);
  border: var(--card-border, 1px solid var(--border-primary));
  box-shadow: var(--card-shadow, var(--shadow-small));
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--interactive-primary);
    box-shadow: var(--shadow-medium);
  }
}

.feedback-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  justify-content: space-between;
}

.feedback-card__title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.05rem;
  line-height: 1.5;
}

.feedback-card__excerpt {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.feedback-card__time {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.feedback-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: auto;
  padding-top: 0.9rem;
  border-top: 1px solid var(--border-secondary);
}

.feedback-card__meta-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
}
</style>
