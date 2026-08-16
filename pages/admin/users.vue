<script setup lang="ts">
import type { AdminChartDatum, AdminDistributionCounts, AdminMetricCounts, AdminRole, AdminUser } from "~/types/admin";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
const { formatDate } = useDateFormat();
const { getUsers, updateUserRole, setUserDeleted } = useAdminConsole();

const users = ref<AdminUser[]>([]);
const roles = ref<AdminRole[]>([]);
const counts = ref<AdminMetricCounts>({});
const loading = ref(true);
const error = ref("");
const notice = ref<{ type: "success" | "error"; message: string } | null>(null);
const busyKey = ref("");
const search = ref("");
const selectedRole = ref("");
const selectedDeleted = ref<"" | "true" | "false">("");
const selectedEmail = ref<"" | "true" | "false">("");
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const perPage = 12;

const metricItems = computed(() => [
  { key: "total", label: t("adminUsers.metrics.total"), value: numberCount("total") },
  { key: "verified", label: t("adminUsers.metrics.verified"), value: numberCount("email_verified") },
  { key: "deleted", label: t("adminUsers.metrics.deleted"), value: numberCount("deleted") },
  { key: "page", label: t("adminUsers.metrics.page"), value: users.value.length },
]);

function numberCount(key: string) {
  const value = counts.value[key];
  return typeof value === "number" ? value : 0;
}

function distributionCount(key: string): AdminDistributionCounts {
  const value = counts.value[key];
  return value && typeof value === "object" ? value as AdminDistributionCounts : {};
}

function distributionItems(source: AdminDistributionCounts, labels: Record<string, string> = {}): AdminChartDatum[] {
  return Object.entries(source)
    .map(([label, value]) => ({ label: labels[label] || label, value }))
    .filter((item) => item.value > 0);
}

const roleDistribution = computed(() => distributionItems(distributionCount("roles")));
const statusDistribution = computed(() => distributionItems(distributionCount("status"), {
  active: t("adminUsers.charts.labels.active"),
  deleted: t("adminUsers.charts.labels.deleted"),
}));
const emailDistribution = computed(() => distributionItems(distributionCount("email"), {
  verified: t("adminUsers.charts.labels.emailVerified"),
  unverified: t("adminUsers.charts.labels.emailUnverified"),
}));

function setNotice(type: "success" | "error", message: string) {
  notice.value = { type, message };
  window.setTimeout(() => {
    notice.value = null;
  }, 3600);
}

async function loadUsers() {
  loading.value = true;
  error.value = "";
  try {
    const response = await getUsers({
      search: search.value,
      role: selectedRole.value,
      deleted: selectedDeleted.value,
      email_verified: selectedEmail.value,
      page: currentPage.value,
      per_page: perPage,
    });
    users.value = response.users;
    roles.value = response.roles;
    counts.value = response.counts || {};
    totalItems.value = response.total;
    totalPages.value = Math.max(1, response.pages || 1);
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("adminConsole.errors.loadUsers");
  } finally {
    loading.value = false;
  }
}

function resetAndLoad() {
  currentPage.value = 1;
  loadUsers();
}

async function changeRole(user: AdminUser, event: Event) {
  const roleName = (event.target as HTMLSelectElement).value;
  if (!roleName || roleName === user.role_name) return;
  busyKey.value = `role-${user.id}`;
  try {
    await updateUserRole(user.id, roleName, t("adminUsers.audit.roleChange"));
    setNotice("success", t("adminUsers.messages.roleUpdated"));
    await loadUsers();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminConsole.errors.updateUser"));
  } finally {
    busyKey.value = "";
  }
}

async function toggleDeleted(user: AdminUser) {
  const nextDeleted = !user.is_deleted;
  if (!window.confirm(nextDeleted ? t("adminUsers.confirm.delete") : t("adminUsers.confirm.restore"))) return;
  busyKey.value = `delete-${user.id}`;
  try {
    await setUserDeleted(user.id, nextDeleted, nextDeleted ? t("adminUsers.audit.delete") : t("adminUsers.audit.restore"));
    setNotice("success", nextDeleted ? t("adminUsers.messages.deleted") : t("adminUsers.messages.restored"));
    await loadUsers();
  } catch (err) {
    setNotice("error", err instanceof Error ? err.message : t("adminConsole.errors.updateUser"));
  } finally {
    busyKey.value = "";
  }
}

watch([selectedRole, selectedDeleted, selectedEmail], resetAndLoad);
onMounted(loadUsers);
</script>

<template>
  <section class="admin-users">
    <AdminPageHeader
      :eyebrow="t('nav.admin')"
      :title="t('adminUsers.title')"
      :description="t('adminUsers.description')"
    >
      <template #actions>
        <button class="admin-users__primary" type="button" :disabled="loading" @click="loadUsers">
          {{ loading ? t("adminUsers.actions.refreshing") : t("adminUsers.actions.refresh") }}
        </button>
      </template>
    </AdminPageHeader>

    <AdminMetricStrip :items="metricItems" />

    <div class="admin-users__charts">
      <AdminDonutChart :title="t('adminUsers.charts.roles')" :items="roleDistribution" />
      <AdminDonutChart :title="t('adminUsers.charts.status')" :items="statusDistribution" />
      <AdminDonutChart :title="t('adminUsers.charts.email')" :items="emailDistribution" />
    </div>

    <AdminFilterBar>
      <label>
        <span>{{ t("adminUsers.filters.search") }}</span>
        <input v-model="search" type="search" :placeholder="t('adminUsers.filters.searchPlaceholder')" @keyup.enter="resetAndLoad">
      </label>
      <label>
        <span>{{ t("adminUsers.filters.role") }}</span>
        <select v-model="selectedRole">
          <option value="">{{ t("adminUsers.filters.allRoles") }}</option>
          <option v-for="role in roles" :key="role.id" :value="role.name">{{ role.name }}</option>
        </select>
      </label>
      <label>
        <span>{{ t("adminUsers.filters.deleted") }}</span>
        <select v-model="selectedDeleted">
          <option value="">{{ t("adminUsers.filters.allUsers") }}</option>
          <option value="false">{{ t("adminUsers.filters.activeOnly") }}</option>
          <option value="true">{{ t("adminUsers.filters.deletedOnly") }}</option>
        </select>
      </label>
      <label>
        <span>{{ t("adminUsers.filters.email") }}</span>
        <select v-model="selectedEmail">
          <option value="">{{ t("adminUsers.filters.allEmail") }}</option>
          <option value="true">{{ t("adminUsers.filters.emailVerified") }}</option>
          <option value="false">{{ t("adminUsers.filters.emailUnverified") }}</option>
        </select>
      </label>
      <template #actions>
        <button class="admin-users__secondary" type="button" @click="resetAndLoad">
          {{ t("adminUsers.actions.apply") }}
        </button>
      </template>
    </AdminFilterBar>

    <p v-if="notice" class="admin-users__notice" :class="`admin-users__notice--${notice.type}`">{{ notice.message }}</p>
    <AdminStateBlock v-if="loading && !users.length" :title="t('common.loading')" />
    <AdminStateBlock v-else-if="error" tone="error" :title="t('adminUsers.errors.title')" :message="error" />
    <AdminStateBlock v-else-if="!users.length" :title="t('adminUsers.empty.title')" :message="t('adminUsers.empty.description')" />

    <div v-else class="admin-users__list">
      <article v-for="user in users" :key="user.id" class="admin-users__card" :class="{ 'admin-users__card--deleted': user.is_deleted }">
        <div class="admin-users__identity">
          <strong>{{ user.username }}</strong>
          <span>{{ user.email || t("adminUsers.noEmail") }}</span>
        </div>
        <div class="admin-users__meta">
          <span>{{ t("adminUsers.createdAt", { date: formatDate(user.created_at, { year: 'numeric', month: 'short', day: 'numeric' }) }) }}</span>
          <span>{{ user.email_verified ? t("adminUsers.emailVerified") : t("adminUsers.emailUnverified") }}</span>
          <span v-if="user.is_deleted">{{ t("adminUsers.deleted") }}</span>
        </div>
        <div class="admin-users__actions">
          <select :value="user.role_name || ''" :disabled="!!busyKey" @change="changeRole(user, $event)">
            <option v-for="role in roles" :key="role.id" :value="role.name">{{ role.name }}</option>
          </select>
          <button type="button" :disabled="!!busyKey" @click="toggleDeleted(user)">
            {{ user.is_deleted ? t("adminUsers.actions.restore") : t("adminUsers.actions.delete") }}
          </button>
        </div>
      </article>
    </div>

    <nav class="admin-users__pagination" :aria-label="t('adminUsers.pagination.label')">
      <button type="button" :disabled="currentPage <= 1 || loading" @click="currentPage--; loadUsers()">{{ t("adminUsers.pagination.previous") }}</button>
      <span>{{ t("adminUsers.pagination.page", { page: currentPage, pages: totalPages, total: totalItems }) }}</span>
      <button type="button" :disabled="currentPage >= totalPages || loading" @click="currentPage++; loadUsers()">{{ t("adminUsers.pagination.next") }}</button>
    </nav>
  </section>
</template>

<style scoped lang="scss">
.admin-users {
  display: grid;
  gap: 1rem;
}

.admin-users__primary,
.admin-users__secondary,
.admin-users__actions button,
.admin-users__pagination button {
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.admin-users__primary {
  border-color: transparent;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
}

.admin-users__secondary,
.admin-users__actions button,
.admin-users__pagination button {
  background: var(--surface-primary);
  color: var(--text-primary);
}

.admin-users label {
  display: grid;
  gap: 0.35rem;

  span {
    color: var(--text-secondary);
    font-size: 0.84rem;
    font-weight: 700;
  }
}

.admin-users input,
.admin-users select {
  min-height: 40px;
  min-width: 160px;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--surface-primary);
  color: var(--text-primary);
}

.admin-users__notice {
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

.admin-users__charts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.admin-users__list {
  display: grid;
  gap: 0.8rem;
}

.admin-users__card {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.2fr) auto;
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
}

.admin-users__identity,
.admin-users__meta {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
}

.admin-users__identity strong {
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.admin-users__identity span,
.admin-users__meta span {
  color: var(--text-secondary);
  font-size: 0.88rem;
  overflow-wrap: anywhere;
}

.admin-users__actions,
.admin-users__pagination {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.admin-users__pagination {
  justify-content: center;
  color: var(--text-secondary);
}

@media (max-width: 860px) {
  .admin-users__charts {
    grid-template-columns: 1fr;
  }

  .admin-users__card {
    grid-template-columns: 1fr;
  }
}
</style>

