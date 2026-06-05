<script setup lang="ts">
const { t } = useI18n();

const props = defineProps<{
  disabled?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "submit", content: string): void;
}>();

const content = ref("");

function handleSubmit() {
  const normalized = content.value.trim();
  if (!normalized || props.disabled) return;
  emit("submit", normalized);
  content.value = "";
}
</script>

<template>
  <form class="feedback-comment-form" @submit.prevent="handleSubmit">
    <textarea
      v-model="content"
      :disabled="disabled"
      :placeholder="placeholder || t('feedbackModule.comments.placeholder')"
      rows="4"
    />
    <div class="feedback-comment-form__actions">
      <button type="submit" :disabled="disabled || !content.trim()">
        {{ t("feedbackModule.comments.submit") }}
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.feedback-comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;

  textarea {
    width: 100%;
    border-radius: 12px;
    border: 1px solid var(--border-primary);
    padding: 12px 14px;
    resize: vertical;
    background: var(--surface-primary);
    color: var(--text-primary);
    line-height: 1.6;

    &:focus {
      outline: none;
      border-color: var(--border-focus);
    }

    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.feedback-comment-form__actions {
  display: flex;
  justify-content: flex-end;

  button {
    min-height: 42px;
    padding: 8px 20px;
    border: none;
    border-radius: 999px;
    background: var(--border-focus);
    color: var(--text-inverse);
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }
  }
}
</style>
