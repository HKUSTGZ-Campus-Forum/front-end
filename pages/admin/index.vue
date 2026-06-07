<script setup lang="ts">
import type { AdminOverviewResponse } from "~/types/admin";

const { t } = useI18n();
const { getLocalePath } = useAppLocale();
const { getOverview } = useAdminConsole();

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const loading = ref(false);
const loadError = ref<string | null>(null);
const overview = ref<AdminOverviewResponse | null>(null);

const metricValue = (value: number | null) => {
  if (value !== null) return value;
  return loading.value ? "..." : "-";
};

const metricItems = computed(() => [
  {
    key: "pending-feedback",
    label: t("adminOverview.metrics.pendingFeedback"),
    value: metricValue(overview.value?.pending.feedbacks ?? null),
  },
  {
    key: "pending-merge",
    label: t("adminOverview.metrics.pendingMerge"),
    value: metricValue(overview.value?.pending.merge_requests ?? null),
  },
  {
    key: "pending-identity",
    label: t("adminOverview.metrics.pendingIdentity"),
    value: metricValue(overview.value?.pending.identity_requests ?? null),
  },
  {
    key: "active-users",
    label: t("adminOverview.metrics.activeUsers"),
    value: metricValue(overview.value?.metrics.users.active ?? null),
  },
]);

const cards = computed(() => [
  {
    title: t("adminOverview.cards.users.title"),
    description: t("adminOverview.cards.users.description"),
    action: t("adminOverview.cards.users.action"),
    to: getLocalePath("/admin/users"),
    stats: [
      { label: t("adminOverview.metrics.usersTotal"), value: metricValue(overview.value?.metrics.users.total ?? null) },
      { label: t("adminOverview.metrics.adminUsers"), value: metricValue(overview.value?.metrics.users.admins ?? null) },
    ],
  },
  {
    title: t("adminOverview.cards.content.title"),
    description: t("adminOverview.cards.content.description"),
    action: t("adminOverview.cards.content.action"),
    to: getLocalePath("/admin/content"),
    stats: [
      { label: t("adminOverview.metrics.postsTotal"), value: metricValue(overview.value?.metrics.content.posts.total ?? null) },
      { label: t("adminOverview.metrics.commentsTotal"), value: metricValue(overview.value?.metrics.content.comments.total ?? null) },
    ],
  },
  {
    title: t("adminOverview.cards.feedback.title"),
    description: t("adminOverview.cards.feedback.description"),
    action: t("adminOverview.cards.feedback.action"),
    to: getLocalePath("/admin/feedback"),
    stats: [
      {
        label: t("adminOverview.metrics.pendingFeedback"),
        value: metricValue(overview.value?.pending.feedbacks ?? null),
      },
      {
        label: t("adminOverview.metrics.pendingMerge"),
        value: metricValue(overview.value?.pending.merge_requests ?? null),
      },
    ],
  },
  {
    title: t("adminOverview.cards.identity.title"),
    description: t("adminOverview.cards.identity.description"),
    action: t("adminOverview.cards.identity.action"),
    to: getLocalePath("/admin/identity-management"),
    stats: [
      {
        label: t("adminOverview.metrics.pendingIdentity"),
        value: metricValue(overview.value?.pending.identity_requests ?? null),
      },
    ],
  },
  {
    title: t("adminOverview.cards.domains.title"),
    description: t("adminOverview.cards.domains.description"),
    action: t("adminOverview.cards.domains.action"),
    to: getLocalePath("/admin/domains"),
    stats: [
      { label: t("adminOverview.metrics.coursesTotal"), value: metricValue(overview.value?.metrics.courses.courses ?? null) },
      { label: t("adminOverview.metrics.projectsTotal"), value: metricValue(overview.value?.metrics.matching.projects ?? null) },
    ],
  },
  {
    title: t("adminOverview.cards.audit.title"),
    description: t("adminOverview.cards.audit.description"),
    action: t("adminOverview.cards.audit.action"),
    to: getLocalePath("/admin/audit"),
    stats: [
      { label: t("adminOverview.metrics.auditRecent"), value: overview.value?.recent_activity.length ?? (loading.value ? "..." : "-") },
    ],
  },
]);

const healthRows = computed(() => {
  const metrics = overview.value?.metrics;
  if (!metrics) return [];
  return [
    { key: "courses", label: t("adminDomains.sections.courses"), value: metrics.courses.offerings },
    { key: "academic", label: t("adminDomains.sections.academicMap"), value: metrics.academic_map.user_profiles },
    { key: "matching", label: t("adminDomains.sections.matching"), value: metrics.matching.active_projects },
    { key: "contest", label: t("adminDomains.sections.contest"), value: metrics.contest.submissions },
    { key: "operations", label: t("adminDomains.sections.operations"), value: metrics.operations.valid_sts_tokens },
  ];
});

const loadOverview = async () => {
  loading.value = true;
  loadError.value = null;

  try {
    overview.value = await getOverview();
  } catch {
    loadError.value = t("adminOverview.status.loadFailed");
  } finally {
    loading.value = false;
  }
};

onMounted(loadOverview);
</script>

<template>
  <section class="admin-overview">
    <AdminPageHeader
      :title="t('adminOverview.title')"
      :description="t('adminOverview.description')"
    >
      <template #actions>
        <button class="admin-overview__refresh" :disabled="loading" @click="loadOverview">
          {{ loading ? t("adminOverview.actions.refreshing") : t("adminOverview.actions.refresh") }}
        </button>
      </template>
    </AdminPageHeader>

    <AdminMetricStrip :items="metricItems" />

    <AdminStateBlock
      v-if="loadError"
      :title="t('adminOverview.status.moduleError')"
      :message="loadError"
      tone="error"
    />

    <section class="admin-overview__modules" :aria-label="t('adminOverview.modulesTitle')">
      <h2>{{ t("adminOverview.modulesTitle") }}</h2>

      <div class="admin-overview__grid">
        <article v-for="card in cards" :key="card.title" class="admin-overview__card">
          <div class="admin-overview__card-copy">
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
          </div>

          <dl class="admin-overview__card-stats">
            <div v-for="stat in card.stats" :key="stat.label">
              <dt>{{ stat.label }}</dt>
              <dd>{{ stat.value }}</dd>
            </div>
          </dl>

          <NuxtLink :to="card.to" class="admin-overview__action">
            {{ card.action }}
          </NuxtLink>
        </article>
      </div>
    </section>

    <section class="admin-overview__health" :aria-label="t('adminOverview.healthTitle')">
      <h2>{{ t("adminOverview.healthTitle") }}</h2>
      <div class="admin-overview__health-grid">
        <article v-for="row in healthRows" :key="row.key">
          <span>{{ row.label }}</span>
          <strong>{{ row.value }}</strong>
        </article>
      </div>
    </section>

    <section class="admin-overview__activity" :aria-label="t('adminOverview.activityTitle')">
      <h2>{{ t("adminOverview.activityTitle") }}</h2>
      <AdminStateBlock
        v-if="overview && !overview.recent_activity.length"
        :title="t('adminOverview.activityEmpty')"
      />
      <div v-else class="admin-overview__activity-list">
        <article v-for="log in overview?.recent_activity || []" :key="log.id">
          <strong>{{ log.action }}</strong>
          <span>{{ log.actor || t("adminConsole.unknown") }} · {{ log.target_type }} #{{ log.target_id || "-" }}</span>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.admin-overview {
  display: grid;
  gap: 1rem;
}

.admin-overview__refresh,
.admin-overview__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
}

.admin-overview__refresh {
  border: 0;
  background: var(--interactive-primary);
  color: #fff;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

.admin-overview__modules {
  h2 {
    margin: 0 0 0.75rem;
    color: var(--text-primary);
    font-size: 1.1rem;
  }
}

.admin-overview__health,
.admin-overview__activity {
  h2 {
    margin: 0 0 0.75rem;
    color: var(--text-primary);
    font-size: 1.1rem;
  }
}

.admin-overview__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.admin-overview__card {
  display: grid;
  gap: 1rem;
  padding: 1.15rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.admin-overview__health-grid,
.admin-overview__activity-list {
  display: grid;
  gap: 0.75rem;
}

.admin-overview__health-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));

  article {
    padding: 1rem;
    border: var(--card-border);
    border-radius: 8px;
    background: var(--surface-primary);
    box-shadow: var(--card-shadow);
  }

  span {
    display: block;
    color: var(--text-secondary);
    font-size: 0.86rem;
    font-weight: 600;
  }

  strong {
    display: block;
    margin-top: 0.35rem;
    color: var(--text-primary);
    font-size: 1.35rem;
  }
}

.admin-overview__activity-list {
  article {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1rem;
    border: var(--card-border);
    border-radius: 8px;
    background: var(--surface-primary);
    box-shadow: var(--card-shadow);
  }

  strong {
    color: var(--text-primary);
  }

  span {
    color: var(--text-secondary);
    font-size: 0.88rem;
  }
}

.admin-overview__card-copy {
  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  p {
    margin: 0.55rem 0 0;
    color: var(--text-secondary);
    line-height: 1.65;
  }
}

.admin-overview__card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;

  div {
    min-width: 130px;
    padding: 0.7rem 0.8rem;
    border-radius: 8px;
    background: var(--surface-secondary);
  }

  dt {
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
  }

  dd {
    margin: 0.2rem 0 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 800;
  }
}

.admin-overview__action {
  width: fit-content;
  background: var(--interactive-primary);
  color: #fff;
}

@media (max-width: 768px) {
  .admin-overview__grid {
    grid-template-columns: 1fr;
  }

  .admin-overview__health-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-overview__activity-list article {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
