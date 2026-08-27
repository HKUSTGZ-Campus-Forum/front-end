<script setup lang="ts">
import MeetCampusJourneyPanel from "~/components/meetcampus/MeetCampusJourneyPanel.vue";
import MeetCampusMap from "~/components/meetcampus/MeetCampusMap.vue";

definePageMeta({ layout: "keguang", middleware: ["auth"] });

const { t } = useI18n();
const { getLocalePath } = useAppLocale();
const showAbout = ref(false);

const {
  bootstrap,
  loadState,
  session,
  scenario,
  location,
  story,
  selectedTime,
  progress,
  isAdvancing,
  load,
  selectScenario,
  setPace,
  dispatchAgent,
  beginExperience,
  chooseExperience,
  requestIntroduction,
  simulateConsent,
  startPlanning,
  selectTime,
  simulatePlanConfirmation,
  markMeetupComplete,
  submitFeedback,
  reset,
} = useMeetCampus();

function resetJourney() {
  if (!import.meta.client || window.confirm(t("meetCampus.actions.resetConfirm"))) reset();
}

onMounted(load);

useHead(() => ({
  title: `${t("meetCampus.title")} - ${t("common.appName")}`,
  meta: [{ name: "description", content: t("meetCampus.metaDescription") }],
}));
</script>

<template>
  <main class="mc-page">
    <header class="mc-page__header">
      <div class="mc-page__identity">
        <span class="mc-page__mark" aria-hidden="true">
          <Icon name="lucide:map-pinned" />
        </span>
        <div>
          <div class="mc-page__title-row">
            <h1>{{ t('meetCampus.title') }}</h1>
            <span>{{ t('meetCampus.privateBeta') }}</span>
          </div>
          <p>{{ t('meetCampus.subtitle') }}</p>
        </div>
      </div>
      <div v-if="loadState === 'ready'" class="mc-page__actions">
        <button type="button" @click="showAbout = !showAbout">
          <Icon name="lucide:circle-help" aria-hidden="true" />
          {{ t('meetCampus.actions.aboutBeta') }}
        </button>
        <button type="button" @click="resetJourney">
          <Icon name="lucide:rotate-ccw" aria-hidden="true" />
          {{ t('meetCampus.actions.reset') }}
        </button>
      </div>
    </header>

    <Transition name="mc-expand">
      <aside v-if="showAbout && loadState === 'ready'" class="mc-page__about">
        <Icon name="lucide:flask-conical" aria-hidden="true" />
        <div>
          <strong>{{ t('meetCampus.about.title') }}</strong>
          <p>{{ t('meetCampus.about.description') }}</p>
          <ul>
            <li>{{ t('meetCampus.about.pointOne') }}</li>
            <li>{{ t('meetCampus.about.pointTwo') }}</li>
            <li>{{ t('meetCampus.about.pointThree') }}</li>
          </ul>
        </div>
      </aside>
    </Transition>

    <section v-if="loadState === 'idle' || loadState === 'loading'" class="mc-state-card" aria-live="polite">
      <span class="mc-state-card__loader" aria-hidden="true"></span>
      <h2>{{ t('meetCampus.loading.title') }}</h2>
      <p>{{ t('meetCampus.loading.description') }}</p>
    </section>

    <section v-else-if="loadState === 'denied'" class="mc-state-card mc-state-card--restricted">
      <span class="mc-state-card__icon" aria-hidden="true"><Icon name="lucide:lock-keyhole" /></span>
      <h2>{{ t('meetCampus.restricted.title') }}</h2>
      <p>{{ t('meetCampus.restricted.description') }}</p>
      <NuxtLink :to="getLocalePath('/')" class="mc-state-card__action">
        <Icon name="lucide:arrow-left" aria-hidden="true" />
        {{ t('meetCampus.actions.backHome') }}
      </NuxtLink>
    </section>

    <section v-else-if="loadState === 'error'" class="mc-state-card mc-state-card--error">
      <span class="mc-state-card__icon" aria-hidden="true"><Icon name="lucide:wifi-off" /></span>
      <h2>{{ t('meetCampus.error.title') }}</h2>
      <p>{{ t('meetCampus.error.description') }}</p>
      <button type="button" class="mc-state-card__action" @click="load">
        <Icon name="lucide:refresh-cw" aria-hidden="true" />
        {{ t('meetCampus.actions.retry') }}
      </button>
    </section>

    <div v-else-if="bootstrap" class="mc-page__workspace">
      <MeetCampusMap
        :locations="bootstrap.locations"
        :active-location-id="location?.id"
      />
      <MeetCampusJourneyPanel
        :bootstrap="bootstrap"
        :session="session"
        :scenario="scenario"
        :location="location"
        :story="story"
        :selected-time="selectedTime"
        :progress="progress"
        :is-advancing="isAdvancing"
        @select-scenario="selectScenario"
        @set-pace="setPace"
        @dispatch="dispatchAgent"
        @begin-experience="beginExperience"
        @choose-experience="chooseExperience"
        @request-introduction="requestIntroduction"
        @simulate-consent="simulateConsent"
        @start-planning="startPlanning"
        @select-time="selectTime"
        @simulate-plan-confirmation="simulatePlanConfirmation"
        @mark-meetup-complete="markMeetupComplete"
        @submit-feedback="submitFeedback"
      />
    </div>
  </main>
</template>

<style scoped lang="scss">
.mc-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

.mc-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.mc-page__identity {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.mc-page__mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 14px;
  color: var(--text-inverse);
  background: var(--semantic-purple);
  box-shadow: var(--shadow-small);
}

.mc-page__mark :deep(svg) {
  width: 26px;
  height: 26px;
}

.mc-page__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.mc-page__title-row h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.mc-page__title-row span {
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--interactive-active-text);
  background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
  font-size: 0.7rem;
  font-weight: 750;
}

.mc-page__identity p {
  max-width: 640px;
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.55;
}

.mc-page__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mc-page__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 11px;
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--surface-primary);
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}

.mc-page__actions button:hover {
  border-color: var(--interactive-primary);
  color: var(--interactive-active-text);
  background: var(--surface-secondary);
}

.mc-page__actions button:focus-visible,
.mc-state-card__action:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--interactive-primary) 35%, transparent);
  outline-offset: 2px;
}

.mc-page__about {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: -6px 0 20px;
  padding: 14px 16px;
  border-radius: 12px;
  color: var(--text-secondary);
  background: var(--surface-primary);
  box-shadow: var(--shadow-small);
}

.mc-page__about > :deep(svg) {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--semantic-purple);
}

.mc-page__about strong { color: var(--text-primary); font-size: 0.88rem; }
.mc-page__about p { margin: 4px 0 0; font-size: 0.8rem; line-height: 1.55; }
.mc-page__about ul { display: flex; flex-wrap: wrap; gap: 5px 18px; margin: 8px 0 0; padding-left: 18px; font-size: 0.75rem; }

.mc-page__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(350px, 0.92fr);
  gap: 18px;
  align-items: stretch;
}

.mc-state-card {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 440px;
  padding: 32px;
  border: var(--card-border);
  border-radius: 16px;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
  text-align: center;
}

.mc-state-card h2 { margin: 16px 0 0; font-size: 1.25rem; }
.mc-state-card p { max-width: 48ch; margin: 8px 0 0; color: var(--text-secondary); font-size: 0.86rem; line-height: 1.6; }
.mc-state-card__loader { width: 44px; height: 44px; border: 4px solid var(--surface-secondary); border-top-color: var(--interactive-primary); border-radius: 50%; animation: mc-page-spin 0.9s linear infinite; }
.mc-state-card__icon { display: grid; place-items: center; width: 66px; height: 66px; border-radius: 16px; color: var(--interactive-active-text); background: var(--surface-secondary); }
.mc-state-card__icon :deep(svg) { width: 28px; height: 28px; }
.mc-state-card--error .mc-state-card__icon { color: var(--error-color); background: var(--error-background); }
.mc-state-card__action { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-top: 20px; padding: 9px 15px; border: 0; border-radius: 11px; color: var(--text-inverse); background: var(--btn-primary-bg); font-size: 0.84rem; font-weight: 700; text-decoration: none; cursor: pointer; }

.mc-expand-enter-active,
.mc-expand-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.mc-expand-enter-from,
.mc-expand-leave-to { opacity: 0; transform: translateY(-4px); }

@keyframes mc-page-spin { to { transform: rotate(360deg); } }

@media (max-width: 980px) {
  .mc-page__workspace { grid-template-columns: 1fr; }
}

@media (max-width: 700px) {
  .mc-page { padding: 22px 16px 48px; }
  .mc-page__header { flex-direction: column; gap: 15px; }
  .mc-page__actions { width: 100%; }
  .mc-page__actions button { flex: 1; }
  .mc-page__title-row h1 { font-size: 1.7rem; }
}

@media (max-width: 420px) {
  .mc-page__identity { align-items: flex-start; }
  .mc-page__mark { width: 46px; height: 46px; border-radius: 12px; }
  .mc-page__actions { flex-direction: column; }
  .mc-page__actions button { width: 100%; }
  .mc-state-card { min-height: 380px; padding: 24px 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .mc-page__actions button,
  .mc-expand-enter-active,
  .mc-expand-leave-active { transition: none; }
  .mc-state-card__loader { animation: none; }
}
</style>
