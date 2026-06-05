<script setup lang="ts">
import type { Feedback } from "~/types/feedback";

definePageMeta({
  layout: "keguang",
  middleware: "auth",
});

const { getLocalePath } = useAppLocale();
const { t } = useI18n();

useHead(() => ({
  title: t("feedbackModule.create.pageTitle"),
  meta: [{ name: "description", content: t("feedbackModule.create.metaDescription") }],
}));

const creationTips = computed(() => [
  t("feedbackModule.create.tips.context"),
  t("feedbackModule.create.tips.impact"),
  t("feedbackModule.create.tips.followUp"),
]);

function handleSubmitted(feedback: Feedback) {
  navigateTo(getLocalePath(`/feedback/${feedback.id}`));
}
</script>

<template>
  <div class="feedback-create-page">
    <div class="feedback-create-page__back">
      <NuxtLink :to="getLocalePath('/feedback')">{{ t("feedbackModule.create.back") }}</NuxtLink>
    </div>

    <header class="feedback-create-page__header">
      <h1>{{ t("feedbackModule.create.title") }}</h1>
      <p>{{ t("feedbackModule.create.subtitle") }}</p>
    </header>

    <section class="feedback-create-page__notice">
      <div class="feedback-create-page__notice-head">
        <h2>{{ t("feedbackModule.create.noteTitle") }}</h2>
        <p>{{ t("feedbackModule.create.noteBody") }}</p>
      </div>
      <ul class="feedback-create-page__tips">
        <li v-for="tip in creationTips" :key="tip">{{ tip }}</li>
      </ul>
    </section>

    <section class="feedback-create-page__card">
      <FeedbackForm @submitted="handleSubmitted" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.feedback-create-page {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.feedback-create-page__back a {
  color: var(--text-secondary);
  text-decoration: none;

  &:hover {
    color: var(--interactive-primary);
  }
}

.feedback-create-page__header {
  margin-top: 12px;
  margin-bottom: 20px;

  h1 {
    margin: 0 0 6px;
    color: var(--text-primary);
    font-size: 1.7rem;
  }

  p {
    margin: 0;
    max-width: 52rem;
    color: var(--text-secondary);
    line-height: 1.7;
  }
}

.feedback-create-page__notice,
.feedback-create-page__card {
  background: var(--surface-primary);
  border: var(--card-border, 1px solid var(--border-primary));
  box-shadow: var(--card-shadow, var(--shadow-small));
  border-radius: 18px;
}

.feedback-create-page__notice {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.9fr);
  gap: 18px;
  padding: 20px 22px;
  margin-bottom: 16px;
}

.feedback-create-page__notice-head {
  h2 {
    margin: 0 0 8px;
    color: var(--text-primary);
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.75;
  }
}

.feedback-create-page__tips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;

  li {
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--surface-secondary);
    border: 1px solid var(--border-secondary);
    color: var(--text-secondary);
    line-height: 1.65;
  }
}

.feedback-create-page__card {
  padding: 22px;
}

@media (max-width: 860px) {
  .feedback-create-page__notice {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .feedback-create-page {
    padding-left: 16px;
    padding-right: 16px;
  }

  .feedback-create-page__card,
  .feedback-create-page__notice {
    padding: 18px;
  }
}
</style>
