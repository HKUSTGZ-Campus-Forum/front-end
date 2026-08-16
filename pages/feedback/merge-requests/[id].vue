<script setup lang="ts">
import { marked } from "marked";
import type { Feedback, FeedbackMergeRequest } from "~/types/feedback";
import FeedbackMergeRequestStatusBadge from "~/components/feedback/FeedbackMergeRequestStatusBadge.vue";

definePageMeta({
  layout: "keguang",
});

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  return marked.parse(text) as string;
}

const { t, locale } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const mergeRequestId = computed(() => Number(route.params.id));
const { user, isLoggedIn } = useAuth();
const {
  getMergeRequest,
  getFeedback,
  updateMergeRequestContent,
  createMergeRequestComment,
  authorRequestChanges,
  authorRejectMergeRequest,
  authorAcceptMergeRequest,
} = useFeedback();

const mergeRequest = ref<FeedbackMergeRequest | null>(null);
const feedback = ref<Feedback | null>(null);
const loading = ref(true);
const error = ref("");
const actionError = ref("");
const actionSuccess = ref("");
const draftMarkdown = ref("");
const reviewNote = ref("");
const actionSubmitting = ref(false);

const isFeedbackAuthor = computed(() => {
  if (!feedback.value || !user.value?.id) return false;
  return String(feedback.value.author_id) === String(user.value.id);
});

const canReviewAsAuthor = computed(() =>
  isFeedbackAuthor.value &&
  mergeRequest.value &&
  ["open", "author_changes_requested"].includes(mergeRequest.value.status),
);

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

const feedbackHubRoute = computed(() => ({
  path: localePath("/forum"),
  query: { section: "feedback" },
}));

const feedbackDetailRoute = computed(() => {
  if (!feedback.value) return feedbackHubRoute.value;
  return localePath(`/feedback/${feedback.value.id}`);
});

useHead(() => ({
  title: mergeRequest.value?.title
    ? `${mergeRequest.value.title} - ${t("feedbackModule.mergeRequest.pageTitle")}`
    : t("feedbackModule.mergeRequest.pageTitle"),
  meta: [{ name: "description", content: t("feedbackModule.mergeRequest.metaDescription") }],
}));

async function loadPage() {
  try {
    loading.value = true;
    error.value = "";
    const mergeData = await getMergeRequest(mergeRequestId.value);
    mergeRequest.value = mergeData;
    draftMarkdown.value = mergeData.proposed_markdown_content;
    feedback.value = await getFeedback(mergeData.feedback_id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("feedbackModule.mergeRequest.errors.loadFailed");
  } finally {
    loading.value = false;
  }
}

async function saveDraft() {
  if (!mergeRequest.value) return;
  actionSubmitting.value = true;
  actionError.value = "";
  actionSuccess.value = "";

  try {
    mergeRequest.value = await updateMergeRequestContent(mergeRequest.value.id, draftMarkdown.value);
    actionSuccess.value = t("feedbackModule.mergeRequest.success.draftSaved");
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t("feedbackModule.mergeRequest.errors.saveFailed");
  } finally {
    actionSubmitting.value = false;
  }
}

async function handleAuthorAction(action: "request-changes" | "reject" | "accept") {
  if (!mergeRequest.value) return;

  actionSubmitting.value = true;
  actionError.value = "";
  actionSuccess.value = "";

  try {
    if (draftMarkdown.value.trim() !== mergeRequest.value.proposed_markdown_content.trim()) {
      mergeRequest.value = await updateMergeRequestContent(mergeRequest.value.id, draftMarkdown.value);
    }

    if (action === "request-changes") {
      mergeRequest.value = await authorRequestChanges(mergeRequest.value.id, reviewNote.value.trim());
      actionSuccess.value = t("feedbackModule.mergeRequest.success.requestChanges");
    } else if (action === "reject") {
      mergeRequest.value = await authorRejectMergeRequest(mergeRequest.value.id, reviewNote.value.trim());
      actionSuccess.value = t("feedbackModule.mergeRequest.success.rejected");
    } else {
      mergeRequest.value = await authorAcceptMergeRequest(mergeRequest.value.id, reviewNote.value.trim());
      actionSuccess.value = t("feedbackModule.mergeRequest.success.submittedForAdmin");
    }
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t("feedbackModule.mergeRequest.errors.actionFailed");
  } finally {
    actionSubmitting.value = false;
  }
}

async function handleCreateComment(content: string) {
  if (!mergeRequest.value) return;

  try {
    await createMergeRequestComment(mergeRequest.value.id, { content });
    await loadPage();
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t("feedbackModule.mergeRequest.errors.commentFailed");
  }
}

onMounted(loadPage);
</script>

<template>
  <div class="merge-request-detail-page">
    <div class="merge-request-detail-page__back-bar">
      <NuxtLink :to="feedbackDetailRoute" class="merge-request-detail-page__back-link">
        <ForumUiIcon name="back" class="merge-request-detail-page__back-icon" />
        {{ t("feedbackModule.mergeRequest.back") }}
      </NuxtLink>
    </div>

    <p v-if="loading" class="merge-request-detail-page__state">{{ t("common.loading") }}</p>
    <p v-else-if="error" class="merge-request-detail-page__state merge-request-detail-page__state--error">
      {{ error }}
    </p>

    <template v-else-if="mergeRequest">
      <section class="merge-request-detail-page__summary-card">
        <div class="merge-request-detail-page__badge-row">
          <FeedbackMergeRequestStatusBadge :status="mergeRequest.status" />
          <span class="merge-request-detail-page__secondary-pill">
            {{ t("feedbackModule.mergeRequest.feedbackLinkLabel", { id: mergeRequest.feedback_id }) }}
          </span>
        </div>

        <h1>{{ mergeRequest.title }}</h1>
        <p class="merge-request-detail-page__meta">
          {{ t("feedbackModule.mergeRequest.proposer", { id: mergeRequest.author_id }) }}
        </p>
        <p class="merge-request-detail-page__summary">
          {{ mergeRequest.change_summary || t("feedbackModule.mergeRequest.summaryFallback") }}
        </p>
      </section>

      <div class="merge-request-detail-page__layout">
        <main class="merge-request-detail-page__main">
          <section class="merge-request-detail-page__panel">
            <div class="merge-request-detail-page__section-head">
              <div>
                <h2>{{ t("feedbackModule.mergeRequest.bodyTitle") }}</h2>
                <p>{{ t("feedbackModule.mergeRequest.bodyHint") }}</p>
              </div>
            </div>

            <div class="kg-markdown-body" v-html="renderMarkdown(mergeRequest.proposed_markdown_content)"></div>
          </section>

          <section v-if="canReviewAsAuthor" class="merge-request-detail-page__panel">
            <h2>{{ t("feedbackModule.mergeRequest.reviewTitle") }}</h2>
            <p class="merge-request-detail-page__muted">
              {{ t("feedbackModule.mergeRequest.reviewHint") }}
            </p>
            <CommonMarkdownEditor v-model="draftMarkdown" height="320px" />
            <textarea
              v-model="reviewNote"
              class="merge-request-detail-page__note"
              rows="4"
              :placeholder="t('feedbackModule.mergeRequest.notePlaceholder')"
            />
            <p v-if="actionError" class="merge-request-detail-page__error">{{ actionError }}</p>
            <p v-if="actionSuccess" class="merge-request-detail-page__success">{{ actionSuccess }}</p>
            <div class="merge-request-detail-page__actions">
              <button :disabled="actionSubmitting" class="merge-request-detail-page__ghost" @click="saveDraft">
                {{ actionSubmitting ? t("feedbackModule.mergeRequest.saving") : t("feedbackModule.mergeRequest.saveDraft") }}
              </button>
              <button :disabled="actionSubmitting" class="merge-request-detail-page__warn" @click="handleAuthorAction('request-changes')">
                {{ t("feedbackModule.mergeRequest.requestChanges") }}
              </button>
              <button :disabled="actionSubmitting" class="merge-request-detail-page__danger" @click="handleAuthorAction('reject')">
                {{ t("feedbackModule.mergeRequest.reject") }}
              </button>
              <button :disabled="actionSubmitting" @click="handleAuthorAction('accept')">
                {{ t("feedbackModule.mergeRequest.submitForAdmin") }}
              </button>
            </div>
          </section>

          <section class="merge-request-detail-page__panel">
            <FeedbackCommentList
              :comments="mergeRequest.comments || []"
              :comments-ended="feedback?.comments_ended || false"
              :is-logged-in="isLoggedIn"
              @create-comment="handleCreateComment"
            />
          </section>
        </main>

        <aside class="merge-request-detail-page__side">
          <section class="merge-request-detail-page__panel merge-request-detail-page__meta-panel">
            <h3>{{ t("feedbackModule.mergeRequest.sidebarTitle") }}</h3>
            <p>{{ t("feedbackModule.mergeRequest.statusLabel") }}</p>
            <div class="merge-request-detail-page__status-row">
              <FeedbackMergeRequestStatusBadge :status="mergeRequest.status" />
            </div>
            <p>{{ t("feedbackModule.mergeRequest.createdAt", { date: dateFormatter.format(new Date(mergeRequest.created_at)) }) }}</p>
            <p>{{ t("feedbackModule.mergeRequest.baseVersion", { version: mergeRequest.base_version_id }) }}</p>
            <p v-if="mergeRequest.author_review_note">
              {{ t("feedbackModule.mergeRequest.authorNote", { note: mergeRequest.author_review_note }) }}
            </p>
            <p v-if="mergeRequest.admin_review_note">
              {{ t("feedbackModule.mergeRequest.adminNote", { note: mergeRequest.admin_review_note }) }}
            </p>
            <NuxtLink :to="feedbackHubRoute" class="merge-request-detail-page__side-link">
              {{ t("feedbackModule.mergeRequest.backToHub") }}
            </NuxtLink>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.merge-request-detail-page {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1rem 1rem 3rem;
}

.merge-request-detail-page__back-bar {
  margin-bottom: 1rem;
}

.merge-request-detail-page__back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--interactive-primary);
  text-decoration: none;
  font-weight: 600;
}

.merge-request-detail-page__back-icon {
  width: 18px;
  height: 18px;
}

.merge-request-detail-page__state {
  color: var(--text-secondary);

  &--error {
    color: var(--error-color);
  }
}

.merge-request-detail-page__summary-card {
  padding: 1.75rem 2rem;
  border-radius: 28px;
  background: var(--surface-primary);
  border: 2px solid var(--border-primary);
  box-shadow: var(--shadow-large);
}

.merge-request-detail-page__badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.merge-request-detail-page__secondary-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 700;
}

.merge-request-detail-page__summary-card h1 {
  margin: 1rem 0 0;
  color: var(--text-primary);
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.merge-request-detail-page__meta {
  margin: 0.75rem 0 0;
  color: var(--text-secondary);
}

.merge-request-detail-page__summary {
  max-width: 48rem;
  line-height: 1.8;
  color: var(--text-secondary);
}

.merge-request-detail-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 1rem;
  margin-top: 1rem;
}

.merge-request-detail-page__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.merge-request-detail-page__panel {
  padding: 1.25rem;
  border-radius: 24px;
  background: var(--surface-primary);
  border: 2px solid var(--border-primary);
  box-shadow: var(--shadow-large);
}

.merge-request-detail-page__section-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

.merge-request-detail-page__section-head h2,
.merge-request-detail-page__panel h2,
.merge-request-detail-page__panel h3 {
  margin: 0;
  color: var(--text-primary);
}

.merge-request-detail-page__section-head p,
.merge-request-detail-page__muted,
.merge-request-detail-page__meta-panel p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.merge-request-detail-page__note {
  width: 100%;
  margin-top: 0.9rem;
  border-radius: 16px;
  border: 1px solid var(--border-primary);
  padding: 0.95rem 1rem;
  resize: vertical;
}

.merge-request-detail-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;

  button {
    min-height: 44px;
    padding: 0.78rem 1rem;
    border-radius: 999px;
    border: none;
    background: var(--interactive-primary);
    color: var(--text-inverse);
    font-weight: 700;
    cursor: pointer;
  }
}

.merge-request-detail-page__ghost {
  background: color-mix(in srgb, var(--interactive-primary) 10%, transparent) !important;
  color: var(--interactive-primary) !important;
}

.merge-request-detail-page__warn {
  background: var(--warning-color) !important;
}

.merge-request-detail-page__danger {
  background: var(--error-color) !important;
}

.merge-request-detail-page__error {
  margin: 0.75rem 0 0;
  color: var(--error-color);
}

.merge-request-detail-page__success {
  margin: 0.75rem 0 0;
  color: var(--success-color);
}

.merge-request-detail-page__meta-panel p {
  margin: 0;
}

.merge-request-detail-page__status-row {
  margin: 0.35rem 0 0.75rem;
}

.merge-request-detail-page__side-link {
  display: inline-flex;
  margin-top: 1rem;
  color: var(--interactive-primary);
  text-decoration: none;
  font-weight: 600;
}

@media (max-width: 980px) {
  .merge-request-detail-page__layout {
    grid-template-columns: 1fr;
  }
}
</style>
