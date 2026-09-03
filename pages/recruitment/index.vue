<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  RECRUITMENT_PROMPT_LIMIT,
  countRecruitmentPromptCharacters,
  isRecruitmentPromptValid,
} from "~/utils/recruitment";

definePageMeta({ layout: false });

const { t, locale } = useI18n();
const { isLoggedIn } = useAuth();
const { fetchPublic, fetchWithAuth } = useApi();
const { availableLocales, getLocalePath, switchToLocale } = useAppLocale();
const RECRUITMENT_DRAFT_KEY = "recruitment_prompt_draft";

type RecruitmentEvent = {
  code: string;
  detail: string;
  points: number;
  score: number;
};

type RecruitmentAttempt = {
  state: "running" | "complete" | "failed";
  success?: boolean;
  score?: number;
  tool_calls?: number;
  events?: RecruitmentEvent[];
  error?: string;
};

const prompt = ref("");
const localError = ref("");
const challengeEnabled = ref(false);
const configLoaded = ref(false);
const statusLoaded = ref(false);
const isRunning = ref(false);
const attempt = ref<RecruitmentAttempt | null>(null);
const promptCount = computed(() => countRecruitmentPromptCharacters(prompt.value));
const promptTooLong = computed(() => promptCount.value > RECRUITMENT_PROMPT_LIMIT);
const canSubmit = computed(() => isRecruitmentPromptValid(prompt.value));
const hasAttempted = computed(() => attempt.value !== null);
const primaryEnabled = computed(() => (
  canSubmit.value
  && configLoaded.value
  && challengeEnabled.value
  && !isRunning.value
  && !hasAttempted.value
));

const consoleState = computed(() => {
  if (isRunning.value || attempt.value?.state === "running") return "running";
  if (attempt.value?.state === "complete" && attempt.value.success) return "complete";
  if (attempt.value) return "failed";
  return "waiting";
});

const consoleStatus = computed(() => t(`recruitment.console.${consoleState.value}`));
const consoleEvents = computed(() => attempt.value?.events ?? []);
const completedStepCount = computed(() => {
  const codes = new Set(consoleEvents.value.map((event) => event.code));
  if (codes.has("flag_accepted")) return 5;
  if (codes.has("record_exposed")) return 4;
  if (codes.has("source_map_found")) return 3;
  if (codes.has("bundle_found")) return 2;
  if (codes.has("surface_mapped")) return 1;
  return 0;
});

const timelineSteps = computed(() => [
  t("recruitment.console.steps.recon"),
  t("recruitment.console.steps.source"),
  t("recruitment.console.steps.trust"),
  t("recruitment.console.steps.access"),
  t("recruitment.console.steps.flag"),
]);

function eventTitle(code: string) {
  const key = `recruitment.events.${code}`;
  return t(key);
}

function localizeApiError(code?: string) {
  if (code === "attempt_already_used") return t("recruitment.errors.used");
  if (code === "challenge_unavailable") return t("recruitment.errors.unavailable");
  if (code === "prompt_too_long") return t("recruitment.composer.tooLong");
  if (code === "prompt_required") return t("recruitment.composer.empty");
  return t("recruitment.errors.run");
}

async function loadConfig() {
  try {
    const response = await fetchPublic("/api/recruitment/config", { cache: "no-store" });
    if (!response.ok) throw new Error("config");
    const payload = await response.json();
    challengeEnabled.value = Boolean(payload?.data?.enabled);
    if (!challengeEnabled.value) localError.value = t("recruitment.errors.unavailable");
  } catch {
    challengeEnabled.value = false;
    localError.value = t("recruitment.errors.load");
  } finally {
    configLoaded.value = true;
  }
}

async function loadStatus() {
  if (!isLoggedIn.value || statusLoaded.value) return;
  try {
    const response = await fetchWithAuth("/api/recruitment/status", { cache: "no-store" });
    if (!response.ok) throw new Error("status");
    const payload = await response.json();
    attempt.value = payload?.data?.attempt ?? null;
    if (attempt.value?.state === "running") {
      localError.value = t("recruitment.errors.runningStale");
    } else if (attempt.value?.state === "failed") {
      localError.value = t("recruitment.errors.run");
    }
  } catch {
    localError.value = t("recruitment.errors.load");
  } finally {
    statusLoaded.value = true;
  }
}

async function handlePrimaryAction() {
  localError.value = "";
  if (!isLoggedIn.value) {
    if (promptTooLong.value) {
      localError.value = t("recruitment.composer.tooLong");
      return;
    }
    if (import.meta.client && prompt.value) {
      sessionStorage.setItem(RECRUITMENT_DRAFT_KEY, prompt.value);
    }
    await navigateTo({
      path: getLocalePath("/login"),
      query: { redirect: getLocalePath("/recruitment") },
    });
    return;
  }

  if (!canSubmit.value) {
    localError.value = promptTooLong.value
      ? t("recruitment.composer.tooLong")
      : t("recruitment.composer.empty");
    return;
  }

  if (!challengeEnabled.value) {
    localError.value = t("recruitment.errors.unavailable");
    return;
  }
  if (hasAttempted.value) {
    localError.value = t("recruitment.errors.used");
    return;
  }

  isRunning.value = true;
  try {
    const response = await fetchWithAuth("/api/recruitment/run", {
      method: "POST",
      body: { prompt: prompt.value } as any,
    });
    const payload = await response.json().catch(() => ({}));
    if (payload?.data?.attempt) attempt.value = payload.data.attempt;
    if (response.ok && payload?.success && import.meta.client) {
      sessionStorage.removeItem(RECRUITMENT_DRAFT_KEY);
    }
    if (!response.ok || !payload?.success) {
      localError.value = localizeApiError(payload?.error);
    }
  } catch {
    localError.value = t("recruitment.errors.run");
  } finally {
    isRunning.value = false;
  }
}

onMounted(() => {
  const savedDraft = sessionStorage.getItem(RECRUITMENT_DRAFT_KEY);
  if (savedDraft) prompt.value = savedDraft;
  loadConfig();
});
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) loadStatus();
}, { immediate: true });

useHead(() => ({
  title: t("recruitment.metaTitle"),
  meta: [
    { name: "description", content: t("recruitment.metaDescription") },
    { name: "robots", content: "noindex, nofollow" },
  ],
}));
</script>

<template>
  <div class="recruitment-page">
    <header class="recruitment-header">
      <div class="recruitment-brand" :aria-label="`${t('recruitment.brand.name')} ${t('recruitment.brand.association')}`">
        <span class="recruitment-brand__mark">
          <img src="/recruitment/node-logo.jpg" alt="" />
        </span>
        <span class="recruitment-brand__copy">
          <strong>{{ t("recruitment.brand.name") }}</strong>
          <span>{{ t("recruitment.brand.association") }}</span>
        </span>
        <span class="recruitment-brand__divider" aria-hidden="true" />
        <img class="recruitment-brand__unikorn" src="/icons/topbar_logo.svg" alt="UniKorn" />
      </div>

      <div class="recruitment-locales" :aria-label="t('recruitment.locale')">
        <button
          v-for="item in availableLocales"
          :key="item.code"
          type="button"
          :class="['recruitment-locales__button', { active: locale === item.code }]"
          @click="switchToLocale(item.code)"
        >
          {{ t(`common.locale.${item.code}`) }}
        </button>
      </div>
    </header>

    <main class="recruitment-main">
      <section class="recruitment-hero" aria-labelledby="recruitment-title">
        <div class="recruitment-copy">
          <p class="recruitment-eyebrow">
            <span aria-hidden="true" />
            {{ t("recruitment.eyebrow") }}
          </p>
          <h1 id="recruitment-title">{{ t("recruitment.title") }}</h1>
          <p class="recruitment-lead">{{ t("recruitment.lead") }}</p>

          <ul class="recruitment-metrics" :aria-label="t('recruitment.metrics.label')">
            <li><Icon name="lucide:message-square-text" aria-hidden="true" />{{ t("recruitment.metrics.prompt") }}</li>
            <li><Icon name="lucide:text-cursor-input" aria-hidden="true" />{{ t("recruitment.metrics.characters") }}</li>
            <li><Icon name="lucide:timer" aria-hidden="true" />{{ t("recruitment.metrics.runtime") }}</li>
          </ul>

          <section class="recruitment-briefing" aria-labelledby="briefing-title">
            <div class="recruitment-section-heading">
              <span class="recruitment-section-heading__icon"><Icon name="lucide:scan-search" aria-hidden="true" /></span>
              <h2 id="briefing-title">{{ t("recruitment.briefing.title") }}</h2>
            </div>
            <dl>
              <div>
                <dt>{{ t("recruitment.briefing.targetLabel") }}</dt>
                <dd>{{ t("recruitment.briefing.target") }}</dd>
              </div>
              <div>
                <dt>{{ t("recruitment.briefing.toolsLabel") }}</dt>
                <dd>{{ t("recruitment.briefing.tools") }}</dd>
              </div>
              <div>
                <dt>{{ t("recruitment.briefing.scopeLabel") }}</dt>
                <dd>{{ t("recruitment.briefing.scope") }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section class="recruitment-console" aria-labelledby="console-title">
          <div class="recruitment-console__topbar">
            <div class="recruitment-console__lights" aria-hidden="true"><span /><span /><span /></div>
            <span class="recruitment-console__label">{{ t("recruitment.console.label") }}</span>
            <span :class="['recruitment-console__status', `is-${consoleState}`]"><i aria-hidden="true" />{{ consoleStatus }}</span>
          </div>

          <div class="recruitment-console__body">
            <div class="recruitment-console__heading">
              <p>{{ t("recruitment.console.title") }}</p>
              <span>{{ consoleStatus }}</span>
            </div>

            <ol class="recruitment-timeline">
              <li
                v-for="(step, index) in timelineSteps"
                :key="step"
                :class="{ complete: index < completedStepCount, active: isRunning && index === completedStepCount }"
              >
                <span class="recruitment-timeline__index">{{ String(index + 1).padStart(2, "0") }}</span>
                <span class="recruitment-timeline__line" aria-hidden="true" />
                <span class="recruitment-timeline__text">{{ step }}</span>
              </li>
            </ol>

            <div v-if="isRunning" class="recruitment-console__empty is-running" role="status">
              <Icon name="lucide:loader-circle" aria-hidden="true" />
              <div>
                <strong>{{ t("recruitment.console.runningTitle") }}</strong>
                <p>{{ t("recruitment.console.runningBody") }}</p>
              </div>
            </div>

            <div v-else-if="attempt" class="recruitment-console__results" aria-live="polite">
              <div class="recruitment-console__score">
                <strong>{{ attempt?.score ?? 0 }}</strong><span>/ 100 · {{ t("recruitment.console.score") }}</span>
                <small>{{ attempt?.tool_calls ?? 0 }} {{ t("recruitment.console.calls") }}</small>
              </div>
              <ol>
                <li v-for="(event, index) in consoleEvents" :key="`${event.code}-${index}`">
                  <Icon :name="event.points > 0 ? 'lucide:circle-check' : 'lucide:terminal'" aria-hidden="true" />
                  <span>{{ eventTitle(event.code) }}</span>
                  <strong v-if="event.points > 0">+{{ event.points }}</strong>
                </li>
              </ol>
              <p v-if="!consoleEvents.length" class="recruitment-console__result-empty">
                {{ t("recruitment.console.failedBody") }}
              </p>
            </div>

            <div v-else class="recruitment-console__empty">
              <Icon name="lucide:terminal-square" aria-hidden="true" />
              <div>
                <strong>{{ t("recruitment.console.idleTitle") }}</strong>
                <p>{{ t("recruitment.console.idleBody") }}</p>
              </div>
            </div>

            <img class="recruitment-console__mascot" src="/recruitment/mascot.png" alt="" aria-hidden="true" />
          </div>
        </section>
      </section>

      <section class="recruitment-guide" aria-labelledby="recruitment-guide-title">
        <div class="recruitment-guide__intro">
          <p><Icon name="lucide:signpost" aria-hidden="true" />{{ t("recruitment.guide.eyebrow") }}</p>
          <h2 id="recruitment-guide-title">{{ t("recruitment.guide.title") }}</h2>
          <span>{{ t("recruitment.guide.body") }}</span>
        </div>

        <ol class="recruitment-guide__steps" :aria-label="t('recruitment.guide.stepsLabel')">
          <li>
            <span class="recruitment-guide__icon"><Icon name="lucide:message-square-text" aria-hidden="true" /></span>
            <div>
              <small aria-hidden="true">01</small>
              <strong>{{ t("recruitment.guide.steps.prompt.title") }}</strong>
              <p>{{ t("recruitment.guide.steps.prompt.body") }}</p>
            </div>
          </li>
          <li>
            <span class="recruitment-guide__icon"><Icon name="lucide:bot" aria-hidden="true" /></span>
            <div>
              <small aria-hidden="true">02</small>
              <strong>{{ t("recruitment.guide.steps.agent.title") }}</strong>
              <p>{{ t("recruitment.guide.steps.agent.body") }}</p>
            </div>
          </li>
          <li>
            <span class="recruitment-guide__icon"><Icon name="lucide:gauge" aria-hidden="true" /></span>
            <div>
              <small aria-hidden="true">03</small>
              <strong>{{ t("recruitment.guide.steps.score.title") }}</strong>
              <p>{{ t("recruitment.guide.steps.score.body") }}</p>
            </div>
          </li>
        </ol>

        <p class="recruitment-guide__tip">
          <Icon name="lucide:lightbulb" aria-hidden="true" />
          <span><strong>{{ t("recruitment.guide.tipLabel") }}</strong>{{ t("recruitment.guide.tip") }}</span>
        </p>
      </section>

      <section class="recruitment-composer" aria-labelledby="composer-title">
        <div class="recruitment-composer__intro">
          <p>{{ t("recruitment.eyebrow") }}</p>
          <h2 id="composer-title">{{ t("recruitment.composer.title") }}</h2>
          <span>{{ t("recruitment.composer.hint") }}</span>
        </div>

        <div class="recruitment-composer__form">
          <div class="recruitment-composer__label-row">
            <label for="recruitment-prompt">{{ t("recruitment.composer.label") }}</label>
            <span :class="{ danger: promptTooLong }">{{ t("recruitment.composer.counter", { count: promptCount }) }}</span>
          </div>
          <textarea
            id="recruitment-prompt"
            v-model="prompt"
            rows="4"
            :placeholder="t('recruitment.composer.placeholder')"
            :aria-invalid="promptTooLong"
            :aria-describedby="localError ? 'recruitment-error recruitment-confirm' : 'recruitment-confirm'"
            :disabled="isRunning || hasAttempted"
          />
          <div class="recruitment-composer__footer">
            <div>
              <p id="recruitment-confirm"><Icon name="lucide:lock-keyhole" aria-hidden="true" />{{ t("recruitment.composer.confirm") }}</p>
              <p v-if="localError" id="recruitment-error" class="recruitment-composer__error" role="alert">{{ localError }}</p>
            </div>
            <button type="button" :disabled="isLoggedIn ? !primaryEnabled : promptTooLong" @click="handlePrimaryAction">
              <span>{{
                !isLoggedIn
                  ? t("recruitment.composer.login")
                  : isRunning
                    ? t("recruitment.composer.running")
                    : hasAttempted
                      ? t("recruitment.composer.submitted")
                      : t("recruitment.composer.submit")
              }}</span>
              <Icon name="lucide:arrow-up-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <aside class="recruitment-scope">
        <Icon name="lucide:shield-check" aria-hidden="true" />
        <div>
          <strong>{{ t("recruitment.scope.title") }}</strong>
          <p>{{ t("recruitment.scope.body") }}</p>
        </div>
      </aside>
    </main>

    <footer class="recruitment-footer">
      <span>{{ t("recruitment.brand.name") }} · {{ t("recruitment.brand.association") }}</span>
      <span>{{ t("recruitment.brand.with") }}</span>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.recruitment-page {
  min-height: 100vh;
  color: var(--text-primary);
  background:
    radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--interactive-primary) 16%, transparent), transparent 28rem),
    radial-gradient(circle at 5% 92%, color-mix(in srgb, var(--semantic-purple) 10%, transparent), transparent 25rem),
    var(--bg-secondary);
  overflow: hidden;
}

.recruitment-header,
.recruitment-main,
.recruitment-footer {
  width: min(1440px, calc(100% - 64px));
  margin-inline: auto;
}

.recruitment-header {
  min-height: 92px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.recruitment-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.recruitment-brand__mark {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 17px;
  background: var(--surface-primary);
  border: var(--card-border);
  box-shadow: var(--shadow-small);
  overflow: hidden;

  img {
    width: 45px;
    height: 45px;
    object-fit: contain;
  }
}

.recruitment-brand__copy {
  display: grid;
  line-height: 1.05;

  strong {
    font-size: 1.28rem;
    letter-spacing: 0.08em;
  }

  span {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }
}

.recruitment-brand__divider {
  width: 1px;
  height: 34px;
  margin-inline: 4px;
  background: var(--border-primary);
}

.recruitment-brand__unikorn {
  width: 134px;
  height: auto;
}

.recruitment-locales {
  display: flex;
  padding: 4px;
  border: var(--card-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-primary) 84%, transparent);
  box-shadow: var(--shadow-small);
}

.recruitment-locales__button {
  min-width: 50px;
  min-height: 36px;
  padding: 6px 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 750;
  cursor: pointer;

  &.active {
    color: var(--text-inverse);
    background: var(--interactive-active);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 35%, transparent);
    outline-offset: 2px;
  }
}

.recruitment-main {
  padding: 46px 0 72px;
}

.recruitment-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.87fr) minmax(600px, 1.13fr);
  align-items: center;
  gap: clamp(48px, 6vw, 96px);
}

.recruitment-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 22px;
  color: var(--interactive-active-text);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  span {
    width: 28px;
    height: 3px;
    border-radius: 999px;
    background: var(--interactive-primary);
  }
}

.recruitment-copy h1 {
  max-width: 700px;
  margin: 0;
  font-size: clamp(3.5rem, 5.6vw, 6.25rem);
  line-height: 0.98;
  letter-spacing: -0.065em;
  text-wrap: balance;
}

.recruitment-lead {
  max-width: 680px;
  margin: 30px 0 0;
  color: var(--text-secondary);
  font-size: clamp(1rem, 1.3vw, 1.22rem);
  line-height: 1.82;
}

.recruitment-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0;
  margin: 28px 0 0;
  list-style: none;

  li {
    min-height: 38px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 13px;
    color: var(--text-secondary);
    font-size: 0.86rem;
    font-weight: 700;
    border: 1px solid var(--border-secondary);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-primary) 76%, transparent);
  }
}

.recruitment-briefing {
  max-width: 680px;
  margin-top: 42px;
  padding: 22px;
  border: var(--card-border);
  border-radius: 22px;
  background: color-mix(in srgb, var(--surface-primary) 82%, transparent);
  box-shadow: var(--shadow-small);
}

.recruitment-section-heading {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1rem;
  }
}

.recruitment-section-heading__icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: var(--interactive-active-text);
  background: color-mix(in srgb, var(--interactive-primary) 12%, transparent);
}

.recruitment-briefing dl {
  display: grid;
  gap: 0;
  margin: 18px 0 0;

  div {
    display: grid;
    grid-template-columns: 74px 1fr;
    gap: 16px;
    padding: 11px 0;
    border-top: 1px solid var(--border-secondary);
  }

  dt {
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.88rem;
    font-weight: 650;
  }
}

.recruitment-console {
  min-height: 650px;
  border: 1px solid color-mix(in srgb, var(--border-primary) 78%, transparent);
  border-radius: 30px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-large);
  overflow: hidden;
}

.recruitment-console__topbar {
  min-height: 58px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 0 22px;
  border-bottom: 1px solid var(--border-secondary);
  background: var(--surface-secondary);
}

.recruitment-console__lights {
  display: flex;
  gap: 7px;

  span {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--border-primary);
  }

  span:nth-child(1) { background: var(--semantic-error); }
  span:nth-child(2) { background: var(--semantic-warning); }
  span:nth-child(3) { background: var(--semantic-success); }
}

.recruitment-console__label {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.16em;
}

.recruitment-console__status {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 750;

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--semantic-success);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--semantic-success) 12%, transparent);
  }

  &.is-running i {
    background: var(--semantic-warning);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--semantic-warning) 12%, transparent);
    animation: recruitment-pulse 1.2s ease-in-out infinite;
  }

  &.is-failed i { background: var(--semantic-error); box-shadow: none; }
}

.recruitment-console__body {
  min-height: 592px;
  position: relative;
  padding: 32px 36px;
  background:
    linear-gradient(var(--border-secondary) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-secondary) 1px, transparent 1px),
    var(--surface-primary);
  background-size: 42px 42px;
}

.recruitment-console__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  p {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  span {
    padding: 6px 10px;
    border-radius: 999px;
    color: var(--text-muted);
    background: var(--surface-secondary);
    font-size: 0.7rem;
    font-weight: 750;
  }
}

.recruitment-timeline {
  width: min(70%, 420px);
  display: grid;
  gap: 0;
  padding: 0;
  margin: 32px 0 0;
  list-style: none;

  li {
    min-height: 62px;
    display: grid;
    grid-template-columns: 34px 22px 1fr;
    align-items: center;
  }
}

.recruitment-timeline__index {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.recruitment-timeline__line {
  width: 10px;
  height: 10px;
  position: relative;
  border: 2px solid var(--border-primary);
  border-radius: 50%;
  background: var(--surface-primary);

  &::after {
    content: "";
    width: 1px;
    height: 54px;
    position: absolute;
    top: 9px;
    left: 3px;
    background: var(--border-secondary);
  }
}

.recruitment-timeline li.complete {
  .recruitment-timeline__line {
    border-color: var(--semantic-success);
    background: var(--semantic-success);
  }

  .recruitment-timeline__text { color: var(--text-primary); }
}

.recruitment-timeline li.active {
  .recruitment-timeline__line {
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--interactive-primary) 12%, transparent);
  }

  .recruitment-timeline__text { color: var(--interactive-active-text); }
}

.recruitment-timeline li:last-child .recruitment-timeline__line::after { display: none; }

.recruitment-timeline__text {
  color: var(--text-secondary);
  font-size: 0.87rem;
  font-weight: 700;
}

.recruitment-console__empty {
  width: min(78%, 480px);
  display: flex;
  gap: 14px;
  margin-top: 22px;
  padding: 18px;
  border: 1px dashed var(--border-primary);
  border-radius: 17px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-secondary) 88%, transparent);

  > svg { color: var(--interactive-primary); flex: 0 0 auto; margin-top: 2px; }

  strong { color: var(--text-primary); font-size: 0.86rem; }
  p { margin: 6px 0 0; font-size: 0.76rem; line-height: 1.6; }
}

.recruitment-console__empty.is-running > svg {
  animation: recruitment-spin 1s linear infinite;
}

.recruitment-console__results {
  width: min(78%, 480px);
  margin-top: 22px;
  padding: 17px;
  border: 1px solid var(--border-primary);
  border-radius: 17px;
  background: color-mix(in srgb, var(--surface-secondary) 92%, transparent);

  ol {
    max-height: 170px;
    display: grid;
    gap: 9px;
    padding: 0 3px 0 0;
    margin: 15px 0 0;
    list-style: none;
    overflow: auto;
  }

  li {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 9px;
    color: var(--text-secondary);
    font-size: 0.74rem;

    svg { color: var(--interactive-primary); }
    strong { color: var(--semantic-success); font-variant-numeric: tabular-nums; }
  }
}

.recruitment-console__score {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-secondary);

  strong { color: var(--interactive-active-text); font-size: 2rem; line-height: 1; }
  span { color: var(--text-secondary); font-size: 0.78rem; font-weight: 750; }
  small { margin-left: auto; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; }
}

.recruitment-console__result-empty {
  margin: 15px 2px 0;
  color: var(--text-secondary);
  font-size: 0.76rem;
  line-height: 1.6;
}

.recruitment-console__mascot {
  width: 218px;
  height: 420px;
  position: absolute;
  right: 4px;
  bottom: -16px;
  object-fit: contain;
  object-position: bottom;
  filter: drop-shadow(0 18px 18px color-mix(in srgb, var(--text-primary) 12%, transparent));
  pointer-events: none;
}

.recruitment-guide {
  display: grid;
  grid-template-columns: minmax(240px, 0.62fr) minmax(0, 1.38fr);
  gap: 28px 42px;
  margin-top: 72px;
  padding: 34px;
  border: 1px solid var(--border-primary);
  border-radius: 30px;
  background: color-mix(in srgb, var(--surface-primary) 90%, transparent);
  box-shadow: var(--shadow-small);
}

.recruitment-guide__intro {
  p {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 13px;
    color: var(--interactive-active-text);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 460px;
    margin: 0;
    font-size: clamp(1.7rem, 2.5vw, 2.6rem);
    line-height: 1.12;
    letter-spacing: -0.035em;
    text-wrap: balance;
  }

  span {
    display: block;
    max-width: 520px;
    margin-top: 16px;
    color: var(--text-secondary);
    font-size: 0.86rem;
    line-height: 1.7;
  }
}

.recruitment-guide__steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;

  li {
    min-width: 0;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-content: start;
    gap: 13px;
    padding: 18px;
    border: 1px solid var(--border-secondary);
    border-radius: 18px;
    background: var(--surface-secondary);
  }

  small {
    display: block;
    margin-bottom: 8px;
    color: var(--text-muted);
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    font-size: 0.9rem;
    line-height: 1.35;
  }

  p {
    margin: 7px 0 0;
    color: var(--text-secondary);
    font-size: 0.76rem;
    line-height: 1.6;
  }
}

.recruitment-guide__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: var(--interactive-active-text);
  background: color-mix(in srgb, var(--interactive-primary) 12%, transparent);
}

.recruitment-guide__tip {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -10px 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--border-secondary);
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.6;

  > svg { flex: 0 0 auto; color: var(--semantic-warning); }
  strong { margin-right: 8px; color: var(--text-primary); }
}

.recruitment-composer {
  display: grid;
  grid-template-columns: minmax(260px, 0.55fr) minmax(0, 1.45fr);
  gap: 46px;
  margin-top: 24px;
  padding: 38px;
  border: 1px solid var(--border-primary);
  border-radius: 30px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-medium);
}

.recruitment-composer__intro {
  p {
    margin: 0 0 14px;
    color: var(--interactive-active-text);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.8rem, 2.7vw, 2.8rem);
    line-height: 1.12;
    letter-spacing: -0.035em;
  }

  span {
    display: block;
    margin-top: 18px;
    color: var(--text-secondary);
    font-size: 0.86rem;
    line-height: 1.7;
  }
}

.recruitment-composer__label-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;

  label { font-size: 0.84rem; font-weight: 800; }
  span { color: var(--text-muted); font-size: 0.78rem; font-weight: 750; font-variant-numeric: tabular-nums; }
  span.danger { color: var(--semantic-error); }
}

.recruitment-composer textarea {
  width: 100%;
  min-height: 132px;
  padding: 18px 20px;
  resize: vertical;
  border: 1px solid var(--border-primary);
  border-radius: 18px;
  color: var(--text-primary);
  background: var(--surface-secondary);
  font: inherit;
  font-size: 1rem;
  line-height: 1.65;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);

  &::placeholder { color: var(--text-muted); }
  &:focus {
    border-color: var(--border-focus);
    background: var(--surface-primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--interactive-primary) 12%, transparent);
  }
  &[aria-invalid="true"] { border-color: var(--semantic-error); }
  &:disabled { opacity: var(--opacity-medium); cursor: not-allowed; }
}

.recruitment-composer__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-top: 15px;

  p {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 3px 0 0;
    color: var(--text-muted);
    font-size: 0.74rem;
    line-height: 1.5;
  }

  button {
    min-width: 194px;
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px 18px;
    border: 0;
    border-radius: 15px;
    color: var(--text-inverse);
    background: var(--btn-primary-bg);
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    transition: transform var(--transition-fast), background var(--transition-fast), opacity var(--transition-fast);

    &:hover:not(:disabled) { transform: translateY(-2px); background: var(--btn-primary-bg-hover); }
    &:focus-visible { outline: 3px solid color-mix(in srgb, var(--interactive-primary) 35%, transparent); outline-offset: 3px; }
    &:disabled { opacity: var(--opacity-low); cursor: not-allowed; }
  }
}

.recruitment-composer__error { color: var(--semantic-error) !important; }

.recruitment-scope {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-top: 20px;
  padding: 18px 22px;
  border-radius: 18px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--semantic-success) 8%, var(--surface-primary));

  > svg { flex: 0 0 auto; color: var(--semantic-success); margin-top: 2px; }
  strong { color: var(--text-primary); font-size: 0.83rem; }
  p { margin: 5px 0 0; font-size: 0.75rem; line-height: 1.6; }
}

.recruitment-footer {
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-top: 1px solid var(--border-secondary);
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

@keyframes recruitment-spin { to { transform: rotate(360deg); } }
@keyframes recruitment-pulse { 50% { opacity: 0.4; } }

@media (prefers-reduced-motion: reduce) {
  .recruitment-console__empty.is-running > svg,
  .recruitment-console__status.is-running i { animation: none; }
}

@media (max-width: 1120px) {
  .recruitment-hero { grid-template-columns: 1fr; }
  .recruitment-copy { max-width: 800px; }
  .recruitment-console { min-height: 590px; }
  .recruitment-console__body { min-height: 532px; }
  .recruitment-guide { grid-template-columns: 1fr; }
  .recruitment-composer { grid-template-columns: 1fr; gap: 28px; }
}

@media (max-width: 720px) {
  .recruitment-header,
  .recruitment-main,
  .recruitment-footer {
    width: min(100% - 28px, 1440px);
  }

  .recruitment-header { min-height: 76px; }
  .recruitment-brand { gap: 9px; }
  .recruitment-brand__mark { width: 42px; height: 42px; border-radius: 13px; }
  .recruitment-brand__mark img { width: 35px; height: 35px; }
  .recruitment-brand__copy strong { font-size: 1rem; }
  .recruitment-brand__copy span { font-size: 0.62rem; margin-top: 4px; }
  .recruitment-brand__divider,
  .recruitment-brand__unikorn { display: none; }
  .recruitment-locales__button { min-width: 44px; min-height: 34px; padding: 5px 9px; }

  .recruitment-main { padding: 30px 0 48px; }
  .recruitment-hero { gap: 38px; }
  .recruitment-copy h1 { font-size: clamp(3rem, 15vw, 4.6rem); }
  .recruitment-lead { margin-top: 22px; }
  .recruitment-briefing { margin-top: 30px; padding: 18px; }
  .recruitment-briefing dl div { grid-template-columns: 62px 1fr; gap: 10px; }

  .recruitment-console { min-height: 560px; border-radius: 22px; }
  .recruitment-console__topbar { grid-template-columns: 1fr auto; padding: 0 16px; }
  .recruitment-console__label { display: none; }
  .recruitment-console__body { min-height: 502px; padding: 24px 20px; }
  .recruitment-timeline { width: 72%; }
  .recruitment-console__empty { width: 76%; padding: 14px; }
  .recruitment-console__mascot { width: 144px; height: 330px; right: -12px; }

  .recruitment-guide { margin-top: 46px; padding: 24px 18px; border-radius: 22px; }
  .recruitment-guide__steps { grid-template-columns: 1fr; }
  .recruitment-guide__tip { align-items: flex-start; margin-top: -4px; }
  .recruitment-composer { margin-top: 18px; padding: 24px 18px; border-radius: 22px; }
  .recruitment-composer__footer { flex-direction: column; }
  .recruitment-composer__footer button { width: 100%; }
  .recruitment-footer { min-height: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  .recruitment-composer textarea,
  .recruitment-composer__footer button { transition: none; }
}
</style>
