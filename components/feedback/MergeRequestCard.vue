<script setup lang="ts">
import type { FeedbackMergeRequest } from "~/types/feedback";
import FeedbackMergeRequestStatusBadge from "~/components/feedback/FeedbackMergeRequestStatusBadge.vue";

const props = defineProps<{
  mergeRequest: FeedbackMergeRequest;
}>();

const { getLocalePath } = useAppLocale();
const { t } = useI18n();
</script>

<template>
  <NuxtLink
    :to="getLocalePath(`/feedback/merge-requests/${mergeRequest.id}`)"
    class="merge-request-card"
  >
    <div class="merge-request-card__head">
      <h4>{{ mergeRequest.title }}</h4>
      <FeedbackMergeRequestStatusBadge :status="mergeRequest.status" />
    </div>
    <p class="merge-request-card__summary">
      {{ mergeRequest.change_summary || t("feedbackModule.mergeRequest.summaryFallback") }}
    </p>
    <div class="merge-request-card__meta">
      <span>{{ t("feedbackModule.mergeRequest.proposer", { id: mergeRequest.author_id }) }}</span>
      <span>{{ t("feedbackModule.mergeRequest.baseVersion", { version: mergeRequest.base_version_id }) }}</span>
    </div>
  </NuxtLink>
</template>

<style scoped lang="scss">
.merge-request-card {
  display: block;
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
  text-decoration: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-medium);
  }
}

.merge-request-card__head,
.merge-request-card__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}

.merge-request-card__head h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.98rem;
  line-height: 1.45;
}

.merge-request-card__meta {
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.merge-request-card__summary {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.65;
}

.merge-request-card__meta {
  margin-top: 12px;
}
</style>
