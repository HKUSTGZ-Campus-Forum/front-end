<script setup lang="ts">
import type { FeedbackMergeRequestStatus } from "~/types/feedback";

const props = defineProps<{
  status: FeedbackMergeRequestStatus;
}>();

const { t } = useI18n();

const statusMeta = computed(() => {
  switch (props.status) {
    case "open":
      return { label: t("feedbackModule.mergeRequest.status.open"), tone: "open" };
    case "author_changes_requested":
      return { label: t("feedbackModule.mergeRequest.status.author_changes_requested"), tone: "warning" };
    case "author_rejected":
      return { label: t("feedbackModule.mergeRequest.status.author_rejected"), tone: "danger" };
    case "author_accepted_pending_admin":
      return { label: t("feedbackModule.mergeRequest.status.author_accepted_pending_admin"), tone: "info" };
    case "admin_rejected":
      return { label: t("feedbackModule.mergeRequest.status.admin_rejected"), tone: "danger" };
    case "merged":
      return { label: t("feedbackModule.mergeRequest.status.merged"), tone: "success" };
    case "withdrawn":
      return { label: t("feedbackModule.mergeRequest.status.withdrawn"), tone: "muted" };
    default:
      return { label: props.status, tone: "muted" };
  }
});
</script>

<template>
  <span class="feedback-merge-request-status-badge" :class="`feedback-merge-request-status-badge--${statusMeta.tone}`">
    {{ statusMeta.label }}
  </span>
</template>

<style scoped lang="scss">
.feedback-merge-request-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid transparent;

  &--open {
    background: color-mix(in srgb, var(--interactive-primary, #26a4ff) 12%, var(--surface-primary, #fff));
    border-color: color-mix(in srgb, var(--interactive-primary, #26a4ff) 24%, var(--surface-primary, #fff));
    color: var(--interactive-primary, #26a4ff);
  }

  &--warning {
    background: color-mix(in srgb, var(--semantic-warning) 16%, var(--surface-primary, #fff));
    border-color: color-mix(in srgb, var(--semantic-warning) 28%, var(--surface-primary, #fff));
    color: #9a6500;
  }

  &--danger {
    background: color-mix(in srgb, var(--semantic-error) 12%, var(--surface-primary, #fff));
    border-color: color-mix(in srgb, var(--semantic-error) 24%, var(--surface-primary, #fff));
    color: var(--semantic-error);
  }

  &--info {
    background: color-mix(in srgb, #3157a3 12%, var(--surface-primary, #fff));
    border-color: color-mix(in srgb, #3157a3 22%, var(--surface-primary, #fff));
    color: #3157a3;
  }

  &--success {
    background: color-mix(in srgb, var(--semantic-success) 14%, var(--surface-primary, #fff));
    border-color: color-mix(in srgb, var(--semantic-success) 26%, var(--surface-primary, #fff));
    color: var(--semantic-success);
  }

  &--muted {
    background: var(--surface-secondary, #f4f8fd);
    border-color: var(--border-secondary, #d9e9fb);
    color: var(--text-secondary, #5f7698);
  }
}
</style>
