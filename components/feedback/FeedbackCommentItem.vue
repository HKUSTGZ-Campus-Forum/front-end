<script setup lang="ts">
import type { FeedbackComment, FeedbackMergeComment } from "~/types/feedback";

type DiscussionComment = FeedbackComment | FeedbackMergeComment;

const { t, locale } = useI18n();

const props = defineProps<{
  comment: DiscussionComment;
  allComments: DiscussionComment[];
}>();

const replies = computed(() =>
  props.allComments.filter((item) => item.parent_comment_id === props.comment.id),
);

const displayContent = computed(() =>
  props.comment.visibility === "hidden"
    ? t("feedbackModule.comments.hidden")
    : props.comment.content,
);

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);
</script>

<template>
  <article class="feedback-comment-item">
    <div class="feedback-comment-item__meta">
      <span>{{ t("feedbackModule.comments.userFallback", { id: comment.user_id }) }}</span>
      <span>{{ dateFormatter.format(new Date(comment.created_at)) }}</span>
    </div>
    <p class="feedback-comment-item__content">{{ displayContent }}</p>
    <p v-if="comment.visibility === 'hidden'" class="feedback-comment-item__hidden-note">
      {{ t("feedbackModule.comments.hiddenNote") }}
    </p>

    <div v-if="replies.length" class="feedback-comment-item__replies">
      <FeedbackCommentItem
        v-for="reply in replies"
        :key="reply.id"
        :comment="reply"
        :all-comments="allComments"
      />
    </div>
  </article>
</template>

<style scoped lang="scss">
.feedback-comment-item {
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-secondary);
}

.feedback-comment-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.feedback-comment-item__content {
  margin: 10px 0 0;
  white-space: pre-wrap;
  color: var(--text-primary);
  line-height: 1.7;
}

.feedback-comment-item__hidden-note {
  margin: 8px 0 0;
  color: var(--warning-color, #9a6500);
  font-size: 0.88rem;
}

.feedback-comment-item__replies {
  margin-top: 12px;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-left: 2px solid var(--border-secondary);
}
</style>
