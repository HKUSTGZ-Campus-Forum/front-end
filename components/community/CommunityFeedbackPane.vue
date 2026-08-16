<script setup lang="ts">
import type { Feedback } from "~/types/feedback";

type FeedbackFilter = "public" | "mine";

const { isLoggedIn } = useAuth();
const { getLocalePath } = useAppLocale();
const { listFeedback, listMyFeedback } = useFeedback();
const { t } = useI18n();

const feedbacks = ref<Feedback[]>([]);
const myFeedbacks = ref<Feedback[]>([]);
const loading = ref(true);
const activeFilter = ref<FeedbackFilter>("public");
const publicError = ref("");
const myError = ref("");

const filterOptions = computed(() => {
  const options = [
    {
      value: "public" as FeedbackFilter,
      label: t("feedbackModule.index.filters.public", { count: feedbacks.value.length }),
    },
  ];

  if (isLoggedIn.value) {
    options.push({
      value: "mine" as FeedbackFilter,
      label: t("feedbackModule.index.filters.mine", { count: myFeedbacks.value.length }),
    });
  }

  return options;
});

const currentItems = computed(() =>
  activeFilter.value === "mine" ? myFeedbacks.value : feedbacks.value
);

const currentError = computed(() =>
  activeFilter.value === "mine" ? myError.value : publicError.value
);

function normalizeFeedbackError(err: unknown, fallback: string) {
  if (!(err instanceof Error)) {
    return fallback;
  }

  const message = err.message?.trim();
  if (!message) {
    return fallback;
  }

  const genericNetworkErrors = new Set([
    "Failed to fetch",
    "Load failed",
    "NetworkError when attempting to fetch resource.",
  ]);

  return genericNetworkErrors.has(message) ? fallback : message;
}

const emptyState = computed(() => {
  if (activeFilter.value === "mine") {
    return {
      title: t("feedbackModule.index.emptyStates.mineTitle"),
      hint: t("feedbackModule.index.emptyStates.mineHint"),
    };
  }

  return {
    title: t("feedbackModule.index.emptyStates.public"),
    hint: "",
  };
});

async function fetchPageData() {
  loading.value = true;
  publicError.value = "";
  myError.value = "";

  try {
    feedbacks.value = await listFeedback();
  } catch (err) {
    publicError.value = normalizeFeedbackError(
      err,
      t("feedbackModule.index.errors.publicLoadFailed")
    );
  }

  if (isLoggedIn.value) {
    try {
      myFeedbacks.value = await listMyFeedback();
    } catch (err) {
      myError.value = normalizeFeedbackError(err, t("feedbackModule.index.errors.myLoadFailed"));
    }
  }

  loading.value = false;
}

function handleFilterChange(value: FeedbackFilter) {
  activeFilter.value = value;
}

onMounted(fetchPageData);
</script>

<template>
  <div class="community-feedback-pane">
    <div class="community-feedback-pane__filter-bar">
      <button
        v-for="opt in filterOptions"
        :key="opt.value"
        type="button"
        :class="['community-feedback-pane__filter-btn', { active: activeFilter === opt.value }]"
        @click="handleFilterChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="loading" class="community-feedback-pane__loading">
      <div class="community-feedback-pane__spinner"></div>
      <span>{{ t("common.loading") }}</span>
    </div>

    <div v-else-if="currentError" class="community-feedback-pane__error">
      <p>{{ currentError }}</p>
      <button type="button" class="community-feedback-pane__ghost-btn" @click="fetchPageData">
        {{ t("common.retry") }}
      </button>
    </div>

    <div v-else-if="!currentItems.length" class="community-feedback-pane__empty">
      <div class="community-feedback-pane__empty-card">
        <h2 class="community-feedback-pane__empty-title">{{ emptyState.title }}</h2>
        <p v-if="emptyState.hint" class="community-feedback-pane__empty-hint">{{ emptyState.hint }}</p>
        <NuxtLink
          v-if="activeFilter === 'mine' && isLoggedIn"
          :to="getLocalePath('/feedback/create')"
          class="community-feedback-pane__empty-cta"
        >
          {{ t("feedbackModule.index.cta") }}
        </NuxtLink>
      </div>
    </div>

    <div v-else class="community-feedback-pane__list">
      <FeedbackCard
        v-for="item in currentItems"
        :key="`${activeFilter}-${item.id}`"
        :feedback="item"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.community-feedback-pane__filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.community-feedback-pane__filter-btn {
  padding: 6px 18px;
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  background: var(--surface-primary);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--border-focus);
    color: var(--interactive-primary);
  }

  &.active {
    background: var(--interactive-primary);
    border-color: var(--interactive-primary);
    color: var(--text-inverse);
    font-weight: 600;
  }
}

.community-feedback-pane__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.community-feedback-pane__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--text-secondary);
}

.community-feedback-pane__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.community-feedback-pane__error,
.community-feedback-pane__empty {
  padding: 20px 24px;
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: var(--card-shadow);

  p {
    margin: 0;
  }
}

.community-feedback-pane__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--semantic-error);
}

.community-feedback-pane__ghost-btn {
  padding: 6px 16px;
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
}

.community-feedback-pane__empty-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.community-feedback-pane__empty-hint {
  margin: 8px 0 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.community-feedback-pane__empty-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .community-feedback-pane__error {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
