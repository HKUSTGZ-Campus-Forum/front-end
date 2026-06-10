<script setup lang="ts">
import type { AdminAuditLog } from "~/types/admin";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
const { formatDate } = useDateFormat();
const { getAuditLogs } = useAdminConsole();

const logs = ref<AdminAuditLog[]>([]);
const loading = ref(true);
const error = ref("");
const action = ref("");
const targetType = ref("");
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const perPage = 20;

async function loadLogs() {
  loading.value = true;
  error.value = "";
  try {
    const response = await getAuditLogs({
      action: action.value,
      target_type: targetType.value,
      page: currentPage.value,
      per_page: perPage,
    });
    logs.value = response.logs;
    totalItems.value = response.total;
    totalPages.value = Math.max(1, response.pages || 1);
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("adminConsole.errors.loadAudit");
  } finally {
    loading.value = false;
  }
}

function resetAndLoad() {
  currentPage.value = 1;
  loadLogs();
}

onMounted(loadLogs);
</script>

<template>
  <section class="admin-audit">
    <AdminPageHeader :eyebrow="t('nav.admin')" :title="t('adminAudit.title')" :description="t('adminAudit.description')">
      <template #actions>
        <button class="admin-audit__primary" type="button" :disabled="loading" @click="loadLogs">
          {{ loading ? t("adminAudit.actions.refreshing") : t("adminAudit.actions.refresh") }}
        </button>
      </template>
    </AdminPageHeader>

    <AdminFilterBar>
      <label>
        <span>{{ t("adminAudit.filters.action") }}</span>
        <input v-model="action" type="search" :placeholder="t('adminAudit.filters.actionPlaceholder')" @keyup.enter="resetAndLoad">
      </label>
      <label>
        <span>{{ t("adminAudit.filters.target") }}</span>
        <input v-model="targetType" type="search" :placeholder="t('adminAudit.filters.targetPlaceholder')" @keyup.enter="resetAndLoad">
      </label>
      <template #actions>
        <button class="admin-audit__secondary" type="button" @click="resetAndLoad">{{ t("adminAudit.actions.apply") }}</button>
      </template>
    </AdminFilterBar>

    <AdminStateBlock v-if="loading && !logs.length" :title="t('common.loading')" />
    <AdminStateBlock v-else-if="error" tone="error" :title="t('adminAudit.errors.title')" :message="error" />
    <AdminStateBlock v-else-if="!logs.length" :title="t('adminAudit.empty.title')" :message="t('adminAudit.empty.description')" />

    <div v-else class="admin-audit__list">
      <article v-for="log in logs" :key="log.id" class="admin-audit__card">
        <div>
          <strong>{{ log.action }}</strong>
          <p>{{ log.note || t("adminAudit.noNote") }}</p>
        </div>
        <div class="admin-audit__meta">
          <span>{{ log.actor || t("adminConsole.unknown") }}</span>
          <span>{{ log.target_type }} #{{ log.target_id || "-" }}</span>
          <span>{{ formatDate(log.created_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
        </div>
      </article>
    </div>

    <nav class="admin-audit__pagination" :aria-label="t('adminAudit.pagination.label')">
      <button type="button" :disabled="currentPage <= 1 || loading" @click="currentPage--; loadLogs()">{{ t("adminAudit.pagination.previous") }}</button>
      <span>{{ t("adminAudit.pagination.page", { page: currentPage, pages: totalPages, total: totalItems }) }}</span>
      <button type="button" :disabled="currentPage >= totalPages || loading" @click="currentPage++; loadLogs()">{{ t("adminAudit.pagination.next") }}</button>
    </nav>
  </section>
</template>

<style scoped lang="scss">
.admin-audit {
  display: grid;
  gap: 1rem;
}

.admin-audit__primary,
.admin-audit__secondary,
.admin-audit__pagination button {
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;
}

.admin-audit__primary {
  border-color: transparent;
  background: var(--interactive-primary);
  color: var(--text-inverse);
}

.admin-audit label {
  display: grid;
  gap: 0.35rem;

  span {
    color: var(--text-secondary);
    font-size: 0.84rem;
    font-weight: 700;
  }
}

.admin-audit input {
  min-height: 40px;
  min-width: 180px;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--surface-primary);
  color: var(--text-primary);
}

.admin-audit__list {
  display: grid;
  gap: 0.75rem;
}

.admin-audit__card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);

  strong {
    color: var(--text-primary);
  }

  p {
    margin: 0.35rem 0 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }
}

.admin-audit__meta,
.admin-audit__pagination {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.admin-audit__meta {
  justify-content: flex-end;

  span {
    color: var(--text-secondary);
    font-size: 0.88rem;
  }
}

.admin-audit__pagination {
  justify-content: center;
  color: var(--text-secondary);
}

@media (max-width: 820px) {
  .admin-audit__card {
    grid-template-columns: 1fr;
  }

  .admin-audit__meta {
    justify-content: flex-start;
  }
}
</style>

