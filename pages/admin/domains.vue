<script setup lang="ts">
import type {
  AdminContestSummary,
  AdminCoursesSummary,
  AdminMatchingSummary,
  AdminOperationsSummary,
} from "~/types/admin";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
const { getCoursesSummary, getMatchingSummary, getContestSummary, getOperationsSummary } = useAdminConsole();

const coursesSummary = ref<AdminCoursesSummary | null>(null);
const matchingSummary = ref<AdminMatchingSummary | null>(null);
const contestSummary = ref<AdminContestSummary | null>(null);
const operationsSummary = ref<AdminOperationsSummary | null>(null);
const loading = ref(true);
const error = ref("");

const metricItems = computed(() => [
  { key: "courses", label: t("adminDomains.metrics.courses"), value: coursesSummary.value?.courses ?? 0 },
  { key: "offerings", label: t("adminDomains.metrics.offerings"), value: coursesSummary.value?.offerings ?? 0 },
  { key: "projects", label: t("adminDomains.metrics.projects"), value: matchingSummary.value?.projects ?? 0 },
  { key: "submissions", label: t("adminDomains.metrics.submissions"), value: contestSummary.value?.submissions ?? 0 },
]);

const sections = computed(() => {
  const courses = coursesSummary.value;
  const matching = matchingSummary.value;
  const contest = contestSummary.value;
  const operations = operationsSummary.value;
  if (!courses || !matching || !contest || !operations) return [];
  return [
    {
      key: "courses",
      title: t("adminDomains.sections.courses"),
      description: t("adminDomains.descriptions.courses"),
      rows: [
        [t("adminDomains.labels.activeCourses"), courses.active_courses],
        [t("adminDomains.labels.offerings"), courses.offerings],
        [t("adminDomains.labels.sections"), courses.sections],
        [t("adminDomains.labels.meetings"), courses.meetings],
      ],
    },
    {
      key: "matching",
      title: t("adminDomains.sections.matching"),
      description: t("adminDomains.descriptions.matching"),
      rows: [
        [t("adminDomains.labels.projects"), matching.projects],
        [t("adminDomains.labels.activeProjects"), matching.active_projects],
        [t("adminDomains.labels.profiles"), matching.profiles],
        [t("adminDomains.labels.activeProfiles"), matching.active_profiles],
      ],
    },
    {
      key: "contest",
      title: t("adminDomains.sections.contest"),
      description: t("adminDomains.descriptions.contest"),
      rows: [
        [t("adminDomains.labels.contests"), contest.contests],
        [t("adminDomains.labels.activeContests"), contest.active_contests],
        [t("adminDomains.labels.organizers"), contest.organizers],
        [t("adminDomains.labels.submissions"), contest.submissions],
      ],
    },
    {
      key: "operations",
      title: t("adminDomains.sections.operations"),
      description: t("adminDomains.descriptions.operations"),
      rows: [
        [t("adminDomains.labels.files"), operations.files],
        [t("adminDomains.labels.validStsTokens"), operations.valid_sts_tokens],
        [t("adminDomains.labels.oauthClients"), operations.oauth_clients],
        [t("adminDomains.labels.pushSubscriptions"), operations.push_subscriptions],
      ],
    },
  ];
});

async function loadOverview() {
  loading.value = true;
  error.value = "";
  try {
    const [courses, matching, contest, operations] = await Promise.all([
      getCoursesSummary(),
      getMatchingSummary(),
      getContestSummary(),
      getOperationsSummary(),
    ]);
    coursesSummary.value = courses;
    matchingSummary.value = matching;
    contestSummary.value = contest;
    operationsSummary.value = operations;
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("adminConsole.errors.loadDomains");
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
    <AdminStateBlock v-if="loading && !coursesSummary" :title="t('common.loading')" />
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

