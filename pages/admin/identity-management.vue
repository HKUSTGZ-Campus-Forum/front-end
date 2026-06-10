<script setup lang="ts">
import type { AdminChartDatum } from "~/types/admin";
import type {
  IdentityAdminCounts,
  IdentityAdminStatus,
  IdentityManagementItem,
  IdentityType,
  IdentityVerificationDocument,
} from "~/types/identity";
import { ConfirmModal } from "~/components/ui";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
const { formatDate } = useDateFormat();
const {
  identityTypes,
  loading,
  error,
  fetchIdentityTypes,
  fetchAdminIdentityRequests,
  approveIdentityRequest,
  rejectIdentityRequest,
  revokeIdentity,
} = useIdentity();

const requests = ref<IdentityManagementItem[]>([]);
const counts = ref<IdentityAdminCounts>({
  pending: 0,
  approved: 0,
  rejected: 0,
  revoked: 0,
  total: 0,
});
const selectedStatus = ref<IdentityAdminStatus | "">("");
const selectedType = ref("");
const sortOrder = ref<"newest" | "oldest" | "priority">("newest");
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const perPage = 12;
const busyKey = ref("");
const selectedIds = ref<Set<number>>(new Set());
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

const rejectModal = ref({
  show: false,
  request: null as IdentityManagementItem | null,
  reason: "",
  notes: "",
});

const bulkRejectModal = ref({
  show: false,
  reason: "",
});

const statusOptions = computed(() => [
  { value: "", label: t("adminIdentity.filters.allStatuses") },
  { value: "pending", label: t("adminIdentity.status.pending") },
  { value: "approved", label: t("adminIdentity.status.approved") },
  { value: "rejected", label: t("adminIdentity.status.rejected") },
  { value: "revoked", label: t("adminIdentity.status.revoked") },
]);

const sortOptions = computed(() => [
  { value: "newest", label: t("adminIdentity.sort.newest") },
  { value: "oldest", label: t("adminIdentity.sort.oldest") },
  { value: "priority", label: t("adminIdentity.sort.priority") },
]);

const metricItems = computed(() => [
  { key: "pending", label: t("adminIdentity.metrics.pending"), value: counts.value.pending },
  { key: "approved", label: t("adminIdentity.metrics.approved"), value: counts.value.approved },
  { key: "rejected", label: t("adminIdentity.metrics.rejected"), value: counts.value.rejected },
  { key: "total", label: t("adminIdentity.metrics.total"), value: counts.value.total },
]);

const statusDistribution = computed<AdminChartDatum[]>(() => statusOptions.value
  .filter((option) => option.value)
  .map((option) => ({
    label: option.label,
    value: counts.value[option.value as IdentityAdminStatus] || 0,
  }))
  .filter((item) => item.value > 0));

const typeDistribution = computed<AdminChartDatum[]>(() => Object.entries(counts.value.by_type || {})
  .map(([label, value]) => ({ label, value }))
  .filter((item) => item.value > 0));

const selectedCount = computed(() => selectedIds.value.size);
const isAllPageSelected = computed(() => (
  requests.value.length > 0 && requests.value.every((item) => selectedIds.value.has(item.id))
));

function identityTypeName(type: IdentityType) {
  return type.display_name || type.name;
}

function setNotice(type: "success" | "error", message: string) {
  notice.value = { type, message };
  window.setTimeout(() => {
    notice.value = null;
  }, 3600);
}

async function loadRequests() {
  const response = await fetchAdminIdentityRequests({
    status: selectedStatus.value,
    identity_type_id: selectedType.value,
    sort: sortOrder.value,
    page: currentPage.value,
    per_page: perPage,
  });

  requests.value = response.requests || [];
  counts.value = response.counts;
  totalItems.value = response.total;
  totalPages.value = Math.max(1, response.pages || 1);
  selectedIds.value.clear();
}

async function refreshData() {
  try {
    await Promise.all([
      identityTypes.value.length ? Promise.resolve() : fetchIdentityTypes(),
      loadRequests(),
    ]);
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminIdentity.errors.loadFailed"));
  }
}

function resetAndRefresh() {
  currentPage.value = 1;
  refreshData();
}

function toggleSelection(id: number) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
}

function toggleSelectPage() {
  const next = new Set(selectedIds.value);
  if (isAllPageSelected.value) {
    requests.value.forEach((item) => next.delete(item.id));
  } else {
    requests.value.forEach((item) => next.add(item.id));
  }
  selectedIds.value = next;
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

async function approveRequest(request: IdentityManagementItem) {
  busyKey.value = `approve-${request.id}`;
  try {
    await approveIdentityRequest(request.id);
    setNotice("success", t("adminIdentity.messages.approved"));
    await loadRequests();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminIdentity.errors.approveFailed"));
  } finally {
    busyKey.value = "";
  }
}

function openRejectModal(request: IdentityManagementItem) {
  rejectModal.value = {
    show: true,
    request,
    reason: "",
    notes: "",
  };
}

async function submitReject() {
  const request = rejectModal.value.request;
  if (!request || !rejectModal.value.reason.trim()) return;

  busyKey.value = `reject-${request.id}`;
  try {
    await rejectIdentityRequest(
      request.id,
      rejectModal.value.reason.trim(),
      rejectModal.value.notes.trim() || undefined,
    );
    setNotice("success", t("adminIdentity.messages.rejected"));
    rejectModal.value.show = false;
    await loadRequests();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminIdentity.errors.rejectFailed"));
  } finally {
    busyKey.value = "";
  }
}

async function revokeRequest(request: IdentityManagementItem) {
  busyKey.value = `revoke-${request.id}`;
  try {
    await revokeIdentity(request.id, t("adminIdentity.revoke.defaultReason"));
    setNotice("success", t("adminIdentity.messages.revoked"));
    await loadRequests();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminIdentity.errors.revokeFailed"));
  } finally {
    busyKey.value = "";
  }
}

async function approveSelected() {
  const ids = Array.from(selectedIds.value);
  busyKey.value = "bulk-approve";
  try {
    await Promise.all(ids.map((id) => approveIdentityRequest(id)));
    setNotice("success", t("adminIdentity.messages.bulkApproved", { count: ids.length }));
    await loadRequests();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminIdentity.errors.bulkFailed"));
  } finally {
    busyKey.value = "";
  }
}

async function rejectSelected() {
  const ids = Array.from(selectedIds.value);
  if (!bulkRejectModal.value.reason.trim()) return;

  busyKey.value = "bulk-reject";
  try {
    await Promise.all(ids.map((id) => rejectIdentityRequest(id, bulkRejectModal.value.reason.trim())));
    setNotice("success", t("adminIdentity.messages.bulkRejected", { count: ids.length }));
    bulkRejectModal.value.show = false;
    await loadRequests();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminIdentity.errors.bulkFailed"));
  } finally {
    busyKey.value = "";
  }
}

function openDocument(document: IdentityVerificationDocument) {
  if (!document.view_url) return;
  window.open(document.view_url, "_blank", "noopener,noreferrer");
}

function pageTo(page: number) {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value);
  refreshData();
}

function statusClass(status: IdentityAdminStatus) {
  return `identity-status identity-status--${status}`;
}

watch([selectedStatus, selectedType, sortOrder], resetAndRefresh);
onMounted(refreshData);
</script>

<template>
  <section class="admin-identity">
    <AdminPageHeader
      :eyebrow="t('nav.admin')"
      :title="t('adminIdentity.title')"
      :description="t('adminIdentity.description')"
    >
      <template #actions>
        <button class="admin-identity__primary-btn" type="button" :disabled="loading" @click="refreshData">
          {{ loading ? t("adminIdentity.actions.refreshing") : t("adminIdentity.actions.refresh") }}
        </button>
      </template>
    </AdminPageHeader>

    <AdminMetricStrip :items="metricItems" />

    <div class="admin-identity__charts">
      <AdminDonutChart :title="t('adminIdentity.charts.status')" :items="statusDistribution" />
      <AdminBarChart :title="t('adminIdentity.charts.types')" :items="typeDistribution" horizontal />
    </div>

    <AdminFilterBar>
      <label class="admin-identity__field">
        <span>{{ t("adminIdentity.filters.status") }}</span>
        <select v-model="selectedStatus">
          <option v-for="item in statusOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="admin-identity__field">
        <span>{{ t("adminIdentity.filters.type") }}</span>
        <select v-model="selectedType">
          <option value="">{{ t("adminIdentity.filters.allTypes") }}</option>
          <option v-for="item in identityTypes" :key="item.id" :value="item.id">
            {{ identityTypeName(item) }}
          </option>
        </select>
      </label>

      <label class="admin-identity__field">
        <span>{{ t("adminIdentity.filters.sort") }}</span>
        <select v-model="sortOrder">
          <option v-for="item in sortOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <template #actions>
        <button
          class="admin-identity__ghost-btn"
          type="button"
          :disabled="!requests.length"
          @click="toggleSelectPage"
        >
          {{ isAllPageSelected ? t("adminIdentity.actions.clearPage") : t("adminIdentity.actions.selectPage") }}
        </button>
        <button
          class="admin-identity__ghost-btn"
          type="button"
          :disabled="selectedCount === 0 || busyKey === 'bulk-approve'"
          @click="openConfirm({
            title: t('adminIdentity.bulkApprove.title'),
            message: t('adminIdentity.bulkApprove.message', { count: selectedCount }),
            confirmText: t('adminIdentity.actions.approve'),
            action: approveSelected
          })"
        >
          {{ t("adminIdentity.actions.bulkApprove", { count: selectedCount }) }}
        </button>
        <button
          class="admin-identity__danger-ghost-btn"
          type="button"
          :disabled="selectedCount === 0 || busyKey === 'bulk-reject'"
          @click="bulkRejectModal.show = true"
        >
          {{ t("adminIdentity.actions.bulkReject", { count: selectedCount }) }}
        </button>
      </template>
    </AdminFilterBar>

    <p v-if="notice" class="admin-identity__notice" :class="`admin-identity__notice--${notice.type}`">
      {{ notice.message }}
    </p>

    <AdminStateBlock v-if="loading && !requests.length" :title="t('common.loading')" />
    <AdminStateBlock
      v-else-if="error && !requests.length"
      tone="error"
      :title="t('adminIdentity.errors.title')"
      :message="error"
    >
      <button class="admin-identity__inline-btn" type="button" @click="refreshData">
        {{ t("common.retry") }}
      </button>
    </AdminStateBlock>
    <AdminStateBlock
      v-else-if="!requests.length"
      :title="t('adminIdentity.empty.title')"
      :message="t('adminIdentity.empty.description')"
    />

    <div v-else class="admin-identity__list">
      <article v-for="request in requests" :key="request.id" class="admin-identity-card">
        <label class="admin-identity-card__select">
          <input
            type="checkbox"
            :checked="selectedIds.has(request.id)"
            @change="toggleSelection(request.id)"
          />
          <span>{{ t("adminIdentity.actions.selectOne") }}</span>
        </label>

        <div class="admin-identity-card__main">
          <header class="admin-identity-card__header">
            <div class="admin-identity-card__user">
              <div class="admin-identity-card__avatar">
                <img
                  v-if="request.user.profile_picture_url"
                  :src="request.user.profile_picture_url"
                  :alt="request.user.username"
                />
                <span v-else>{{ request.user.username.slice(0, 1).toUpperCase() }}</span>
              </div>
              <div>
                <h2>{{ request.user.username }}</h2>
                <p>{{ request.user.email || t("adminIdentity.user.noEmail") }}</p>
              </div>
            </div>

            <div class="admin-identity-card__meta">
              <span :class="statusClass(request.status)">
                {{ t(`adminIdentity.status.${request.status}`) }}
              </span>
              <span>{{ t("adminIdentity.requestedAt", { date: formatDate(request.created_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }) }}</span>
            </div>
          </header>

          <section class="admin-identity-card__identity">
            <div>
              <strong>{{ request.identity_type.display_name }}</strong>
              <p>{{ request.identity_type.description }}</p>
            </div>
          </section>

          <section v-if="request.verification_documents?.length" class="admin-identity-card__documents">
            <h3>{{ t("adminIdentity.documents.title") }}</h3>
            <button
              v-for="document in request.verification_documents"
              :key="document.file_id || document.filename || document.uploaded_at || 'document'"
              class="admin-identity-card__document"
              type="button"
              :disabled="!document.view_url"
              @click="openDocument(document)"
            >
              <span>{{ document.filename || t("adminIdentity.documents.unnamed") }}</span>
              <small>
                {{ document.uploaded_at ? formatDate(document.uploaded_at, { year: 'numeric', month: 'short', day: 'numeric' }) : t("adminIdentity.documents.noDate") }}
              </small>
            </button>
          </section>

          <section v-if="request.notes || request.rejection_reason" class="admin-identity-card__notes">
            <p v-if="request.notes">
              <strong>{{ t("adminIdentity.notes") }}</strong>
              {{ request.notes }}
            </p>
            <p v-if="request.rejection_reason">
              <strong>{{ t("adminIdentity.rejectionReason") }}</strong>
              {{ request.rejection_reason }}
            </p>
          </section>

          <footer class="admin-identity-card__footer">
            <AdminActionButtons
              v-if="request.status === 'pending'"
              :primary-label="t('adminIdentity.actions.approve')"
              :danger-label="t('adminIdentity.actions.reject')"
              :disabled="busyKey.endsWith(`-${request.id}`)"
              @primary="openConfirm({
                title: t('adminIdentity.approve.title'),
                message: t('adminIdentity.approve.message', { user: request.user.username, type: request.identity_type.display_name }),
                confirmText: t('adminIdentity.actions.approve'),
                action: () => approveRequest(request)
              })"
              @danger="openRejectModal(request)"
            />
            <AdminActionButtons
              v-else-if="request.status === 'approved'"
              :danger-label="t('adminIdentity.actions.revoke')"
              :disabled="busyKey === `revoke-${request.id}`"
              @danger="openConfirm({
                title: t('adminIdentity.revoke.title'),
                message: t('adminIdentity.revoke.message', { user: request.user.username, type: request.identity_type.display_name }),
                confirmText: t('adminIdentity.actions.revoke'),
                action: () => revokeRequest(request)
              })"
            />
            <span v-else class="admin-identity-card__processed">
              {{ request.verified_at ? t("adminIdentity.processedAt", { date: formatDate(request.verified_at, { year: 'numeric', month: 'short', day: 'numeric' }) }) : t("adminIdentity.processed") }}
            </span>
          </footer>
        </div>
      </article>

      <nav class="admin-identity__pagination" :aria-label="t('adminIdentity.pagination.label')">
        <button type="button" :disabled="currentPage === 1" @click="pageTo(currentPage - 1)">
          {{ t("adminIdentity.pagination.previous") }}
        </button>
        <span>{{ t("adminIdentity.pagination.page", { page: currentPage, pages: totalPages, total: totalItems }) }}</span>
        <button type="button" :disabled="currentPage >= totalPages" @click="pageTo(currentPage + 1)">
          {{ t("adminIdentity.pagination.next") }}
        </button>
      </nav>
    </div>

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

    <div v-if="rejectModal.show" class="admin-identity-modal" @click.self="rejectModal.show = false">
      <form class="admin-identity-modal__panel" @submit.prevent="submitReject">
        <h2>{{ t("adminIdentity.reject.title") }}</h2>
        <p>{{ t("adminIdentity.reject.message", { user: rejectModal.request?.user.username || '' }) }}</p>
        <label>
          <span>{{ t("adminIdentity.reject.reason") }}</span>
          <textarea v-model="rejectModal.reason" rows="4" required />
        </label>
        <label>
          <span>{{ t("adminIdentity.reject.notes") }}</span>
          <textarea v-model="rejectModal.notes" rows="3" />
        </label>
        <div class="admin-identity-modal__actions">
          <button type="button" class="admin-identity__ghost-btn" @click="rejectModal.show = false">
            {{ t("actions.cancel") }}
          </button>
          <button type="submit" class="admin-identity__danger-btn" :disabled="!rejectModal.reason.trim() || !!busyKey">
            {{ t("adminIdentity.actions.reject") }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="bulkRejectModal.show" class="admin-identity-modal" @click.self="bulkRejectModal.show = false">
      <form class="admin-identity-modal__panel" @submit.prevent="rejectSelected">
        <h2>{{ t("adminIdentity.bulkReject.title") }}</h2>
        <p>{{ t("adminIdentity.bulkReject.message", { count: selectedCount }) }}</p>
        <label>
          <span>{{ t("adminIdentity.reject.reason") }}</span>
          <textarea v-model="bulkRejectModal.reason" rows="4" required />
        </label>
        <div class="admin-identity-modal__actions">
          <button type="button" class="admin-identity__ghost-btn" @click="bulkRejectModal.show = false">
            {{ t("actions.cancel") }}
          </button>
          <button type="submit" class="admin-identity__danger-btn" :disabled="!bulkRejectModal.reason.trim() || !!busyKey">
            {{ t("adminIdentity.actions.bulkReject", { count: selectedCount }) }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped lang="scss">
.admin-identity {
  min-width: 0;
}

.admin-identity__primary-btn,
.admin-identity__inline-btn,
.admin-identity__ghost-btn,
.admin-identity__danger-ghost-btn,
.admin-identity__danger-btn {
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.admin-identity__primary-btn,
.admin-identity__inline-btn {
  border: 0;
  background: var(--interactive-primary);
  color: var(--text-inverse);
}

.admin-identity__ghost-btn {
  border: 1px solid var(--border-primary);
  background: var(--surface-primary);
  color: var(--text-primary);
}

.admin-identity__danger-ghost-btn {
  border: 1px solid color-mix(in srgb, var(--semantic-error) 35%, var(--border-primary));
  background: var(--surface-primary);
  color: var(--semantic-error);
}

.admin-identity__danger-btn {
  border: 0;
  background: var(--semantic-error);
  color: var(--text-inverse);
}

.admin-identity__field {
  display: flex;
  min-width: 170px;
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

.admin-identity__notice {
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.admin-identity__notice--success {
  border: 1px solid color-mix(in srgb, var(--semantic-success) 35%, var(--border-primary));
  color: var(--semantic-success);
}

.admin-identity__notice--error {
  border: 1px solid color-mix(in srgb, var(--semantic-error) 35%, var(--border-primary));
  color: var(--semantic-error);
}

.admin-identity__charts {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 1rem;
}

.admin-identity__list {
  display: grid;
  gap: 0.85rem;
}

.admin-identity-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.admin-identity-card__select {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.82rem;

  input {
    width: 18px;
    height: 18px;
    margin-top: 0.15rem;
    accent-color: var(--interactive-primary);
  }

  span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
}

.admin-identity-card__main {
  min-width: 0;
}

.admin-identity-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.admin-identity-card__user {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1rem;
  }

  p {
    margin: 0.25rem 0 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }
}

.admin-identity-card__avatar {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  display: grid;
  place-items: center;
  font-weight: 800;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.admin-identity-card__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: right;
}

.identity-status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: var(--surface-secondary);
  color: var(--text-secondary);
  font-weight: 800;
}

.identity-status--pending {
  background: color-mix(in srgb, var(--semantic-warning) 14%, white);
  color: #9a5b00;
}

.identity-status--approved {
  background: color-mix(in srgb, var(--semantic-success) 14%, white);
  color: #08754f;
}

.identity-status--rejected,
.identity-status--revoked {
  background: color-mix(in srgb, var(--semantic-error) 12%, white);
  color: #b42323;
}

.admin-identity-card__identity,
.admin-identity-card__documents,
.admin-identity-card__notes {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--border-secondary);
}

.admin-identity-card__identity {
  strong {
    color: var(--text-primary);
  }

  p {
    margin: 0.35rem 0 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }
}

.admin-identity-card__documents {
  display: grid;
  gap: 0.55rem;

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.92rem;
  }
}

.admin-identity-card__document {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  background: var(--surface-secondary);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  span {
    overflow-wrap: anywhere;
  }

  small {
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

.admin-identity-card__notes {
  display: grid;
  gap: 0.4rem;

  p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }

  strong {
    color: var(--text-primary);
    margin-right: 0.35rem;
  }
}

.admin-identity-card__footer {
  margin-top: 1rem;
}

.admin-identity-card__processed {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.admin-identity__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.6rem;
  color: var(--text-secondary);

  button {
    min-height: 38px;
    padding: 0.5rem 0.85rem;
    border: 1px solid var(--border-primary);
    border-radius: 999px;
    background: var(--surface-primary);
    color: var(--text-primary);
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }
}

.admin-identity-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: var(--modal-backdrop);
}

.admin-identity-modal__panel {
  width: min(560px, 100%);
  padding: 1.25rem;
  border-radius: 8px;
  background: var(--modal-bg);
  box-shadow: var(--modal-shadow);

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.55;
  }

  label {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.9rem;
    color: var(--text-primary);
    font-weight: 700;
  }

  textarea {
    width: 100%;
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    background: var(--surface-primary);
    color: var(--text-primary);
    padding: 0.8rem;
    resize: vertical;
    font: inherit;
  }
}

.admin-identity-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

@media (max-width: 760px) {
  .admin-identity__charts {
    grid-template-columns: 1fr;
  }

  .admin-identity-card {
    grid-template-columns: 1fr;
  }

  .admin-identity-card__header {
    flex-direction: column;
  }

  .admin-identity-card__meta {
    align-items: flex-start;
    text-align: left;
  }

  .admin-identity__pagination {
    flex-wrap: wrap;
  }
}
</style>
