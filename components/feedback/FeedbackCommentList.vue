<script setup lang="ts">
import type { FeedbackComment, FeedbackMergeComment } from "~/types/feedback";

type DiscussionComment = FeedbackComment | FeedbackMergeComment;

const { t } = useI18n();

const props = defineProps<{
  comments: DiscussionComment[];
  commentsEnded: boolean;
  isLoggedIn: boolean;
}>();

const emit = defineEmits<{
  (e: "create-comment", content: string): void;
}>();

const rootComments = computed(() =>
  props.comments.filter((comment) => !comment.parent_comment_id),
);

</script>

<template>
  <section class="feedback-comment-list">
    <div class="feedback-comment-list__head">
      <h3>{{ t("feedbackModule.comments.title") }}</h3>
      <p v-if="commentsEnded" class="feedback-comment-list__ended">{{ t("feedbackModule.comments.closed") }}</p>
    </div>

    <div v-if="isLoggedIn">
      <FeedbackCommentForm
        :disabled="commentsEnded"
        :placeholder="commentsEnded ? t('feedbackModule.comments.disabledPlaceholder') : t('feedbackModule.comments.placeholder')"
        @submit="emit('create-comment', $event)"
      />
    </div>
    <div v-else class="feedback-comment-list__login">
      {{ t("feedbackModule.comments.login") }}
    </div>

    <div v-if="rootComments.length" class="feedback-comment-list__items">
      <FeedbackCommentItem
        v-for="comment in rootComments"
        :key="comment.id"
        :comment="comment"
        :all-comments="comments"
      />
    </div>
    <p v-else class="feedback-comment-list__empty">{{ t("feedbackModule.comments.empty") }}</p>
  </section>
</template>

<style scoped lang="scss">
.feedback-comment-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feedback-comment-list__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;

  h3 {
    margin: 0;
    color: var(--text-primary, #203254);
  }
}

.feedback-comment-list__ended,
.feedback-comment-list__login,
.feedback-comment-list__empty {
  margin: 0;
  color: var(--text-secondary, #6b7f9b);
}

.feedback-comment-list__items {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
</style>
