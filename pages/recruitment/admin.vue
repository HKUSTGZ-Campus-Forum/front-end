<script setup lang="ts">
import { computed, ref, watch } from "vue";

definePageMeta({ layout: false });

const { t, locale } = useI18n();
const { isLoggedIn, authInitialized } = useAuth();
const { fetchWithAuth } = useApi();
const { availableLocales, getLocalePath, switchToLocale } = useAppLocale();

type RecruitmentFeedback = {
  code: string;
  detail: string;
  points: number;
  score: number;
};

type RecruitmentAttemptRecord = {
  id: number;
  user_id: number | null;
  username: string;
  email: string;
  prompt: string;
  state: "running" | "complete" | "failed";
  success: boolean;
  score: number;
  tool_calls: number;
  feedback: RecruitmentFeedback[];
  agent_message: string;
  duration_ms: number | null;
  model: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

type LeaderboardEntry = {
  rank: number;
  attempt_id: number;
  username: string;
  email: string;
  score: number;
  tool_calls: number;
  duration_ms: number | null;
  completed_at: string | null;
};

type Overview = {
  summary: {
    attempts: number;
    participants: number;
    completed: number;
    perfect_scores: number;
    average_score: number;
  };
  leaderboard: LeaderboardEntry[];
  attempts: RecruitmentAttemptRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
};

const overview = ref<Overview | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const selectedAttempt = ref<RecruitmentAttemptRecord | null>(null);
const currentPage = computed(() => overview.value?.pagination.page ?? 1);
const totalPages = computed(() => overview.value?.pagination.pages ?? 1);

function formatTime(value: string | null) {
  if (!value) return t("recruitment.admin.notAvailable");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("recruitment.admin.notAvailable");
  return new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDuration(value: number | null) {
  if (value === null) return t("recruitment.admin.notAvailable");
  return t("recruitment.admin.durationValue", { seconds: (value / 1000).toFixed(1) });
}

function feedbackTitle(code: string) {
  return t(`recruitment.events.${code}`);
}

async function loadOverview(page = 1) {
  if (!isLoggedIn.value || loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetchWithAuth(
      `/api/recruitment/admin/overview?page=${page}&per_page=50`,
      { cache: "no-store" },
    );
    if (response.status === 403) {
      await navigateTo(getLocalePath("/recruitment"));
      return;
    }
    if (!response.ok) throw new Error("overview");
    const payload = await response.json();
    overview.value = payload?.data ?? null;
    if (
      selectedAttempt.value
      && !overview.value?.attempts.some((attempt) => attempt.id === selectedAttempt.value?.id)
    ) {
      selectedAttempt.value = null;
    }
  } catch {
    errorMessage.value = t("recruitment.admin.loadError");
  } finally {
    loading.value = false;
  }
}

watch([authInitialized, isLoggedIn], ([initialized, loggedIn]) => {
  if (!initialized) return;
  if (!loggedIn) {
    navigateTo({
      path: getLocalePath("/login"),
      query: { redirect: getLocalePath("/recruitment/admin") },
    });
    return;
  }
  if (!overview.value) loadOverview();
}, { immediate: true });

useHead(() => ({
  title: t("recruitment.admin.metaTitle"),
  meta: [
    { name: "description", content: t("recruitment.admin.metaDescription") },
    { name: "robots", content: "noindex, nofollow" },
  ],
}));
</script>

<template>
  <div class="recruitment-admin-page">
    <header class="admin-header">
      <NuxtLink class="admin-brand" :to="getLocalePath('/recruitment')">
        <span><img src="/recruitment/node-logo.jpg" alt="" /></span>
        <strong>{{ t("recruitment.brand.name") }}</strong>
        <small>{{ t("recruitment.admin.title") }}</small>
      </NuxtLink>
      <div class="admin-header__actions">
        <button type="button" :disabled="loading" @click="loadOverview(currentPage)">
          <Icon name="lucide:refresh-cw" aria-hidden="true" />
          {{ t("recruitment.admin.refresh") }}
        </button>
        <div class="admin-locales" :aria-label="t('recruitment.locale')">
          <button
            v-for="item in availableLocales"
            :key="item.code"
            type="button"
            :class="{ active: locale === item.code }"
            @click="switchToLocale(item.code)"
          >
            {{ t(`common.locale.${item.code}`) }}
          </button>
        </div>
      </div>
    </header>

    <main class="admin-main">
      <section class="admin-intro">
        <div>
          <p>{{ t("recruitment.admin.eyebrow") }}</p>
          <h1>{{ t("recruitment.admin.title") }}</h1>
          <span>{{ t("recruitment.admin.description") }}</span>
        </div>
        <NuxtLink :to="getLocalePath('/recruitment')">
          <Icon name="lucide:arrow-left" aria-hidden="true" />
          {{ t("recruitment.admin.back") }}
        </NuxtLink>
      </section>

      <div v-if="loading && !overview" class="admin-state" role="status">
        <Icon name="lucide:loader-circle" aria-hidden="true" />
        {{ t("recruitment.admin.loading") }}
      </div>
      <div v-else-if="errorMessage && !overview" class="admin-state is-error" role="alert">
        <Icon name="lucide:circle-alert" aria-hidden="true" />
        <span>{{ errorMessage }}</span>
        <button type="button" @click="loadOverview()">{{ t("common.retry") }}</button>
      </div>

      <template v-else-if="overview">
        <section class="summary-grid" :aria-label="t('recruitment.admin.summaryLabel')">
          <article>
            <span>{{ t("recruitment.admin.summary.participants") }}</span>
            <strong>{{ overview.summary.participants }}</strong>
          </article>
          <article>
            <span>{{ t("recruitment.admin.summary.attempts") }}</span>
            <strong>{{ overview.summary.attempts }}</strong>
          </article>
          <article>
            <span>{{ t("recruitment.admin.summary.average") }}</span>
            <strong>{{ overview.summary.average_score }}</strong>
          </article>
          <article>
            <span>{{ t("recruitment.admin.summary.perfect") }}</span>
            <strong>{{ overview.summary.perfect_scores }}</strong>
          </article>
        </section>

        <section class="admin-panel leaderboard-panel">
          <div class="panel-heading">
            <div>
              <p>{{ t("recruitment.admin.leaderboard.eyebrow") }}</p>
              <h2>{{ t("recruitment.admin.leaderboard.title") }}</h2>
            </div>
            <span>{{ t("recruitment.admin.leaderboard.note") }}</span>
          </div>
          <div v-if="overview.leaderboard.length" class="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ t("recruitment.admin.leaderboard.rank") }}</th>
                  <th>{{ t("recruitment.admin.account") }}</th>
                  <th>{{ t("recruitment.admin.score") }}</th>
                  <th>{{ t("recruitment.admin.calls") }}</th>
                  <th>{{ t("recruitment.admin.duration") }}</th>
                  <th>{{ t("recruitment.admin.time") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in overview.leaderboard" :key="entry.attempt_id">
                  <td><strong class="rank">{{ entry.rank }}</strong></td>
                  <td><strong>{{ entry.username }}</strong><small>{{ entry.email }}</small></td>
                  <td><strong class="score">{{ entry.score }}</strong></td>
                  <td>{{ entry.tool_calls }}</td>
                  <td>{{ formatDuration(entry.duration_ms) }}</td>
                  <td>{{ formatTime(entry.completed_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-copy">{{ t("recruitment.admin.leaderboard.empty") }}</p>
        </section>

        <section class="admin-panel attempts-panel">
          <div class="panel-heading">
            <div>
              <p>{{ t("recruitment.admin.attempts.eyebrow") }}</p>
              <h2>{{ t("recruitment.admin.attempts.title") }}</h2>
            </div>
            <span>{{ t("recruitment.admin.attempts.count", { count: overview.pagination.total }) }}</span>
          </div>

          <div v-if="overview.attempts.length" class="attempt-list">
            <article
              v-for="attempt in overview.attempts"
              :key="attempt.id"
              :class="['attempt-card', { expanded: selectedAttempt?.id === attempt.id }]"
            >
              <button type="button" class="attempt-card__summary" @click="selectedAttempt = selectedAttempt?.id === attempt.id ? null : attempt">
                <span class="attempt-card__score">{{ attempt.score }}</span>
                <span class="attempt-card__identity">
                  <strong>{{ attempt.username }}</strong>
                  <small>{{ attempt.email }}</small>
                </span>
                <span class="attempt-card__prompt">{{ attempt.prompt }}</span>
                <span class="attempt-card__meta">
                  {{ formatTime(attempt.started_at) }}
                  <Icon :name="selectedAttempt?.id === attempt.id ? 'lucide:chevron-up' : 'lucide:chevron-down'" aria-hidden="true" />
                </span>
              </button>

              <div v-if="selectedAttempt?.id === attempt.id" class="attempt-card__details">
                <dl>
                  <div><dt>{{ t("recruitment.admin.status") }}</dt><dd>{{ t(`recruitment.admin.states.${attempt.state}`) }}</dd></div>
                  <div><dt>{{ t("recruitment.admin.calls") }}</dt><dd>{{ attempt.tool_calls }}</dd></div>
                  <div><dt>{{ t("recruitment.admin.duration") }}</dt><dd>{{ formatDuration(attempt.duration_ms) }}</dd></div>
                  <div><dt>{{ t("recruitment.admin.model") }}</dt><dd>{{ attempt.model || t("recruitment.admin.notAvailable") }}</dd></div>
                </dl>
                <section>
                  <h3>{{ t("recruitment.admin.prompt") }}</h3>
                  <p class="full-prompt">{{ attempt.prompt }}</p>
                </section>
                <section>
                  <h3>{{ t("recruitment.admin.feedback") }}</h3>
                  <ol v-if="attempt.feedback.length" class="feedback-list">
                    <li v-for="(item, index) in attempt.feedback" :key="`${attempt.id}-${item.code}-${index}`">
                      <Icon :name="item.points > 0 ? 'lucide:circle-check' : 'lucide:terminal'" aria-hidden="true" />
                      <span><strong>{{ feedbackTitle(item.code) }}</strong><small>{{ item.detail }}</small></span>
                      <b v-if="item.points">+{{ item.points }}</b>
                    </li>
                  </ol>
                  <p v-else class="empty-copy">{{ t("recruitment.admin.noFeedback") }}</p>
                  <p v-if="attempt.agent_message" class="agent-message">{{ attempt.agent_message }}</p>
                </section>
              </div>
            </article>
          </div>
          <p v-else class="empty-copy">{{ t("recruitment.admin.attempts.empty") }}</p>

          <nav v-if="totalPages > 1" class="pagination" :aria-label="t('recruitment.admin.pagination')">
            <button type="button" :disabled="currentPage <= 1 || loading" @click="loadOverview(currentPage - 1)">
              <Icon name="lucide:arrow-left" aria-hidden="true" />{{ t("common.previous") }}
            </button>
            <span>{{ t("recruitment.admin.page", { page: currentPage, pages: totalPages }) }}</span>
            <button type="button" :disabled="currentPage >= totalPages || loading" @click="loadOverview(currentPage + 1)">
              {{ t("common.next") }}<Icon name="lucide:arrow-right" aria-hidden="true" />
            </button>
          </nav>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped lang="scss">
.recruitment-admin-page {
  min-height: 100vh;
  color: var(--text-primary);
  background:
    radial-gradient(circle at 92% 4%, color-mix(in srgb, var(--interactive-primary) 14%, transparent), transparent 30rem),
    var(--bg-secondary);
}

.admin-header,
.admin-main {
  width: min(1440px, calc(100% - 64px));
  margin-inline: auto;
}

.admin-header {
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid var(--border-secondary);
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--text-primary);
  text-decoration: none;

  > span { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 14px; background: var(--surface-primary); border: var(--card-border); overflow: hidden; }
  img { width: 38px; height: 38px; object-fit: contain; }
  strong { letter-spacing: 0.09em; }
  small { padding-left: 12px; border-left: 1px solid var(--border-primary); color: var(--text-secondary); font-weight: 750; }
}

.admin-header__actions { display: flex; align-items: center; gap: 10px; }
.admin-header__actions > button,
.admin-locales {
  min-height: 40px;
  border: 1px solid var(--border-primary);
  border-radius: 13px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-small);
}
.admin-header__actions > button { display: flex; align-items: center; gap: 8px; padding: 8px 13px; color: var(--text-primary); font-weight: 750; cursor: pointer; }
.admin-header__actions > button:disabled { opacity: var(--opacity-medium); cursor: wait; }
.admin-locales { display: flex; padding: 3px; border-radius: 999px; }
.admin-locales button { min-width: 45px; border: 0; border-radius: 999px; color: var(--text-secondary); background: transparent; font-weight: 750; cursor: pointer; }
.admin-locales button.active { color: var(--text-inverse); background: var(--interactive-active); }

.admin-main { padding: 54px 0 80px; }
.admin-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; }
.admin-intro p,
.panel-heading p { margin: 0 0 10px; color: var(--interactive-active-text); font-size: 0.72rem; font-weight: 850; letter-spacing: 0.13em; text-transform: uppercase; }
.admin-intro h1 { margin: 0; font-size: clamp(2.8rem, 5.5vw, 5.5rem); line-height: 0.98; letter-spacing: -0.06em; }
.admin-intro > div > span { display: block; max-width: 720px; margin-top: 18px; color: var(--text-secondary); line-height: 1.7; }
.admin-intro > a { display: inline-flex; align-items: center; gap: 8px; padding: 11px 14px; border: 1px solid var(--border-primary); border-radius: 14px; color: var(--text-primary); background: var(--surface-primary); font-weight: 750; text-decoration: none; }

.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 44px; }
.summary-grid article { min-height: 138px; display: flex; flex-direction: column; justify-content: space-between; padding: 22px; border: 1px solid var(--border-primary); border-radius: 22px; background: var(--surface-primary); box-shadow: var(--shadow-small); }
.summary-grid span { color: var(--text-secondary); font-size: 0.82rem; font-weight: 750; }
.summary-grid strong { color: var(--interactive-active-text); font-size: 2.6rem; line-height: 1; font-variant-numeric: tabular-nums; }

.admin-panel { margin-top: 22px; padding: 26px; border: 1px solid var(--border-primary); border-radius: 26px; background: var(--surface-primary); box-shadow: var(--shadow-medium); }
.panel-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border-secondary); }
.panel-heading h2 { margin: 0; font-size: 1.5rem; letter-spacing: -0.025em; }
.panel-heading > span { max-width: 430px; color: var(--text-muted); font-size: 0.78rem; line-height: 1.5; text-align: right; }

.admin-table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { padding: 16px 12px 11px; color: var(--text-muted); font-size: 0.7rem; letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
td { padding: 14px 12px; border-top: 1px solid var(--border-secondary); color: var(--text-secondary); font-size: 0.82rem; }
td strong:not(.rank, .score) { display: block; color: var(--text-primary); }
td small { display: block; margin-top: 4px; color: var(--text-muted); }
.rank { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 10px; color: var(--interactive-active-text); background: color-mix(in srgb, var(--interactive-primary) 12%, transparent); }
.score { color: var(--interactive-active-text); font-size: 1.25rem; font-variant-numeric: tabular-nums; }

.attempt-list { display: grid; gap: 11px; margin-top: 18px; }
.attempt-card { border: 1px solid var(--border-secondary); border-radius: 18px; background: var(--surface-secondary); overflow: hidden; }
.attempt-card.expanded { border-color: var(--border-focus); }
.attempt-card__summary { width: 100%; display: grid; grid-template-columns: 56px minmax(160px, 0.55fr) minmax(260px, 1.2fr) auto; align-items: center; gap: 18px; padding: 16px 18px; border: 0; color: var(--text-primary); background: transparent; text-align: left; cursor: pointer; }
.attempt-card__score { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 15px; color: var(--text-inverse); background: var(--interactive-active); font-size: 1.15rem; font-weight: 850; font-variant-numeric: tabular-nums; }
.attempt-card__identity { min-width: 0; }
.attempt-card__identity strong,
.attempt-card__identity small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attempt-card__identity small { margin-top: 4px; color: var(--text-muted); font-size: 0.72rem; }
.attempt-card__prompt { overflow: hidden; color: var(--text-secondary); font-size: 0.84rem; line-height: 1.55; text-overflow: ellipsis; white-space: nowrap; }
.attempt-card__meta { display: flex; align-items: center; justify-content: flex-end; gap: 9px; color: var(--text-muted); font-size: 0.72rem; }
.attempt-card__details { padding: 20px; border-top: 1px solid var(--border-secondary); background: var(--surface-primary); }
.attempt-card__details dl { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0; }
.attempt-card__details dl div { padding: 12px; border-radius: 12px; background: var(--surface-secondary); }
.attempt-card__details dt { color: var(--text-muted); font-size: 0.68rem; font-weight: 750; }
.attempt-card__details dd { margin: 6px 0 0; color: var(--text-primary); font-size: 0.8rem; font-weight: 750; overflow-wrap: anywhere; }
.attempt-card__details section { margin-top: 20px; }
.attempt-card__details h3 { margin: 0 0 9px; font-size: 0.78rem; }
.full-prompt,
.agent-message { margin: 0; padding: 14px 16px; border-radius: 13px; color: var(--text-primary); background: var(--surface-secondary); font-size: 0.86rem; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.agent-message { margin-top: 10px; color: var(--text-secondary); }
.feedback-list { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
.feedback-list li { display: grid; grid-template-columns: 20px 1fr auto; align-items: center; gap: 10px; padding: 11px 13px; border: 1px solid var(--border-secondary); border-radius: 12px; }
.feedback-list svg { color: var(--interactive-primary); }
.feedback-list span strong,
.feedback-list span small { display: block; }
.feedback-list span strong { font-size: 0.78rem; }
.feedback-list span small { margin-top: 3px; color: var(--text-muted); font-size: 0.7rem; }
.feedback-list b { color: var(--semantic-success); font-size: 0.75rem; }
.empty-copy { margin: 20px 0 0; color: var(--text-muted); font-size: 0.82rem; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 22px; }
.pagination button { display: flex; align-items: center; gap: 7px; padding: 9px 12px; border: 1px solid var(--border-primary); border-radius: 12px; color: var(--text-primary); background: var(--surface-primary); font-weight: 750; cursor: pointer; }
.pagination button:disabled { opacity: var(--opacity-low); cursor: not-allowed; }
.pagination span { color: var(--text-muted); font-size: 0.76rem; }

.admin-state { min-height: 220px; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 42px; border: 1px solid var(--border-primary); border-radius: 24px; color: var(--text-secondary); background: var(--surface-primary); }
.admin-state > svg { animation: admin-spin 1s linear infinite; }
.admin-state.is-error > svg { color: var(--semantic-error); animation: none; }
.admin-state button { border: 0; color: var(--interactive-active-text); background: transparent; font-weight: 800; cursor: pointer; }
@keyframes admin-spin { to { transform: rotate(360deg); } }

@media (max-width: 960px) {
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .attempt-card__summary { grid-template-columns: 56px 1fr auto; }
  .attempt-card__prompt { grid-column: 2 / -1; white-space: normal; }
  .attempt-card__details dl { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 680px) {
  .admin-header,
  .admin-main { width: min(100% - 28px, 1440px); }
  .admin-header { min-height: 76px; }
  .admin-brand small { display: none; }
  .admin-header__actions > button { width: 40px; justify-content: center; padding: 0; font-size: 0; }
  .admin-intro { align-items: flex-start; flex-direction: column; }
  .admin-intro > a { order: -1; }
  .admin-main { padding-top: 32px; }
  .summary-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .summary-grid article { min-height: 112px; padding: 17px; }
  .summary-grid strong { font-size: 2rem; }
  .admin-panel { padding: 18px 14px; border-radius: 21px; }
  .panel-heading { align-items: flex-start; flex-direction: column; gap: 8px; }
  .panel-heading > span { text-align: left; }
  .attempt-card__summary { grid-template-columns: 48px 1fr auto; gap: 12px; padding: 13px; }
  .attempt-card__score { width: 44px; height: 44px; }
  .attempt-card__meta { font-size: 0; }
  .attempt-card__prompt { grid-column: 1 / -1; }
  .attempt-card__details { padding: 15px; }
  .attempt-card__details dl { grid-template-columns: 1fr 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .admin-state > svg { animation: none; }
}
</style>
