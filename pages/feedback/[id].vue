<script setup lang="ts">
import type { Feedback, FeedbackVersion } from "~/types/feedback";
import MergeRequestCard from "~/components/feedback/MergeRequestCard.vue";
import VersionHistoryPanel from "~/components/feedback/VersionHistoryPanel.vue";

definePageMeta({
  layout: "keguang",
});

const { t, locale } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const feedbackId = computed(() => Number(route.params.id));
const { isLoggedIn } = useAuth();
const { getFeedback, getFeedbackVersions, createComment, createMergeRequest } = useFeedback();

const feedback = ref<Feedback | null>(null);
const versions = ref<FeedbackVersion[]>([]);
const loading = ref(true);
const error = ref("");
const mergeSummary = ref("");
const mergeMarkdown = ref("");
const mergeSubmitting = ref(false);
const mergeError = ref("");
const mergeSuccess = ref("");

const feedbackHubRoute = computed(() => ({
  path: localePath("/forum"),
  query: { section: "feedback" },
}));

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

const authorLabel = computed(() => {
  if (!feedback.value) return "";
  const author = feedback.value.author || t("feedbackModule.card.authorFallback", { id: feedback.value.author_id });
  return t("feedbackModule.card.author", { author });
});

useHead(() => ({
  title: feedback.value?.title
    ? `${feedback.value.title} - ${t("feedbackModule.detail.pageTitle")}`
    : t("feedbackModule.detail.pageTitle"),
  meta: [{ name: "description", content: t("feedbackModule.detail.metaDescription") }],
}));

async function fetchDetail() {
  try {
    loading.value = true;
    error.value = "";
    const [feedbackData, versionData] = await Promise.all([
      getFeedback(feedbackId.value),
      getFeedbackVersions(feedbackId.value),
    ]);
    feedback.value = feedbackData;
    versions.value = versionData;
    mergeMarkdown.value = feedbackData.current_version?.markdown_content || "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("feedbackModule.detail.errors.loadFailed");
  } finally {
    loading.value = false;
  }
}

async function handleCreateComment(content: string) {
  if (!feedback.value) return;
  try {
    await createComment(feedback.value.id, { content });
    await fetchDetail();
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("feedbackModule.detail.errors.commentFailed");
  }
}

async function handleCreateMergeRequest() {
  if (!feedback.value) return;
  if (!mergeMarkdown.value.trim()) {
    mergeError.value = t("feedbackModule.detail.errors.mergeBodyRequired");
    return;
  }

  try {
    mergeSubmitting.value = true;
    mergeError.value = "";
    mergeSuccess.value = "";
    await createMergeRequest(feedback.value.id, {
      change_summary: mergeSummary.value.trim(),
      proposed_markdown_content: mergeMarkdown.value.trim(),
    });
    mergeSuccess.value = t("feedbackModule.detail.mergeSuccess");
    mergeSummary.value = "";
    await fetchDetail();
  } catch (err) {
    mergeError.value = err instanceof Error ? err.message : t("feedbackModule.detail.errors.mergeSubmitFailed");
  } finally {
    mergeSubmitting.value = false;
  }
}

onMounted(fetchDetail);
</script>

<template>
  <div class="feedback-detail-page">
    <div class="feedback-detail-page__back-bar">
      <NuxtLink :to="feedbackHubRoute" class="feedback-detail-page__back-link">
        <ForumUiIcon name="back" class="feedback-detail-page__back-icon" />
        <span>{{ t("feedbackModule.detail.back") }}</span>
      </NuxtLink>
    </div>

    <p v-if="loading" class="feedback-detail-page__state">{{ t("common.loading") }}</p>
    <p v-else-if="error" class="feedback-detail-page__state feedback-detail-page__state--error">{{ error }}</p>

    <template v-else-if="feedback">
      <section class="feedback-detail-page__summary-card">
        <div class="feedback-detail-page__badge-row">
          <FeedbackStatusBadge :status="feedback.status" />
          <span v-if="feedback.comments_ended" class="feedback-detail-page__secondary-pill">
            {{ t("feedbackModule.comments.closed") }}
          </span>
        </div>

        <h1>{{ feedback.title }}</h1>
        <div class="feedback-detail-page__meta-row">
          <span>{{ authorLabel }}</span>
          <span>{{ t("feedbackModule.detail.updatedAt", { date: dateFormatter.format(new Date(feedback.updated_at)) }) }}</span>
        </div>
      </section>

      <div class="feedback-detail-page__layout">
        <main class="feedback-detail-page__main">
          <section class="feedback-detail-page__panel">
            <div class="feedback-detail-page__section-head">
              <div>
                <h2>{{ t("feedbackModule.detail.currentBodyTitle") }}</h2>
                <p>{{ t("feedbackModule.detail.currentBodyHint") }}</p>
              </div>
            </div>

            <CommonMarkdownContent
              class="kg-markdown-body"
              :content="feedback.current_version?.markdown_content"
            />
          </section>

          <section class="feedback-detail-page__panel">
            <div class="feedback-detail-page__section-head">
              <div>
                <h2>{{ t("feedbackModule.detail.mergeTitle") }}</h2>
                <p>{{ t("feedbackModule.detail.mergeHint") }}</p>
              </div>
            </div>

            <div v-if="feedback.merge_requests?.length" class="feedback-detail-page__merge-list">
              <MergeRequestCard
                v-for="item in feedback.merge_requests"
                :key="item.id"
                :merge-request="item"
              />
            </div>
            <p v-else class="feedback-detail-page__empty">{{ t("feedbackModule.detail.noMerges") }}</p>

            <div v-if="isLoggedIn && feedback.status === 'published'" class="feedback-detail-page__merge-form">
              <label>
                <span>{{ t("feedbackModule.detail.mergeSummaryLabel") }}</span>
                <input
                  v-model="mergeSummary"
                  type="text"
                  :placeholder="t('feedbackModule.detail.mergeSummaryPlaceholder')"
                />
              </label>
              <label>
                <span>{{ t("feedbackModule.detail.mergeBodyLabel") }}</span>
                <CommonMarkdownEditor v-model="mergeMarkdown" height="320px" />
              </label>
              <p v-if="mergeError" class="feedback-detail-page__error">{{ mergeError }}</p>
              <p v-if="mergeSuccess" class="feedback-detail-page__success">{{ mergeSuccess }}</p>
              <div class="feedback-detail-page__merge-actions">
                <button type="button" :disabled="mergeSubmitting" @click="handleCreateMergeRequest">
                  {{ mergeSubmitting ? t("feedbackModule.detail.mergeSubmitting") : t("feedbackModule.detail.mergeSubmit") }}
                </button>
              </div>
            </div>
            <p v-else-if="!isLoggedIn" class="feedback-detail-page__empty">
              {{ t("feedbackModule.detail.mergeLogin") }}
            </p>
          </section>

          <section class="feedback-detail-page__panel">
            <FeedbackCommentList
              :comments="feedback.comments || []"
              :comments-ended="feedback.comments_ended"
              :is-logged-in="isLoggedIn"
              @create-comment="handleCreateComment"
            />
          </section>
        </main>

        <aside class="feedback-detail-page__side">
          <section class="feedback-detail-page__info-panel">
            <h3>{{ t("feedbackModule.detail.sidebarTitle") }}</h3>
            <dl class="feedback-detail-page__info-list">
              <div>
                <dt>{{ t("feedbackModule.detail.feedbackId") }}</dt>
                <dd>#{{ feedback.id }}</dd>
              </div>
              <div>
                <dt>{{ t("feedbackModule.detail.statusLabel") }}</dt>
                <dd><FeedbackStatusBadge :status="feedback.status" /></dd>
              </div>
              <div>
                <dt>{{ t("feedbackModule.detail.versionCountLabel") }}</dt>
                <dd>{{ versions.length }}</dd>
              </div>
              <div>
                <dt>{{ t("feedbackModule.detail.commentCountLabel") }}</dt>
                <dd>{{ feedback.comments?.length || 0 }}</dd>
              </div>
            </dl>
          </section>

          <VersionHistoryPanel :versions="versions" />
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.feedback-detail-page {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}

.feedback-detail-page__back-bar {
  margin-bottom: 16px;
}

.feedback-detail-page__back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--border-focus);
  text-decoration: none;
  font-size: 0.9rem;

  &:hover {
    text-decoration: underline;
  }
}

.feedback-detail-page__back-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.feedback-detail-page__state {
  color: var(--text-secondary);

  &--error {
    color: var(--semantic-error);
  }
}

.feedback-detail-page__summary-card {
  padding: 24px 32px;
  border-radius: 16px;
  background: var(--surface-primary);
  border: 1.5px solid var(--border-primary);
  box-shadow: var(--shadow-small);
}

.feedback-detail-page__badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.feedback-detail-page__summary-card h1 {
  margin: 16px 0 0;
  color: var(--text-primary);
  font-size: 1.55rem;
  line-height: 1.4;
  font-weight: 700;
}

.feedback-detail-page__secondary-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-secondary);
  background: var(--surface-secondary);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 700;
}

.feedback-detail-page__meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.feedback-detail-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  margin-top: 20px;
}

.feedback-detail-page__main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feedback-detail-page__panel,
.feedback-detail-page__info-panel {
  padding: 24px 28px;
  border-radius: 16px;
  background: var(--surface-primary);
  border: 1.5px solid var(--border-primary);
  box-shadow: var(--shadow-small);
}

.feedback-detail-page__panel h2,
.feedback-detail-page__info-panel h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  line-height: 1.4;
  font-weight: 700;
}

.feedback-detail-page__empty,
.feedback-detail-page__section-head p {
  color: var(--text-secondary);
}

.feedback-detail-page__section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.feedback-detail-page__section-head h2 {
  margin-bottom: 6px;
}

.feedback-detail-page__section-head p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
}

.feedback-detail-page__merge-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-detail-page__merge-form {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--border-secondary);
  display: flex;
  flex-direction: column;
  gap: 14px;

  label {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  span {
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.9rem;
  }

  input {
    min-height: 46px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--border-primary);
    background: var(--surface-primary);
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: var(--border-focus);
    }
  }
}

.feedback-detail-page__merge-actions {
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

.feedback-detail-page__error {
  margin: 0;
  color: var(--semantic-error);
}

.feedback-detail-page__success {
  margin: 0;
  color: var(--semantic-success);
}

.feedback-detail-page__side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feedback-detail-page__info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 16px 0 0;
}

.feedback-detail-page__info-list div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feedback-detail-page__info-list dt {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.feedback-detail-page__info-list dd {
  margin: 0;
  color: var(--text-primary);
  font-weight: 600;
}

.kg-markdown-body {
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.8;
  word-break: break-word;

  :deep(h1),
  :deep(h2) {
    margin: 18px 0 10px;
    color: var(--text-primary);
    font-size: 1.25rem;
    line-height: 1.45;
    font-weight: 700;
  }

  :deep(h3) {
    margin: 16px 0 8px;
    color: var(--text-primary);
    font-size: 1.05rem;
    line-height: 1.45;
    font-weight: 700;
  }

  :deep(p) {
    margin: 0 0 10px;
  }

  :deep(ul),
  :deep(ol) {
    margin: 8px 0 0;
    padding-left: 1.25rem;
  }

  :deep(li) {
    margin: 4px 0;
  }
}

@media (max-width: 980px) {
  .feedback-detail-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .feedback-detail-page {
    padding: 16px 16px 48px;
  }

  .feedback-detail-page__summary-card,
  .feedback-detail-page__panel,
  .feedback-detail-page__info-panel {
    padding: 20px;
  }
}
</style>
