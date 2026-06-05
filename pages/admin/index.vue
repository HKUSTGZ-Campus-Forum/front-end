<script setup lang="ts">
const { t } = useI18n();
const { getLocalePath } = useAppLocale();
const {
  listFeedbacks,
  listPendingFeedback,
  listPendingMergeRequests,
} = useFeedbackAdmin();
const { fetchAdminIdentityRequests } = useIdentity();

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const loading = ref(false);
const loadError = ref<string | null>(null);
const pendingFeedback = ref<number | null>(null);
const pendingMerge = ref<number | null>(null);
const pendingIdentity = ref<number | null>(null);
const publishedFeedback = ref<number | null>(null);

const metricValue = (value: number | null) => {
  if (value !== null) return value;
  return loading.value ? "..." : "-";
};

const metricItems = computed(() => [
  {
    key: "pending-feedback",
    label: t("adminOverview.metrics.pendingFeedback"),
    value: metricValue(pendingFeedback.value),
  },
  {
    key: "pending-merge",
    label: t("adminOverview.metrics.pendingMerge"),
    value: metricValue(pendingMerge.value),
  },
  {
    key: "pending-identity",
    label: t("adminOverview.metrics.pendingIdentity"),
    value: metricValue(pendingIdentity.value),
  },
  {
    key: "published-feedback",
    label: t("adminOverview.metrics.feedbackTotal"),
    value: metricValue(publishedFeedback.value),
  },
]);

const cards = computed(() => [
  {
    title: t("adminOverview.cards.feedback.title"),
    description: t("adminOverview.cards.feedback.description"),
    action: t("adminOverview.cards.feedback.action"),
    to: getLocalePath("/admin/feedback"),
    stats: [
      {
        label: t("adminOverview.metrics.pendingFeedback"),
        value: metricValue(pendingFeedback.value),
      },
      {
        label: t("adminOverview.metrics.pendingMerge"),
        value: metricValue(pendingMerge.value),
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
        value: metricValue(pendingIdentity.value),
      },
    ],
  },
]);

const loadOverview = async () => {
  loading.value = true;
  loadError.value = null;

  const [
    pendingFeedbackResult,
    pendingMergeResult,
    pendingIdentityResult,
    publishedFeedbackResult,
  ] = await Promise.allSettled([
    listPendingFeedback(),
    listPendingMergeRequests(),
    fetchAdminIdentityRequests({ status: "pending", per_page: 1 }),
    listFeedbacks({ status: "published", per_page: 1 }),
  ]);

  if (pendingFeedbackResult.status === "fulfilled") {
    pendingFeedback.value = pendingFeedbackResult.value.length;
  }
  if (pendingMergeResult.status === "fulfilled") {
    pendingMerge.value = pendingMergeResult.value.length;
  }
  if (pendingIdentityResult.status === "fulfilled") {
    pendingIdentity.value =
      pendingIdentityResult.value.counts?.pending ?? pendingIdentityResult.value.total;
  }
  if (publishedFeedbackResult.status === "fulfilled") {
    publishedFeedback.value =
      publishedFeedbackResult.value.counts?.published ?? publishedFeedbackResult.value.total;
  }

  const failed = [
    pendingFeedbackResult,
    pendingMergeResult,
    pendingIdentityResult,
    publishedFeedbackResult,
  ].some((result) => result.status === "rejected");

  if (failed) {
    loadError.value = t("adminOverview.status.loadFailed");
  }

  loading.value = false;
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

.admin-overview__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
}
</style>
