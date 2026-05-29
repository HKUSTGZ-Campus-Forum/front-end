<script setup lang="ts">
import type { CreateFeedbackPayload, Feedback } from "~/types/feedback";

const emit = defineEmits<{
  (e: "submitted", feedback: Feedback): void;
}>();

const { createFeedback } = useFeedback();
const { t } = useI18n();

const title = ref("");
const markdownContent = ref("");
const submitting = ref(false);
const error = ref("");

async function handleSubmit() {
  if (!title.value.trim()) {
    error.value = t("feedbackModule.form.titleRequired");
    return;
  }

  if (!markdownContent.value.trim()) {
    error.value = t("feedbackModule.form.contentRequired");
    return;
  }

  try {
    submitting.value = true;
    error.value = "";
    const payload: CreateFeedbackPayload = {
      title: title.value.trim(),
      markdown_content: markdownContent.value.trim(),
    };
    const feedback = await createFeedback(payload);
    emit("submitted", feedback);
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("feedbackModule.form.submitFailed");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="feedback-form" @submit.prevent="handleSubmit">
    <label class="feedback-form__field">
      <span class="feedback-form__label">{{ t("feedbackModule.form.titleLabel") }}</span>
      <input
        v-model="title"
        type="text"
        maxlength="200"
        :placeholder="t('feedbackModule.form.titlePlaceholder')"
      />
    </label>

    <label class="feedback-form__field">
      <span class="feedback-form__label">{{ t("feedbackModule.form.contentLabel") }}</span>
      <span class="feedback-form__hint">{{ t("feedbackModule.form.contentHint") }}</span>
      <CommonMarkdownEditor v-model="markdownContent" height="360px" />
    </label>

    <p v-if="error" class="feedback-form__error">{{ error }}</p>

    <div class="feedback-form__actions">
      <button type="submit" class="feedback-form__submit" :disabled="submitting">
        {{ submitting ? t("feedbackModule.form.submitting") : t("feedbackModule.form.submit") }}
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feedback-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.feedback-form__label {
  color: var(--text-primary);
  font-weight: 700;
}

.feedback-form__hint {
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.6;
}

input {
  min-height: 48px;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-primary);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: color-mix(in srgb, var(--text-secondary) 72%, white);
  }

  &:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 16%, transparent);
  }
}

.feedback-form__actions {
  display: flex;
  justify-content: flex-end;
}

.feedback-form__submit {
  min-height: 46px;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 999px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--interactive-hover);
    transform: translateY(-1px);
  }

  &:disabled {
    background: var(--interactive-disabled);
    cursor: not-allowed;
  }
}

.feedback-form__error {
  margin: 0;
  color: var(--semantic-error);
}
</style>
