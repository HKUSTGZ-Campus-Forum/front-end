<script setup lang="ts">
import type { FeedbackStatus } from "~/types/feedback";

const props = defineProps<{
  status: FeedbackStatus;
}>();

const { t } = useI18n();

const statusMeta = computed(() => {
  switch (props.status) {
    case "published":
      return { label: t("feedbackModule.status.published"), tone: "published" };
    case "closed":
      return { label: t("feedbackModule.status.closed"), tone: "closed" };
    case "pending_review":
      return { label: t("feedbackModule.status.pending_review"), tone: "pending" };
    case "rejected":
      return { label: t("feedbackModule.status.rejected"), tone: "rejected" };
    default:
      return { label: props.status, tone: "pending" };
  }
});
</script>

<template>
  <span class="feedback-status-badge" :class="`feedback-status-badge--${statusMeta.tone}`">
    {{ statusMeta.label }}
  </span>
</template>

<style scoped lang="scss">
.feedback-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid transparent;

  &--published {
    background: color-mix(in srgb, var(--semantic-success) 14%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--semantic-success) 28%, var(--surface-primary));
    color: var(--semantic-success);
  }

  &--closed {
    background: var(--surface-secondary);
    border-color: var(--border-secondary);
    color: var(--text-secondary);
  }

  &--pending {
    background: color-mix(in srgb, var(--semantic-warning) 16%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--semantic-warning) 28%, var(--surface-primary));
    color: #9a6500;
  }

  &--rejected {
    background: color-mix(in srgb, var(--semantic-error) 12%, var(--surface-primary));
    border-color: color-mix(in srgb, var(--semantic-error) 26%, var(--surface-primary));
    color: var(--semantic-error);
  }
}
</style>
