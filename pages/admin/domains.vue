<script setup lang="ts">
import type { AdminOverviewResponse } from "~/types/admin";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
const { getOverview } = useAdminConsole();

const overview = ref<AdminOverviewResponse | null>(null);
const loading = ref(true);
const error = ref("");

const metricItems = computed(() => [
  { key: "courses", label: t("adminDomains.metrics.courses"), value: overview.value?.metrics.courses.courses ?? 0 },
  { key: "offerings", label: t("adminDomains.metrics.offerings"), value: overview.value?.metrics.courses.offerings ?? 0 },
  { key: "projects", label: t("adminDomains.metrics.projects"), value: overview.value?.metrics.matching.projects ?? 0 },
  { key: "submissions", label: t("adminDomains.metrics.submissions"), value: overview.value?.metrics.contest.submissions ?? 0 },
]);

const sections = computed(() => {
  const metrics = overview.value?.metrics;
  if (!metrics) return [];
  return [
    {
      key: "courses",
      title: t("adminDomains.sections.courses"),
      description: t("adminDomains.descriptions.courses"),
      rows: [
        [t("adminDomains.labels.activeCourses"), metrics.courses.active_courses],
        [t("adminDomains.labels.offerings"), metrics.courses.offerings],
        [t("adminDomains.labels.sections"), metrics.courses.sections],
        [t("adminDomains.labels.meetings"), metrics.courses.meetings],
      ],
    },
    {
      key: "academic",
      title: t("adminDomains.sections.academicMap"),
      description: t("adminDomains.descriptions.academicMap"),
      rows: [
        [t("adminDomains.labels.programs"), metrics.academic_map.programs],
        [t("adminDomains.labels.requirementGroups"), metrics.academic_map.requirement_groups],
        [t("adminDomains.labels.academicProfiles"), metrics.academic_map.user_profiles],
        [t("adminDomains.labels.recordsNeedingReview"), metrics.academic_map.records_needing_review],
      ],
    },
    {
      key: "matching",
      title: t("adminDomains.sections.matching"),
      description: t("adminDomains.descriptions.matching"),
      rows: [
        [t("adminDomains.labels.projects"), metrics.matching.projects],
        [t("adminDomains.labels.activeProjects"), metrics.matching.active_projects],
        [t("adminDomains.labels.profiles"), metrics.matching.profiles],
        [t("adminDomains.labels.activeProfiles"), metrics.matching.active_profiles],
      ],
    },
    {
      key: "contest",
      title: t("adminDomains.sections.contest"),
      description: t("adminDomains.descriptions.contest"),
      rows: [
        [t("adminDomains.labels.contests"), metrics.contest.contests],
        [t("adminDomains.labels.activeContests"), metrics.contest.active_contests],
        [t("adminDomains.labels.organizers"), metrics.contest.organizers],
        [t("adminDomains.labels.submissions"), metrics.contest.submissions],
      ],
    },
    {
      key: "operations",
      title: t("adminDomains.sections.operations"),
      description: t("adminDomains.descriptions.operations"),
      rows: [
        [t("adminDomains.labels.files"), metrics.operations.files],
        [t("adminDomains.labels.validStsTokens"), metrics.operations.valid_sts_tokens],
        [t("adminDomains.labels.oauthClients"), metrics.operations.oauth_clients],
        [t("adminDomains.labels.pushSubscriptions"), metrics.operations.push_subscriptions],
      ],
    },
  ];
});

async function loadOverview() {
  loading.value = true;
  error.value = "";
  try {
    overview.value = await getOverview();
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("adminConsole.errors.loadOverview");
  } finally {
    loading.value = false;
  }
}

onMounted(loadOverview);
</script>

<template>
  <section class="admin-domains">
    <AdminPageHeader :eyebrow="t('nav.admin')" :title="t('adminDomains.title')" :description="t('adminDomains.description')">
      <template #actions>
        <button class="admin-domains__primary" type="button" :disabled="loading" @click="loadOverview">
          {{ loading ? t("adminDomains.actions.refreshing") : t("adminDomains.actions.refresh") }}
        </button>
      </template>
    </AdminPageHeader>

    <AdminMetricStrip :items="metricItems" />
    <AdminStateBlock v-if="loading && !overview" :title="t('common.loading')" />
    <AdminStateBlock v-else-if="error" tone="error" :title="t('adminDomains.errors.title')" :message="error" />

    <div v-else class="admin-domains__grid">
      <article v-for="section in sections" :key="section.key" class="admin-domains__card">
        <div>
          <h2>{{ section.title }}</h2>
          <p>{{ section.description }}</p>
        </div>
        <dl>
          <div v-for="row in section.rows" :key="row[0]">
            <dt>{{ row[0] }}</dt>
            <dd>{{ row[1] }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.admin-domains {
  display: grid;
  gap: 1rem;
}

.admin-domains__primary {
  min-height: 40px;
  padding: 0.65rem 1rem;
  border: 0;
  border-radius: 999px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

.admin-domains__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.admin-domains__card {
  display: grid;
  gap: 1rem;
  padding: 1.15rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.08rem;
  }

  p {
    margin: 0.5rem 0 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin: 0;
  }

  dt {
    color: var(--text-secondary);
    font-size: 0.84rem;
  }

  dd {
    margin: 0.25rem 0 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 800;
  }
}

@media (max-width: 820px) {
  .admin-domains__grid,
  .admin-domains__card dl {
    grid-template-columns: 1fr;
  }
}
</style>

