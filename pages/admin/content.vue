<script setup lang="ts">
import type {
  AdminChartDatum,
  AdminComment,
  AdminContentSummary,
  AdminDistributionCounts,
  AdminFile,
  AdminGuguMessage,
  AdminPost,
} from "~/types/admin";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
const { formatDate } = useDateFormat();
const {
  getContentSummary,
  getPosts,
  getComments,
  getFiles,
  getGuguMessages,
  setPostDeleted,
  setCommentDeleted,
  setFileDeleted,
  setGuguDeleted,
} = useAdminConsole();

type ContentTab = "posts" | "comments" | "gugu" | "files";

const activeTab = ref<ContentTab>("posts");
const summary = ref<AdminContentSummary | null>(null);
const posts = ref<AdminPost[]>([]);
const comments = ref<AdminComment[]>([]);
const guguMessages = ref<AdminGuguMessage[]>([]);
const files = ref<AdminFile[]>([]);
const loading = ref(true);
const error = ref("");
const notice = ref<{ type: "success" | "error"; message: string } | null>(null);
const search = ref("");
const selectedDeleted = ref<"" | "true" | "false">("");
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const busyKey = ref("");
const perPage = 12;

const metricItems = computed(() => [
  { key: "posts", label: t("adminContent.metrics.posts"), value: summary.value?.posts.total ?? 0 },
  { key: "comments", label: t("adminContent.metrics.comments"), value: summary.value?.comments.total ?? 0 },
  { key: "files", label: t("adminContent.metrics.files"), value: summary.value?.files.total ?? 0 },
  { key: "gugu", label: t("adminContent.metrics.gugu"), value: summary.value?.gugu.messages ?? 0 },
]);

function metricNumber(source: Record<string, unknown> | undefined, key: string) {
  const value = source?.[key];
  return typeof value === "number" ? value : 0;
}

function distributionItems(source?: AdminDistributionCounts, labels: Record<string, string> = {}): AdminChartDatum[] {
  return Object.entries(source || {})
    .map(([label, value]) => ({ label: labels[label] || label, value }))
    .filter((item) => item.value > 0);
}

const contentVolumeData = computed<AdminChartDatum[]>(() => [
  { label: t("adminContent.tabs.posts"), value: metricNumber(summary.value?.posts, "total") },
  { label: t("adminContent.tabs.comments"), value: metricNumber(summary.value?.comments, "total") },
  { label: t("adminContent.tabs.gugu"), value: metricNumber(summary.value?.gugu, "messages") },
  { label: t("adminContent.tabs.files"), value: metricNumber(summary.value?.files, "total") },
]);

const deletionData = computed<AdminChartDatum[]>(() => {
  const blocks = [
    summary.value?.posts,
    summary.value?.comments,
    summary.value?.gugu,
    summary.value?.files,
  ] as Array<Record<string, unknown> | undefined>;
  return [
    { label: t("adminContent.charts.labels.active"), value: blocks.reduce((sum, block) => sum + metricNumber(block, "active"), 0) },
    { label: t("adminContent.charts.labels.deleted"), value: blocks.reduce((sum, block) => sum + metricNumber(block, "deleted"), 0) },
  ];
});

const fileStatusData = computed(() => distributionItems(summary.value?.files.status as AdminDistributionCounts | undefined));
const fileTypeData = computed(() => distributionItems(summary.value?.files.file_type as AdminDistributionCounts | undefined));

function setNotice(type: "success" | "error", message: string) {
  notice.value = { type, message };
  window.setTimeout(() => {
    notice.value = null;
  }, 3600);
}

async function loadContent() {
  loading.value = true;
  error.value = "";
  try {
    const query = {
      search: search.value,
      deleted: selectedDeleted.value,
      page: currentPage.value,
      per_page: perPage,
    };
    const listRequest = {
      posts: () => getPosts(query),
      comments: () => getComments(query),
      gugu: () => getGuguMessages(query),
      files: () => getFiles(query),
    }[activeTab.value];

    const [summaryData, listData] = await Promise.all([
      getContentSummary(),
      listRequest(),
    ]);
    summary.value = summaryData;
    posts.value = [];
    comments.value = [];
    guguMessages.value = [];
    files.value = [];
    if (activeTab.value === "posts") {
      posts.value = (listData as any).posts || [];
    } else if (activeTab.value === "comments") {
      comments.value = (listData as any).comments || [];
    } else if (activeTab.value === "gugu") {
      guguMessages.value = (listData as any).gugu || (listData as any).messages || [];
    } else {
      files.value = (listData as any).files || [];
    }
    totalItems.value = listData.total;
    totalPages.value = Math.max(1, listData.pages || 1);
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("adminConsole.errors.loadContent");
  } finally {
    loading.value = false;
  }
}

const hasAnyRows = computed(() => posts.value.length || comments.value.length || guguMessages.value.length || files.value.length);

function resetAndLoad() {
  currentPage.value = 1;
  loadContent();
}

async function togglePost(post: AdminPost) {
  const nextDeleted = !post.is_deleted;
  if (!window.confirm(nextDeleted ? t("adminContent.confirm.deletePost") : t("adminContent.confirm.restorePost"))) return;
  busyKey.value = `post-${post.id}`;
  try {
    await setPostDeleted(post.id, nextDeleted, nextDeleted ? t("adminContent.audit.deletePost") : t("adminContent.audit.restorePost"));
    setNotice("success", nextDeleted ? t("adminContent.messages.postDeleted") : t("adminContent.messages.postRestored"));
    await loadContent();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminConsole.errors.updateContent"));
  } finally {
    busyKey.value = "";
  }
}

async function toggleComment(comment: AdminComment) {
  const nextDeleted = !comment.is_deleted;
  if (!window.confirm(nextDeleted ? t("adminContent.confirm.deleteComment") : t("adminContent.confirm.restoreComment"))) return;
  busyKey.value = `comment-${comment.id}`;
  try {
    await setCommentDeleted(comment.id, nextDeleted, nextDeleted ? t("adminContent.audit.deleteComment") : t("adminContent.audit.restoreComment"));
    setNotice("success", nextDeleted ? t("adminContent.messages.commentDeleted") : t("adminContent.messages.commentRestored"));
    await loadContent();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminConsole.errors.updateContent"));
  } finally {
    busyKey.value = "";
  }
}

async function toggleGugu(message: AdminGuguMessage) {
  const nextDeleted = !message.is_deleted;
  if (!window.confirm(nextDeleted ? t("adminContent.confirm.deleteGugu") : t("adminContent.confirm.restoreGugu"))) return;
  busyKey.value = `gugu-${message.id}`;
  try {
    await setGuguDeleted(message.id, nextDeleted, nextDeleted ? t("adminContent.audit.deleteGugu") : t("adminContent.audit.restoreGugu"));
    setNotice("success", nextDeleted ? t("adminContent.messages.guguDeleted") : t("adminContent.messages.guguRestored"));
    await loadContent();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminConsole.errors.updateContent"));
  } finally {
    busyKey.value = "";
  }
}

async function toggleFile(file: AdminFile) {
  const nextDeleted = !file.is_deleted;
  if (!window.confirm(nextDeleted ? t("adminContent.confirm.deleteFile") : t("adminContent.confirm.restoreFile"))) return;
  busyKey.value = `file-${file.id}`;
  try {
    await setFileDeleted(file.id, nextDeleted, nextDeleted ? t("adminContent.audit.deleteFile") : t("adminContent.audit.restoreFile"));
    setNotice("success", nextDeleted ? t("adminContent.messages.fileDeleted") : t("adminContent.messages.fileRestored"));
    await loadContent();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminConsole.errors.updateContent"));
  } finally {
    busyKey.value = "";
  }
}

watch([activeTab, selectedDeleted], resetAndLoad);
onMounted(loadContent);
</script>

<template>
  <section class="admin-content">
    <AdminPageHeader :eyebrow="t('nav.admin')" :title="t('adminContent.title')" :description="t('adminContent.description')">
      <template #actions>
        <button class="admin-content__primary" type="button" :disabled="loading" @click="loadContent">
          {{ loading ? t("adminContent.actions.refreshing") : t("adminContent.actions.refresh") }}
        </button>
      </template>
    </AdminPageHeader>

    <AdminMetricStrip :items="metricItems" />

    <div class="admin-content__charts">
      <AdminBarChart :title="t('adminContent.charts.volume')" :items="contentVolumeData" />
      <AdminDonutChart :title="t('adminContent.charts.deletion')" :items="deletionData" />
      <AdminDonutChart :title="t('adminContent.charts.fileStatus')" :items="fileStatusData" />
      <AdminBarChart :title="t('adminContent.charts.fileTypes')" :items="fileTypeData" horizontal />
    </div>

    <AdminFilterBar>
      <div class="admin-content__tabs">
        <button type="button" :class="{ active: activeTab === 'posts' }" @click="activeTab = 'posts'">{{ t("adminContent.tabs.posts") }}</button>
        <button type="button" :class="{ active: activeTab === 'comments' }" @click="activeTab = 'comments'">{{ t("adminContent.tabs.comments") }}</button>
        <button type="button" :class="{ active: activeTab === 'gugu' }" @click="activeTab = 'gugu'">{{ t("adminContent.tabs.gugu") }}</button>
        <button type="button" :class="{ active: activeTab === 'files' }" @click="activeTab = 'files'">{{ t("adminContent.tabs.files") }}</button>
      </div>
      <label>
        <span>{{ t("adminContent.filters.search") }}</span>
        <input v-model="search" type="search" :placeholder="t('adminContent.filters.searchPlaceholder')" @keyup.enter="resetAndLoad">
      </label>
      <label>
        <span>{{ t("adminContent.filters.deleted") }}</span>
        <select v-model="selectedDeleted">
          <option value="">{{ t("adminContent.filters.all") }}</option>
          <option value="false">{{ t("adminContent.filters.active") }}</option>
          <option value="true">{{ t("adminContent.filters.deletedOnly") }}</option>
        </select>
      </label>
      <template #actions>
        <button class="admin-content__secondary" type="button" @click="resetAndLoad">{{ t("adminContent.actions.apply") }}</button>
      </template>
    </AdminFilterBar>

    <p v-if="notice" class="admin-content__notice" :class="`admin-content__notice--${notice.type}`">{{ notice.message }}</p>
    <AdminStateBlock v-if="loading && !hasAnyRows" :title="t('common.loading')" />
    <AdminStateBlock v-else-if="error" tone="error" :title="t('adminContent.errors.title')" :message="error" />

    <div v-else-if="activeTab === 'posts'" class="admin-content__list">
      <AdminStateBlock v-if="!posts.length" :title="t('adminContent.empty.title')" :message="t('adminContent.empty.description')" />
      <article v-for="post in posts" v-else :key="post.id" class="admin-content__card" :class="{ 'admin-content__card--deleted': post.is_deleted }">
        <div>
          <strong>{{ post.title }}</strong>
          <p>{{ post.author || t("adminConsole.unknown") }} · {{ t("adminContent.createdAt", { date: formatDate(post.created_at, { year: 'numeric', month: 'short', day: 'numeric' }) }) }}</p>
        </div>
        <div class="admin-content__stats">
          <span>{{ t("adminContent.postStats.comments", { count: post.comment_count }) }}</span>
          <span>{{ t("adminContent.postStats.reactions", { count: post.reaction_count }) }}</span>
          <span>{{ t("adminContent.postStats.views", { count: post.view_count }) }}</span>
        </div>
        <button type="button" :disabled="!!busyKey" @click="togglePost(post)">
          {{ post.is_deleted ? t("adminContent.actions.restore") : t("adminContent.actions.delete") }}
        </button>
      </article>
    </div>

    <div v-else-if="activeTab === 'comments'" class="admin-content__list">
      <AdminStateBlock v-if="!comments.length" :title="t('adminContent.empty.title')" :message="t('adminContent.empty.description')" />
      <article v-for="comment in comments" v-else :key="comment.id" class="admin-content__card" :class="{ 'admin-content__card--deleted': comment.is_deleted }">
        <div>
          <strong>{{ comment.content }}</strong>
          <p>{{ comment.author || t("adminConsole.unknown") }} · {{ t("adminContent.commentPost", { id: comment.post_id }) }}</p>
        </div>
        <div class="admin-content__stats">
          <span>{{ t("adminContent.createdAt", { date: formatDate(comment.created_at, { year: 'numeric', month: 'short', day: 'numeric' }) }) }}</span>
          <span v-if="comment.is_deleted">{{ t("adminContent.deleted") }}</span>
        </div>
        <button type="button" :disabled="!!busyKey" @click="toggleComment(comment)">
          {{ comment.is_deleted ? t("adminContent.actions.restore") : t("adminContent.actions.delete") }}
        </button>
      </article>
    </div>

    <div v-else-if="activeTab === 'gugu'" class="admin-content__list">
      <AdminStateBlock v-if="!guguMessages.length" :title="t('adminContent.empty.title')" :message="t('adminContent.empty.description')" />
      <article v-for="message in guguMessages" v-else :key="message.id" class="admin-content__card" :class="{ 'admin-content__card--deleted': message.is_deleted }">
        <div>
          <strong>{{ message.content }}</strong>
          <p>{{ message.author || t("adminConsole.unknown") }} · {{ t("adminContent.createdAt", { date: formatDate(message.created_at, { year: 'numeric', month: 'short', day: 'numeric' }) }) }}</p>
        </div>
        <div class="admin-content__stats">
          <span>{{ t("adminContent.guguStats.replyTo", { id: message.reply_to_message_id || "-" }) }}</span>
          <span v-if="message.is_deleted">{{ t("adminContent.deleted") }}</span>
        </div>
        <button type="button" :disabled="!!busyKey" @click="toggleGugu(message)">
          {{ message.is_deleted ? t("adminContent.actions.restore") : t("adminContent.actions.delete") }}
        </button>
      </article>
    </div>

    <div v-else class="admin-content__list">
      <AdminStateBlock v-if="!files.length" :title="t('adminContent.empty.title')" :message="t('adminContent.empty.description')" />
      <article v-for="file in files" v-else :key="file.id" class="admin-content__card" :class="{ 'admin-content__card--deleted': file.is_deleted }">
        <div>
          <strong>{{ file.original_filename }}</strong>
          <p>{{ file.owner || t("adminConsole.unknown") }} · {{ file.file_type }} · {{ file.status }}</p>
        </div>
        <div class="admin-content__stats">
          <span>{{ t("adminContent.fileStats.size", { size: file.file_size ?? 0 }) }}</span>
          <span>{{ file.mime_type || t("adminContent.fileStats.unknownMime") }}</span>
          <span v-if="file.is_deleted">{{ t("adminContent.deleted") }}</span>
        </div>
        <button type="button" :disabled="!!busyKey" @click="toggleFile(file)">
          {{ file.is_deleted ? t("adminContent.actions.restore") : t("adminContent.actions.delete") }}
        </button>
      </article>
    </div>

    <nav class="admin-content__pagination" :aria-label="t('adminContent.pagination.label')">
      <button type="button" :disabled="currentPage <= 1 || loading" @click="currentPage--; loadContent()">{{ t("adminContent.pagination.previous") }}</button>
      <span>{{ t("adminContent.pagination.page", { page: currentPage, pages: totalPages, total: totalItems }) }}</span>
      <button type="button" :disabled="currentPage >= totalPages || loading" @click="currentPage++; loadContent()">{{ t("adminContent.pagination.next") }}</button>
    </nav>
  </section>
</template>

<style scoped lang="scss">
.admin-content {
  display: grid;
  gap: 1rem;
}

.admin-content__primary,
.admin-content__secondary,
.admin-content__tabs button,
.admin-content__card button,
.admin-content__pagination button {
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.admin-content__primary,
.admin-content__tabs button.active {
  border-color: transparent;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
}

.admin-content label {
  display: grid;
  gap: 0.35rem;

  span {
    color: var(--text-secondary);
    font-size: 0.84rem;
    font-weight: 700;
  }
}

.admin-content input,
.admin-content select {
  min-height: 40px;
  min-width: 180px;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--surface-primary);
  color: var(--text-primary);
}

.admin-content__tabs,
.admin-content__stats,
.admin-content__pagination {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.admin-content__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.admin-content__notice {
  margin: 0;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  background: var(--surface-primary);
  color: var(--text-primary);
  box-shadow: var(--card-shadow);

  &--success {
    border: 1px solid color-mix(in srgb, var(--semantic-success) 45%, var(--border-primary));
  }

  &--error {
    border: 1px solid color-mix(in srgb, var(--semantic-error) 45%, var(--border-primary));
  }
}

.admin-content__list {
  display: grid;
  gap: 0.8rem;
}

.admin-content__card {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);

  &--deleted {
    opacity: 0.72;
  }

  strong {
    display: block;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  p,
  span {
    margin: 0.35rem 0 0;
    color: var(--text-secondary);
    font-size: 0.88rem;
  }
}

.admin-content__pagination {
  justify-content: center;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .admin-content__charts {
    grid-template-columns: 1fr;
  }

  .admin-content__card {
    grid-template-columns: 1fr;
  }
}
</style>

