<script setup lang="ts">
import type {
  AdminOverviewResponse,
  AdminOverviewTrendPoint,
  AdminOverviewTrendsPayload,
} from "~/types/admin";

type TrendMetricDefinition = {
  key: string
  label: string
  paths: string[]
};

const { t } = useI18n();
const { getLocalePath } = useAppLocale();
const { getOverview, getOverviewTrends } = useAdminConsole();

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const loading = ref(false);
const loadError = ref<string | null>(null);
const overview = ref<AdminOverviewResponse | null>(null);
const selectedTrendDays = ref(7);
const trendPoints = ref<AdminOverviewTrendPoint[]>([]);
const trendLoadError = ref(false);
const trendDayOptions = [7, 30];

const metricValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString();
  return loading.value ? "..." : "-";
};

const trendMetricDefinitions = computed<TrendMetricDefinition[]>(() => [
  {
    key: "users",
    label: t("adminOverview.trends.metrics.users"),
    paths: ["users", "new_users", "registrations", "users.new", "users.total"],
  },
  {
    key: "posts",
    label: t("adminOverview.trends.metrics.posts"),
    paths: ["posts", "new_posts", "content.posts", "content.posts.total"],
  },
  {
    key: "comments",
    label: t("adminOverview.trends.metrics.comments"),
    paths: ["comments", "new_comments", "content.comments", "content.comments.total"],
  },
  {
    key: "files",
    label: t("adminOverview.trends.metrics.files"),
    paths: ["files", "new_files", "content.files", "content.files.total"],
  },
  {
    key: "feedbacks",
    label: t("adminOverview.trends.metrics.feedbacks"),
    paths: ["feedbacks", "feedback", "new_feedbacks"],
  },
  {
    key: "identity_requests",
    label: t("adminOverview.trends.metrics.identityRequests"),
    paths: ["identity_requests", "identity", "new_identity_requests"],
  },
  {
    key: "course_records",
    label: t("adminOverview.trends.metrics.courseRecords"),
    paths: ["course_records", "academic_map.course_records", "new_course_records"],
  },
  {
    key: "projects",
    label: t("adminOverview.trends.metrics.projects"),
    paths: ["projects", "matching.projects", "new_projects"],
  },
]);

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
    value: metricValue(overview.value?.metrics.users.active),
  },
]);

const cards = computed(() => [
  {
    title: t("adminOverview.cards.users.title"),
    description: t("adminOverview.cards.users.description"),
    action: t("adminOverview.cards.users.action"),
    to: getLocalePath("/admin/users"),
    stats: [
      { label: t("adminOverview.metrics.usersTotal"), value: metricValue(overview.value?.metrics.users.total) },
      { label: t("adminOverview.metrics.adminUsers"), value: metricValue(overview.value?.metrics.users.admins) },
    ],
  },
  {
    title: t("adminOverview.cards.content.title"),
    description: t("adminOverview.cards.content.description"),
    action: t("adminOverview.cards.content.action"),
    to: getLocalePath("/admin/content"),
    stats: [
      { label: t("adminOverview.metrics.postsTotal"), value: metricValue(overview.value?.metrics.content.posts.total) },
      { label: t("adminOverview.metrics.guguMessages"), value: metricValue(overview.value?.metrics.content.gugu.messages) },
      { label: t("adminOverview.metrics.filesTotal"), value: metricValue(overview.value?.metrics.content.files.total) },
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
      { label: t("adminOverview.metrics.coursesTotal"), value: metricValue(overview.value?.metrics.courses.courses) },
      { label: t("adminOverview.metrics.projectsTotal"), value: metricValue(overview.value?.metrics.matching.projects) },
      { label: t("adminOverview.metrics.validTokens"), value: metricValue(overview.value?.metrics.operations.valid_sts_tokens) },
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
    {
      key: "courses",
      label: t("adminOverview.healthRows.courses"),
      value: metricValue(metrics.courses.offerings),
      caption: t("adminOverview.healthRows.courseCaption"),
    },
    {
      key: "academic",
      label: t("adminOverview.healthRows.academicMap"),
      value: metricValue(metrics.academic_map.records_needing_review),
      caption: t("adminOverview.healthRows.academicCaption"),
    },
    {
      key: "matching",
      label: t("adminOverview.healthRows.matching"),
      value: metricValue(metrics.matching.active_projects),
      caption: t("adminOverview.healthRows.matchingCaption"),
    },
    {
      key: "contest",
      label: t("adminOverview.healthRows.contest"),
      value: metricValue(metrics.contest.submissions),
      caption: t("adminOverview.healthRows.contestCaption"),
    },
    {
      key: "operations",
      label: t("adminOverview.healthRows.operations"),
      value: metricValue(metrics.operations.valid_sts_tokens),
      caption: t("adminOverview.healthRows.operationsCaption"),
    },
  ];
});

function readNumberPath(source: unknown, path: string) {
  let current: unknown = source;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return null;
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === "number" && Number.isFinite(current)) return current;
  if (typeof current === "string" && current.trim()) {
    const parsed = Number(current);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getTrendValue(point: AdminOverviewTrendPoint, paths: string[]) {
  for (const path of paths) {
    const value = readNumberPath(point, path);
    if (value !== null) return value;
  }
  return 0;
}

function normalizeTrendPayload(payload?: AdminOverviewTrendsPayload | AdminOverviewTrendPoint[] | null) {
  if (!payload) return [];
  const points = Array.isArray(payload) ? payload : (payload.items || payload.trends);
  return Array.isArray(points)
    ? points.filter((point): point is AdminOverviewTrendPoint => Boolean(point?.date))
    : [];
}

const trendTotals = computed(() => trendMetricDefinitions.value.map((metric) => {
  const total = trendPoints.value.reduce((sum, point) => sum + getTrendValue(point, metric.paths), 0);
  return {
    key: metric.key,
    label: metric.label,
    total,
    value: trendPoints.value.length ? total.toLocaleString() : (loading.value ? "..." : "-"),
  };
}));

const trendChartRows = computed(() => trendMetricDefinitions.value.map((metric) => {
  const points = trendPoints.value.map((point) => ({
    date: point.date,
    value: getTrendValue(point, metric.paths),
  }));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return {
    key: metric.key,
    label: metric.label,
    total,
    max: Math.max(1, ...points.map((point) => point.value)),
    points,
  };
}));

const trendChartCategories = computed(() => trendPoints.value.map((point) => formatTrendDate(point.date)));

const trendChartSeries = computed(() => trendChartRows.value.map((row) => ({
  name: row.label,
  data: row.points.map((point) => point.value),
})));

const hasTrendPoints = computed(() => trendPoints.value.length > 0);

const trendEmptyMessage = computed(() => trendLoadError.value
  ? t("adminOverview.trends.loadPartial")
  : t("adminOverview.trends.emptyDescription")
);

const formatTrendDate = (date: string) => {
  const parts = date.split("-");
  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : date;
};

const loadOverview = async () => {
  loading.value = true;
  loadError.value = null;
  trendLoadError.value = false;

  try {
    const data = await getOverview({ days: selectedTrendDays.value });
    overview.value = data;

    const inlineTrends = normalizeTrendPayload(data.trends);
    if (inlineTrends.length) {
      trendPoints.value = inlineTrends;
    } else {
      try {
        const trendPayload = await getOverviewTrends({ days: selectedTrendDays.value });
        trendPoints.value = normalizeTrendPayload(trendPayload);
        trendLoadError.value = !trendPoints.value.length;
      } catch {
        trendPoints.value = [];
        trendLoadError.value = true;
      }
    }
  } catch {
    loadError.value = t("adminOverview.status.loadFailed");
    trendPoints.value = [];
    trendLoadError.value = true;
  } finally {
    loading.value = false;
  }
};

const setTrendDays = (days: number) => {
  if (selectedTrendDays.value === days || loading.value) return;
  selectedTrendDays.value = days;
  loadOverview();
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

    <section class="admin-overview__trends" :aria-label="t('adminOverview.trends.title')">
      <div class="admin-overview__section-head">
        <div>
          <h2>{{ t("adminOverview.trends.title") }}</h2>
          <p>{{ t("adminOverview.trends.description", { days: selectedTrendDays }) }}</p>
        </div>
        <div class="admin-overview__day-switcher" :aria-label="t('adminOverview.trends.daySwitcher')">
          <button
            v-for="days in trendDayOptions"
            :key="days"
            type="button"
            :class="{ 'admin-overview__day-button--active': selectedTrendDays === days }"
            :disabled="loading"
            @click="setTrendDays(days)"
          >
            {{ t("adminOverview.trends.days", { days }) }}
          </button>
        </div>
      </div>

      <div class="admin-overview__trend-totals">
        <article v-for="metric in trendTotals" :key="metric.key">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small>{{ t("adminOverview.trends.incrementLabel", { days: selectedTrendDays }) }}</small>
        </article>
      </div>

      <AdminStateBlock
        v-if="!hasTrendPoints"
        :title="t('adminOverview.trends.emptyTitle')"
        :message="trendEmptyMessage"
      />

      <AdminAreaChart
        v-else
        :title="t('adminOverview.trends.chartTitle')"
        :description="t('adminOverview.trends.chartDescription')"
        :categories="trendChartCategories"
        :series="trendChartSeries"
      />
    </section>

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
          <small>{{ row.caption }}</small>
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
.admin-overview__action,
.admin-overview__day-switcher button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
}

.admin-overview__refresh,
.admin-overview__day-switcher button {
  border: 0;
  background: var(--btn-primary-bg);
  color: #fff;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

.admin-overview__day-switcher button {
  border: 1px solid var(--border-primary);
  background: var(--surface-primary);
  color: var(--text-secondary);

  &.admin-overview__day-button--active {
    border-color: var(--interactive-primary);
    background: var(--btn-primary-bg);
    color: var(--text-inverse);
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

.admin-overview__trends {
  display: grid;
  gap: 1rem;
  padding: 1.15rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.admin-overview__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  p {
    margin: 0.35rem 0 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }
}

.admin-overview__day-switcher,
.admin-overview__trend-totals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.admin-overview__trend-totals {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  article {
    padding: 0.85rem;
    border-radius: 8px;
    background: var(--surface-secondary);
  }

  span,
  small {
    display: block;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
  }

  strong {
    display: block;
    margin: 0.25rem 0;
    color: var(--text-primary);
    font-size: 1.35rem;
    line-height: 1;
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

  small {
    display: block;
    margin-top: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.78rem;
    line-height: 1.4;
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
  background: var(--btn-primary-bg);
  color: #fff;
}

@media (max-width: 768px) {
  .admin-overview__section-head {
    flex-direction: column;
  }

  .admin-overview__trend-totals,
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
