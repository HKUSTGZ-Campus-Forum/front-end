<script setup lang="ts">
import type { AdminChartDatum } from "~/types/admin";
import type {
  Feedback,
  FeedbackMergeRequest,
  FeedbackMergeRequestStatus,
  FeedbackStatus,
} from "~/types/feedback";
import { ConfirmModal } from "~/components/ui";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
const { getLocalePath } = useAppLocale();
const { formatDate } = useDateFormat();
const {
  listFeedbacks,
  listPendingFeedback,
  listMergeRequests,
  listPendingMergeRequests,
  approveFeedback,
  rejectFeedback,
  closeFeedback,
  reopenFeedback,
  endFeedbackComments,
  resumeFeedbackComments,
  approveMergeRequest,
  rejectMergeRequest,
} = useFeedbackAdmin();

const pendingFeedbacks = ref<Feedback[]>([]);
const pendingMergeRequests = ref<FeedbackMergeRequest[]>([]);
const feedbacks = ref<Feedback[]>([]);
const mergeRequests = ref<FeedbackMergeRequest[]>([]);
const feedbackCounts = ref<Record<string, number>>({ total: 0 });
const mergeCounts = ref<Record<string, number>>({ total: 0 });
const feedbackStatus = ref<FeedbackStatus | "">("");
const mergeStatus = ref<FeedbackMergeRequestStatus | "">("");
const loading = ref(true);
const error = ref("");
const busyKey = ref("");
const noteByKey = ref<Record<string, string>>({});
const notice = ref<{ type: "success" | "error"; message: string } | null>(null);
const confirmState = ref<{
  show: boolean
  title: string
  message: string
  confirmText: string
  action: (() => Promise<void>) | null
}>({
  show: false,
  title: "",
  message: "",
  confirmText: "",
  action: null,
});

const metricItems = computed(() => [
  { key: "pendingFeedback", label: t("adminFeedback.metrics.pendingFeedback"), value: pendingFeedbacks.value.length },
  { key: "pendingMerge", label: t("adminFeedback.metrics.pendingMerge"), value: pendingMergeRequests.value.length },
  { key: "feedbackTotal", label: t("adminFeedback.metrics.feedbackTotal"), value: feedbackCounts.value.total || 0 },
  { key: "mergeTotal", label: t("adminFeedback.metrics.mergeTotal"), value: mergeCounts.value.total || 0 },
]);

const feedbackStatusOptions = computed(() => [
  { value: "", label: t("adminFeedback.filters.allFeedback") },
  { value: "pending_review", label: t("feedbackModule.status.pending_review") },
  { value: "published", label: t("feedbackModule.status.published") },
  { value: "closed", label: t("feedbackModule.status.closed") },
  { value: "rejected", label: t("feedbackModule.status.rejected") },
]);

const mergeStatusOptions = computed(() => [
  { value: "", label: t("adminFeedback.filters.allMerge") },
  { value: "author_accepted_pending_admin", label: t("feedbackModule.mergeRequest.status.author_accepted_pending_admin") },
  { value: "open", label: t("feedbackModule.mergeRequest.status.open") },
  { value: "merged", label: t("feedbackModule.mergeRequest.status.merged") },
  { value: "admin_rejected", label: t("feedbackModule.mergeRequest.status.admin_rejected") },
  { value: "withdrawn", label: t("feedbackModule.mergeRequest.status.withdrawn") },
]);

function statusDistribution(source: Record<string, number>, options: Array<{ value: string; label: string }>): AdminChartDatum[] {
  return options
    .filter((option) => option.value)
    .map((option) => ({ label: option.label, value: source[option.value] || 0 }))
    .filter((item) => item.value > 0);
}

const feedbackStatusData = computed(() => statusDistribution(feedbackCounts.value, feedbackStatusOptions.value));
const mergeStatusData = computed(() => statusDistribution(mergeCounts.value, mergeStatusOptions.value));
const pendingQueueData = computed<AdminChartDatum[]>(() => [
  { label: t("adminFeedback.charts.labels.pendingFeedback"), value: pendingFeedbacks.value.length },
  { label: t("adminFeedback.charts.labels.pendingMerge"), value: pendingMergeRequests.value.length },
]);

function excerpt(value?: string | null) {
  const clean = (value || "").trim();
  return clean ? clean.slice(0, 180) : t("adminFeedback.emptyExcerpt");
}

function feedbackNoteKey(id: number) {
  return `feedback-${id}`;
}

function mergeNoteKey(id: number) {
  return `merge-${id}`;
}

function setNotice(type: "success" | "error", message: string) {
  notice.value = { type, message };
  window.setTimeout(() => {
    notice.value = null;
  }, 3600);
}

async function loadBoard() {
  try {
    loading.value = true;
    error.value = "";
    const [pendingFeedbackData, pendingMergeData, feedbackList, mergeList] = await Promise.all([
      listPendingFeedback(),
      listPendingMergeRequests(),
      listFeedbacks({ status: feedbackStatus.value, per_page: 12 }),
      listMergeRequests({ status: mergeStatus.value, per_page: 12 }),
    ]);
    pendingFeedbacks.value = pendingFeedbackData;
    pendingMergeRequests.value = pendingMergeData;
    feedbacks.value = feedbackList.feedbacks || [];
    mergeRequests.value = mergeList.merge_requests || [];
    feedbackCounts.value = feedbackList.counts || { total: feedbackList.total || 0 };
    mergeCounts.value = mergeList.counts || { total: mergeList.total || 0 };
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("adminFeedback.errors.loadFailed");
  } finally {
    loading.value = false;
  }
}

function openConfirm(config: {
  title: string
  message: string
  confirmText: string
  action: () => Promise<void>
}) {
  confirmState.value = {
    show: true,
    title: config.title,
    message: config.message,
    confirmText: config.confirmText,
    action: config.action,
  };
}

async function runConfirmAction() {
  if (!confirmState.value.action) return;
  await confirmState.value.action();
  confirmState.value.show = false;
}

async function runAction(key: string, action: () => Promise<unknown>, successMessage: string) {
  busyKey.value = key;
  try {
    await action();
    setNotice("success", successMessage);
    await loadBoard();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminFeedback.errors.actionFailed"));
  } finally {
    busyKey.value = "";
  }
}

function approveFeedbackItem(item: Feedback) {
  openConfirm({
    title: t("adminFeedback.approveFeedback.title"),
    message: t("adminFeedback.approveFeedback.message", { title: item.title }),
    confirmText: t("adminFeedback.actions.publish"),
    action: () => runAction(`feedback-approve-${item.id}`, () => approveFeedback(item.id), t("adminFeedback.messages.feedbackApproved")),
  });
}

function rejectFeedbackItem(item: Feedback) {
  const key = feedbackNoteKey(item.id);
  openConfirm({
    title: t("adminFeedback.rejectFeedback.title"),
    message: t("adminFeedback.rejectFeedback.message", { title: item.title }),
    confirmText: t("adminFeedback.actions.reject"),
    action: () => runAction(`feedback-reject-${item.id}`, () => rejectFeedback(item.id, noteByKey.value[key] || ""), t("adminFeedback.messages.feedbackRejected")),
  });
}

function approveMergeItem(item: FeedbackMergeRequest) {
  const key = mergeNoteKey(item.id);
  openConfirm({
    title: t("adminFeedback.approveMerge.title"),
    message: t("adminFeedback.approveMerge.message", { title: item.title }),
    confirmText: t("adminFeedback.actions.merge"),
    action: () => runAction(`merge-approve-${item.id}`, () => approveMergeRequest(item.id, noteByKey.value[key] || ""), t("adminFeedback.messages.mergeApproved")),
  });
}

function rejectMergeItem(item: FeedbackMergeRequest) {
  const key = mergeNoteKey(item.id);
  openConfirm({
    title: t("adminFeedback.rejectMerge.title"),
    message: t("adminFeedback.rejectMerge.message", { title: item.title }),
    confirmText: t("adminFeedback.actions.reject"),
    action: () => runAction(`merge-reject-${item.id}`, () => rejectMergeRequest(item.id, noteByKey.value[key] || ""), t("adminFeedback.messages.mergeRejected")),
  });
}

watch([feedbackStatus, mergeStatus], loadBoard);
onMounted(loadBoard);
</script>

<template>
  <section class="admin-feedback">
    <AdminPageHeader
      :eyebrow="t('nav.admin')"
      :title="t('adminFeedback.title')"
      :description="t('adminFeedback.description')"
    >
      <template #actions>
        <button class="admin-feedback__primary-btn" type="button" :disabled="loading" @click="loadBoard">
          {{ loading ? t("adminFeedback.actions.refreshing") : t("adminFeedback.actions.refresh") }}
        </button>
      </template>
    </AdminPageHeader>

    <AdminMetricStrip :items="metricItems" />

    <div class="admin-feedback__charts">
      <AdminDonutChart :title="t('adminFeedback.charts.feedbackStatus')" :items="feedbackStatusData" />
      <AdminDonutChart :title="t('adminFeedback.charts.mergeStatus')" :items="mergeStatusData" />
      <AdminBarChart :title="t('adminFeedback.charts.pendingQueues')" :items="pendingQueueData" />
    </div>

    <p v-if="notice" class="admin-feedback__notice" :class="`admin-feedback__notice--${notice.type}`">
      {{ notice.message }}
    </p>

    <AdminStateBlock v-if="loading && !feedbacks.length" :title="t('common.loading')" />
    <AdminStateBlock
      v-else-if="error"
      tone="error"
      :title="t('adminFeedback.errors.title')"
      :message="error"
    >
      <button class="admin-feedback__inline-btn" type="button" @click="loadBoard">
        {{ t("common.retry") }}
      </button>
    </AdminStateBlock>

    <template v-else>
      <div class="admin-feedback__queues">
        <section class="admin-feedback-section">
          <div class="admin-feedback-section__head">
            <h2>{{ t("adminFeedback.pendingFeedback.title") }}</h2>
            <span>{{ pendingFeedbacks.length }}</span>
          </div>
          <div v-if="pendingFeedbacks.length" class="admin-feedback__cards">
            <article v-for="item in pendingFeedbacks" :key="item.id" class="admin-feedback-card">
              <div class="admin-feedback-card__meta">
                <FeedbackStatusBadge :status="item.status" />
                <span>{{ t("adminFeedback.author", { id: item.author_id }) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ excerpt(item.current_version?.markdown_content) }}</p>
              <textarea
                v-model="noteByKey[feedbackNoteKey(item.id)]"
                rows="3"
                :placeholder="t('adminFeedback.notePlaceholder')"
              />
              <AdminActionButtons
                :primary-label="t('adminFeedback.actions.publish')"
                :danger-label="t('adminFeedback.actions.reject')"
                :disabled="busyKey.includes(String(item.id))"
                @primary="approveFeedbackItem(item)"
                @danger="rejectFeedbackItem(item)"
              />
            </article>
          </div>
          <AdminStateBlock
            v-else
            :title="t('adminFeedback.pendingFeedback.emptyTitle')"
            :message="t('adminFeedback.pendingFeedback.emptyDescription')"
          />
        </section>

        <section class="admin-feedback-section">
          <div class="admin-feedback-section__head">
            <h2>{{ t("adminFeedback.pendingMerge.title") }}</h2>
            <span>{{ pendingMergeRequests.length }}</span>
          </div>
          <div v-if="pendingMergeRequests.length" class="admin-feedback__cards">
            <article v-for="item in pendingMergeRequests" :key="item.id" class="admin-feedback-card">
              <div class="admin-feedback-card__meta">
                <span>{{ t("adminFeedback.feedbackId", { id: item.feedback_id }) }}</span>
                <span>{{ t("adminFeedback.author", { id: item.author_id }) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ excerpt(item.change_summary || item.proposed_markdown_content) }}</p>
              <textarea
                v-model="noteByKey[mergeNoteKey(item.id)]"
                rows="3"
                :placeholder="t('adminFeedback.notePlaceholder')"
              />
              <AdminActionButtons
                :primary-label="t('adminFeedback.actions.merge')"
                :danger-label="t('adminFeedback.actions.reject')"
                :disabled="busyKey.includes(String(item.id))"
                @primary="approveMergeItem(item)"
                @danger="rejectMergeItem(item)"
              />
            </article>
          </div>
          <AdminStateBlock
            v-else
            :title="t('adminFeedback.pendingMerge.emptyTitle')"
            :message="t('adminFeedback.pendingMerge.emptyDescription')"
          />
        </section>
      </div>

      <AdminFilterBar>
        <label class="admin-feedback__field">
          <span>{{ t("adminFeedback.filters.feedbackStatus") }}</span>
          <select v-model="feedbackStatus">
            <option v-for="item in feedbackStatusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label class="admin-feedback__field">
          <span>{{ t("adminFeedback.filters.mergeStatus") }}</span>
          <select v-model="mergeStatus">
            <option v-for="item in mergeStatusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
      </AdminFilterBar>

      <section class="admin-feedback-section">
        <div class="admin-feedback-section__head">
          <h2>{{ t("adminFeedback.feedbackHistory.title") }}</h2>
          <span>{{ feedbacks.length }}</span>
        </div>
        <div class="admin-feedback__list">
          <article v-for="item in feedbacks" :key="item.id" class="admin-feedback-row">
            <div>
              <div class="admin-feedback-card__meta">
                <FeedbackStatusBadge :status="item.status" />
                <span>{{ formatDate(item.updated_at, { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
                <span v-if="item.comments_ended">{{ t("adminFeedback.commentsEnded") }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ excerpt(item.current_version?.markdown_content) }}</p>
            </div>
            <div class="admin-feedback-row__actions">
              <NuxtLink :to="getLocalePath(`/feedback/${item.id}`)" class="admin-feedback__link">
                {{ t("adminFeedback.actions.view") }}
              </NuxtLink>
              <AdminActionButtons
                v-if="item.status === 'published'"
                :secondary-label="item.comments_ended ? t('adminFeedback.actions.resumeComments') : t('adminFeedback.actions.endComments')"
                :danger-label="t('adminFeedback.actions.closeFeedback')"
                :disabled="busyKey.includes(String(item.id))"
                @secondary="runAction(
                  `feedback-comments-${item.id}`,
                  () => item.comments_ended ? resumeFeedbackComments(item.id) : endFeedbackComments(item.id),
                  item.comments_ended ? t('adminFeedback.messages.commentsResumed') : t('adminFeedback.messages.commentsEnded')
                )"
                @danger="runAction(`feedback-close-${item.id}`, () => closeFeedback(item.id), t('adminFeedback.messages.feedbackClosed'))"
              />
              <AdminActionButtons
                v-else-if="item.status === 'closed'"
                :primary-label="t('adminFeedback.actions.reopenFeedback')"
                :disabled="busyKey.includes(String(item.id))"
                @primary="runAction(`feedback-reopen-${item.id}`, () => reopenFeedback(item.id), t('adminFeedback.messages.feedbackReopened'))"
              />
            </div>
          </article>
        </div>
      </section>

      <section class="admin-feedback-section">
        <div class="admin-feedback-section__head">
          <h2>{{ t("adminFeedback.mergeHistory.title") }}</h2>
          <span>{{ mergeRequests.length }}</span>
        </div>
        <div class="admin-feedback__list">
          <article v-for="item in mergeRequests" :key="item.id" class="admin-feedback-row">
            <div>
              <div class="admin-feedback-card__meta">
                <FeedbackMergeRequestStatusBadge :status="item.status" />
                <span>{{ t("adminFeedback.feedbackId", { id: item.feedback_id }) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ excerpt(item.change_summary || item.proposed_markdown_content) }}</p>
            </div>
            <NuxtLink :to="getLocalePath(`/feedback/merge-requests/${item.id}`)" class="admin-feedback__link">
              {{ t("adminFeedback.actions.view") }}
            </NuxtLink>
          </article>
        </div>
      </section>
    </template>

    <ConfirmModal
      :show="confirmState.show"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-text="confirmState.confirmText"
      :cancel-text="t('actions.cancel')"
      @confirm="runConfirmAction"
      @cancel="confirmState.show = false"
      @close="confirmState.show = false"
    />
  </section>
</template>

<style scoped lang="scss">
.admin-feedback__primary-btn,
.admin-feedback__inline-btn,
.admin-feedback__link {
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 0;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.admin-feedback__notice {
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.admin-feedback__notice--success {
  border: 1px solid color-mix(in srgb, var(--semantic-success) 35%, var(--border-primary));
  color: var(--semantic-success);
}

.admin-feedback__notice--error {
  border: 1px solid color-mix(in srgb, var(--semantic-error) 35%, var(--border-primary));
  color: var(--semantic-error);
}

.admin-feedback__queues {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-feedback-section {
  min-width: 0;
}

.admin-feedback-section + .admin-feedback-section {
  margin-top: 1.25rem;
}

.admin-feedback-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  span {
    color: var(--text-secondary);
    font-weight: 800;
  }
}

.admin-feedback__cards,
.admin-feedback__list {
  display: grid;
  gap: 0.85rem;
}

.admin-feedback-card,
.admin-feedback-row {
  padding: 1rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);

  h3 {
    margin: 0.65rem 0 0;
    color: var(--text-primary);
    font-size: 1rem;
  }

  p {
    margin: 0.45rem 0 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  textarea {
    width: 100%;
    margin: 0.85rem 0;
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    background: var(--surface-primary);
    color: var(--text-primary);
    padding: 0.75rem;
    resize: vertical;
    font: inherit;
  }
}

.admin-feedback-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
}

.admin-feedback__charts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.admin-feedback-row__actions {
  display: grid;
  justify-items: end;
  gap: 0.6rem;
}

.admin-feedback-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.admin-feedback__field {
  display: flex;
  min-width: 210px;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 700;

  select {
    min-height: 40px;
    border: 1px solid var(--border-primary);
    border-radius: 999px;
    background: var(--surface-primary);
    color: var(--text-primary);
    padding: 0 0.85rem;
    font: inherit;
  }
}

@media (max-width: 900px) {
  .admin-feedback__queues,
  .admin-feedback__charts,
  .admin-feedback-row {
    grid-template-columns: 1fr;
  }

  .admin-feedback-row__actions {
    justify-items: start;
  }
}
</style>
