<script setup lang="ts">
import type {
  MeetCampusBootstrap,
  MeetCampusFeedback,
  MeetCampusLocation,
  MeetCampusPace,
  MeetCampusScenario,
  MeetCampusSession,
  MeetCampusStory,
  MeetCampusTimeChoice,
} from "~/types/meetcampus";
import { localizeText } from "~/utils/meetcampus";

const props = defineProps<{
  bootstrap: MeetCampusBootstrap;
  session: MeetCampusSession;
  scenario: MeetCampusScenario | null;
  location: MeetCampusLocation | null;
  story: MeetCampusStory | null;
  selectedTime: MeetCampusTimeChoice | null;
  progress: { current: number; total: number; percent: number };
  isAdvancing: boolean;
}>();

const emit = defineEmits<{
  (event: "select-scenario", scenarioId: MeetCampusScenario["id"]): void;
  (event: "set-pace", pace: MeetCampusPace): void;
  (event: "dispatch"): void;
  (event: "begin-experience"): void;
  (event: "choose-experience", choiceId: string): void;
  (event: "request-introduction"): void;
  (event: "simulate-consent"): void;
  (event: "start-planning"): void;
  (event: "select-time", timeId: string): void;
  (event: "simulate-plan-confirmation"): void;
  (event: "mark-meetup-complete"): void;
  (event: "submit-feedback", feedback: MeetCampusFeedback): void;
}>();

const { t } = useI18n();
const { locale } = useAppLocale();
const l = (value: Parameters<typeof localizeText>[0]) => localizeText(value, locale.value);

const paceOptions: Array<{ id: MeetCampusPace; icon: string }> = [
  { id: "quiet", icon: "lucide:headphones" },
  { id: "easy", icon: "lucide:message-circle" },
  { id: "active", icon: "lucide:sparkles" },
];

const feedbackOptions: Array<{ id: MeetCampusFeedback; icon: string }> = [
  { id: "natural", icon: "lucide:smile" },
  { id: "good", icon: "lucide:thumbs-up" },
  { id: "pressure", icon: "lucide:cloud-rain" },
];

const phaseTitle = computed(() => t(`meetCampus.phases.${props.session.phase}`));
const selectedChoice = computed(() =>
  props.scenario?.choices.find((choice) => choice.id === props.session.choiceId) ?? null,
);
</script>

<template>
  <section class="mc-journey" :aria-labelledby="`mc-phase-${session.phase}`">
    <header class="mc-journey__header">
      <div>
        <span class="mc-journey__step">
          {{ t('meetCampus.progress', { current: progress.current + 1, total: progress.total }) }}
        </span>
        <h2 :id="`mc-phase-${session.phase}`">{{ phaseTitle }}</h2>
      </div>
      <span class="mc-journey__sandbox-badge">
        <Icon name="lucide:flask-conical" aria-hidden="true" />
        {{ t('meetCampus.sandboxBadge') }}
      </span>
    </header>

    <div class="mc-journey__progress" aria-hidden="true">
      <span :style="{ width: `${progress.percent}%` }"></span>
    </div>

    <div v-if="session.phase === 'setup'" class="mc-stage mc-stage--setup">
      <div class="mc-notice">
        <Icon name="lucide:info" aria-hidden="true" />
        <p>{{ t('meetCampus.setup.transparency') }}</p>
      </div>

      <fieldset class="mc-fieldset">
        <legend>{{ t('meetCampus.setup.intentLabel') }}</legend>
        <div class="mc-intent-list">
          <button
            v-for="item in bootstrap.scenarios"
            :key="item.id"
            type="button"
            class="mc-intent"
            :class="{ 'mc-intent--selected': session.scenarioId === item.id }"
            :aria-pressed="session.scenarioId === item.id"
            @click="emit('select-scenario', item.id)"
          >
            <span class="mc-intent__icon" aria-hidden="true">
              <Icon :name="`lucide:${item.icon}`" />
            </span>
            <span>
              <strong>{{ l(item.label) }}</strong>
              <small>{{ l(item.summary) }}</small>
            </span>
            <Icon v-if="session.scenarioId === item.id" name="lucide:check" aria-hidden="true" />
          </button>
        </div>
      </fieldset>

      <fieldset class="mc-fieldset">
        <legend>{{ t('meetCampus.setup.paceLabel') }}</legend>
        <div class="mc-segmented">
          <button
            v-for="pace in paceOptions"
            :key="pace.id"
            type="button"
            :class="{ active: session.pace === pace.id }"
            :aria-pressed="session.pace === pace.id"
            @click="emit('set-pace', pace.id)"
          >
            <Icon :name="pace.icon" aria-hidden="true" />
            {{ t(`meetCampus.setup.paces.${pace.id}`) }}
          </button>
        </div>
        <p class="mc-field-hint">{{ t('meetCampus.setup.paceHint') }}</p>
      </fieldset>

      <div class="mc-capacity-row">
        <div>
          <strong>{{ t('meetCampus.setup.groupLabel') }}</strong>
          <span>{{ t('meetCampus.setup.oneToOne') }}</span>
        </div>
        <span class="mc-capacity-row__upcoming">{{ t('meetCampus.setup.groupComingSoon') }}</span>
      </div>

      <button class="mc-button mc-button--primary" type="button" :disabled="!scenario" @click="emit('dispatch')">
        <Icon name="lucide:bot" aria-hidden="true" />
        {{ t('meetCampus.actions.dispatchAgent') }}
      </button>
    </div>

    <div v-else-if="session.phase === 'searching'" class="mc-stage mc-stage--center" aria-live="polite">
      <div class="mc-search-orbit" aria-hidden="true">
        <Icon name="lucide:bot" />
        <span></span>
      </div>
      <h3>{{ t('meetCampus.searching.title') }}</h3>
      <p>{{ t('meetCampus.searching.description', { location: location ? l(location.name) : '' }) }}</p>
      <div class="mc-search-facts">
        <span>{{ t('meetCampus.searching.fixedCandidate') }}</span>
        <span>{{ t('meetCampus.searching.noLiveSearch') }}</span>
      </div>
    </div>

    <div v-else-if="session.phase === 'encounter' && scenario" class="mc-stage">
      <div class="mc-encounter-avatars" aria-hidden="true">
        <span class="mc-agent-avatar mc-agent-avatar--mine"><Icon name="lucide:bot" /></span>
        <span class="mc-encounter-link"><Icon name="lucide:sparkles" /></span>
        <span class="mc-agent-avatar mc-agent-avatar--other"><Icon name="lucide:bot" /></span>
      </div>
      <div class="mc-stage-copy mc-stage-copy--center">
        <h3>{{ t('meetCampus.encounter.title', { agent: l(scenario.candidate.agentName) }) }}</h3>
        <p>{{ t('meetCampus.encounter.atLocation', { location: location ? l(location.name) : '' }) }}</p>
      </div>
      <ul class="mc-reason-list">
        <li v-for="reason in scenario.matchReasons" :key="l(reason)">
          <Icon name="lucide:check-circle-2" aria-hidden="true" />
          {{ l(reason) }}
        </li>
      </ul>
      <button class="mc-button mc-button--primary" type="button" @click="emit('begin-experience')">
        {{ t('meetCampus.actions.viewEncounter') }}
        <Icon name="lucide:arrow-right" aria-hidden="true" />
      </button>
    </div>

    <div v-else-if="session.phase === 'experience' && scenario" class="mc-stage">
      <div class="mc-event-card">
        <span class="mc-event-card__icon" aria-hidden="true"><Icon name="lucide:sparkles" /></span>
        <div>
          <h3>{{ l(scenario.event.title) }}</h3>
          <p>{{ l(scenario.event.description) }}</p>
        </div>
      </div>
      <div class="mc-notice">
        <Icon name="lucide:mouse-pointer-click" aria-hidden="true" />
        <p>{{ t('meetCampus.experience.userChoiceDisclosure') }}</p>
      </div>
      <div class="mc-choice-list">
        <button
          v-for="choice in scenario.choices"
          :key="choice.id"
          type="button"
          class="mc-choice"
          @click="emit('choose-experience', choice.id)"
        >
          <span>
            <strong>{{ l(choice.label) }}</strong>
            <small>{{ l(choice.description) }}</small>
          </span>
          <Icon name="lucide:arrow-right" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-else-if="session.phase === 'story' && scenario && story" class="mc-stage">
      <div class="mc-story-intro">
        <span aria-hidden="true"><Icon name="lucide:book-open" /></span>
        <div>
          <small>{{ t('meetCampus.story.sharedStory') }}</small>
          <h3>{{ l(story.title) }}</h3>
          <p>{{ l(story.summary) }}</p>
        </div>
      </div>
      <dl class="mc-story-details">
        <div>
          <dt>{{ t('meetCampus.story.myAgent') }}</dt>
          <dd>{{ l(story.myAgent) }}</dd>
        </div>
        <div>
          <dt>{{ t('meetCampus.story.otherAgent', { agent: l(scenario.candidate.agentName) }) }}</dt>
          <dd>{{ l(story.otherAgent) }}</dd>
        </div>
        <div>
          <dt>{{ t('meetCampus.story.commonGround') }}</dt>
          <dd>{{ l(story.commonGround) }}</dd>
        </div>
        <div>
          <dt>{{ t('meetCampus.story.difference') }}</dt>
          <dd>{{ l(story.difference) }}</dd>
        </div>
      </dl>
      <button class="mc-button mc-button--primary" type="button" @click="emit('request-introduction')">
        <Icon name="lucide:handshake" aria-hidden="true" />
        {{ t('meetCampus.actions.requestIntroduction') }}
      </button>
    </div>

    <div v-else-if="session.phase === 'consent' && scenario" class="mc-stage">
      <div class="mc-consent-row mc-consent-row--accepted">
        <span><Icon name="lucide:user-round" aria-hidden="true" /></span>
        <div><strong>{{ t('meetCampus.consent.you') }}</strong><small>{{ t('meetCampus.consent.accepted') }}</small></div>
        <Icon name="lucide:check-circle-2" aria-hidden="true" />
      </div>
      <div class="mc-consent-row">
        <span><Icon name="lucide:bot" aria-hidden="true" /></span>
        <div><strong>{{ l(scenario.candidate.agentName) }}</strong><small>{{ t('meetCampus.consent.simulatedPending') }}</small></div>
        <Icon name="lucide:clock-3" aria-hidden="true" />
      </div>
      <div class="mc-notice mc-notice--warning">
        <Icon name="lucide:triangle-alert" aria-hidden="true" />
        <p>{{ t('meetCampus.consent.disclosure') }}</p>
      </div>
      <button class="mc-button mc-button--primary" type="button" :disabled="isAdvancing" @click="emit('simulate-consent')">
        <Icon v-if="isAdvancing" name="lucide:loader-circle" class="mc-spin" aria-hidden="true" />
        <Icon v-else name="lucide:play" aria-hidden="true" />
        {{ isAdvancing ? t('meetCampus.actions.runningSimulation') : t('meetCampus.actions.simulateConsent') }}
      </button>
    </div>

    <div v-else-if="session.phase === 'profile' && scenario" class="mc-stage">
      <div class="mc-profile">
        <span class="mc-profile__avatar" aria-hidden="true">{{ l(scenario.candidate.displayName).slice(0, 1) }}</span>
        <div>
          <span class="mc-profile__unlocked"><Icon name="lucide:unlock" /> {{ t('meetCampus.profile.unlocked') }}</span>
          <h3>{{ l(scenario.candidate.displayName) }}</h3>
          <p class="mc-profile__headline">{{ l(scenario.candidate.headline) }}</p>
        </div>
      </div>
      <p class="mc-profile__bio">{{ l(scenario.candidate.bio) }}</p>
      <div class="mc-icebreaker">
        <span>{{ t('meetCampus.story.icebreaker') }}</span>
        <strong>{{ l(story?.icebreaker) }}</strong>
      </div>
      <button class="mc-button mc-button--primary" type="button" @click="emit('start-planning')">
        <Icon name="lucide:calendar-clock" aria-hidden="true" />
        {{ t('meetCampus.actions.planMeetup') }}
      </button>
    </div>

    <div v-else-if="session.phase === 'planning' && scenario" class="mc-stage">
      <div class="mc-plan-summary">
        <span><Icon name="lucide:map-pin" aria-hidden="true" /></span>
        <div>
          <small>{{ t('meetCampus.planning.location') }}</small>
          <strong>{{ location ? l(location.name) : '' }}</strong>
        </div>
        <div>
          <small>{{ t('meetCampus.planning.duration') }}</small>
          <strong>{{ t('meetCampus.planning.minutes', { count: scenario.durationMinutes }) }}</strong>
        </div>
      </div>
      <fieldset class="mc-fieldset">
        <legend>{{ t('meetCampus.planning.chooseTime') }}</legend>
        <div class="mc-time-list">
          <label v-for="time in scenario.times" :key="time.id" :class="{ selected: session.timeId === time.id }">
            <input
              type="radio"
              name="meetcampus-time"
              :value="time.id"
              :checked="session.timeId === time.id"
              @change="emit('select-time', time.id)"
            />
            <span>{{ l(time.label) }}</span>
            <Icon v-if="session.timeId === time.id" name="lucide:check" aria-hidden="true" />
          </label>
        </div>
      </fieldset>
      <div class="mc-notice mc-notice--warning">
        <Icon name="lucide:triangle-alert" aria-hidden="true" />
        <p>{{ t('meetCampus.planning.disclosure') }}</p>
      </div>
      <button class="mc-button mc-button--primary" type="button" :disabled="!selectedTime || isAdvancing" @click="emit('simulate-plan-confirmation')">
        <Icon v-if="isAdvancing" name="lucide:loader-circle" class="mc-spin" aria-hidden="true" />
        <Icon v-else name="lucide:play" aria-hidden="true" />
        {{ isAdvancing ? t('meetCampus.actions.runningSimulation') : t('meetCampus.actions.simulatePlan') }}
      </button>
    </div>

    <div v-else-if="session.phase === 'pass' && scenario && story && selectedTime" class="mc-stage">
      <div class="mc-pass">
        <div class="mc-pass__top">
          <span><Icon name="lucide:ticket-check" aria-hidden="true" /></span>
          <div><small>{{ t('meetCampus.pass.label') }}</small><h3>{{ l(story.title) }}</h3></div>
        </div>
        <dl>
          <div><dt>{{ t('meetCampus.pass.time') }}</dt><dd>{{ l(selectedTime.label) }}</dd></div>
          <div><dt>{{ t('meetCampus.pass.place') }}</dt><dd>{{ location ? l(location.name) : '' }}</dd></div>
          <div><dt>{{ t('meetCampus.pass.duration') }}</dt><dd>{{ t('meetCampus.planning.minutes', { count: scenario.durationMinutes }) }}</dd></div>
          <div><dt>{{ t('meetCampus.pass.task') }}</dt><dd>{{ l(scenario.offlineTask) }}</dd></div>
          <div><dt>{{ t('meetCampus.pass.icebreaker') }}</dt><dd>{{ l(story.icebreaker) }}</dd></div>
        </dl>
      </div>
      <div class="mc-safety-note">
        <Icon name="lucide:shield-check" aria-hidden="true" />
        <p>{{ t('meetCampus.pass.safety') }}</p>
      </div>
      <button class="mc-button mc-button--primary" type="button" @click="emit('mark-meetup-complete')">
        <Icon name="lucide:check" aria-hidden="true" />
        {{ t('meetCampus.actions.markMeetupComplete') }}
      </button>
    </div>

    <div v-else-if="session.phase === 'feedback'" class="mc-stage">
      <div class="mc-stage-copy mc-stage-copy--center">
        <span class="mc-stage-copy__icon"><Icon name="lucide:message-circle-heart" aria-hidden="true" /></span>
        <h3>{{ t('meetCampus.feedback.title') }}</h3>
        <p>{{ t('meetCampus.feedback.description') }}</p>
      </div>
      <div class="mc-feedback-list">
        <button v-for="feedback in feedbackOptions" :key="feedback.id" type="button" @click="emit('submit-feedback', feedback.id)">
          <Icon :name="feedback.icon" aria-hidden="true" />
          <span><strong>{{ t(`meetCampus.feedback.options.${feedback.id}.label`) }}</strong><small>{{ t(`meetCampus.feedback.options.${feedback.id}.description`) }}</small></span>
        </button>
      </div>
    </div>

    <div v-else-if="session.phase === 'complete' && scenario && story" class="mc-stage mc-stage--complete">
      <span class="mc-complete-icon" aria-hidden="true"><Icon name="lucide:sparkles" /></span>
      <h3>{{ t('meetCampus.complete.title') }}</h3>
      <p>{{ t('meetCampus.complete.description') }}</p>
      <div class="mc-memory">
        <small>{{ t('meetCampus.complete.memoryLabel') }}</small>
        <strong>{{ l(story.title) }}</strong>
        <span>{{ t(`meetCampus.feedback.options.${session.feedback}.label`) }}</span>
      </div>
      <div class="mc-notice">
        <Icon name="lucide:database" aria-hidden="true" />
        <p>{{ t('meetCampus.complete.storageDisclosure') }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.mc-journey {
  display: flex;
  flex-direction: column;
  min-height: 680px;
  padding: 22px;
  border: var(--card-border);
  border-radius: 16px;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.mc-journey__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.mc-journey__header h2 {
  margin: 4px 0 0;
  font-size: 1.3rem;
  line-height: 1.25;
  text-wrap: balance;
}

.mc-journey__step {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 650;
}

.mc-journey__sandbox-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 5px 9px;
  border-radius: 999px;
  color: var(--interactive-active-text);
  background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.mc-journey__progress {
  height: 5px;
  margin: 16px 0 22px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-secondary);
}

.mc-journey__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--interactive-primary);
  transition: width 0.25s ease-out;
}

.mc-stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 18px;
}

.mc-stage--center,
.mc-stage--complete {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.mc-stage--center h3,
.mc-stage--complete h3,
.mc-stage-copy h3 {
  margin: 0;
  font-size: 1.2rem;
}

.mc-stage--center > p,
.mc-stage--complete > p,
.mc-stage-copy p {
  max-width: 46ch;
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
}

.mc-notice,
.mc-safety-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  color: var(--text-secondary);
  background: var(--surface-secondary);
  font-size: 0.82rem;
  line-height: 1.55;
}

.mc-notice > :deep(svg),
.mc-safety-note > :deep(svg) {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--interactive-active-text);
}

.mc-notice p,
.mc-safety-note p { margin: 0; }
.mc-notice--warning { background: var(--warning-background); }
.mc-notice--warning > :deep(svg) { color: var(--warning-text); }

.mc-fieldset {
  min-width: 0;
  padding: 0;
  border: 0;
  margin: 0;
}

.mc-fieldset legend,
.mc-capacity-row strong {
  margin-bottom: 9px;
  font-size: 0.85rem;
  font-weight: 700;
}

.mc-intent-list,
.mc-choice-list,
.mc-time-list,
.mc-feedback-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.mc-intent,
.mc-choice,
.mc-feedback-list button {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 58px;
  padding: 11px;
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  color: var(--text-primary);
  background: var(--surface-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, transform 0.2s;
}

.mc-intent:hover,
.mc-choice:hover,
.mc-feedback-list button:hover {
  border-color: var(--interactive-primary);
  background: var(--surface-secondary);
  transform: translateY(-1px);
}

.mc-intent:focus-visible,
.mc-choice:focus-visible,
.mc-feedback-list button:focus-visible,
.mc-segmented button:focus-visible,
.mc-time-list label:has(input:focus-visible) {
  outline: 3px solid color-mix(in srgb, var(--interactive-primary) 34%, transparent);
  outline-offset: 2px;
}

.mc-intent--selected {
  border-color: var(--interactive-primary);
  background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
}

.mc-intent > span:nth-child(2),
.mc-choice > span,
.mc-feedback-list button > span { flex: 1; min-width: 0; }

.mc-intent strong,
.mc-choice strong,
.mc-feedback-list strong { display: block; font-size: 0.88rem; }
.mc-intent small,
.mc-choice small,
.mc-feedback-list small { display: block; margin-top: 3px; color: var(--text-secondary); font-size: 0.75rem; line-height: 1.45; }

.mc-intent__icon,
.mc-stage-copy__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 10px;
  color: var(--interactive-active-text);
  background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
}

.mc-segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 5px;
  border-radius: 12px;
  background: var(--surface-secondary);
}

.mc-segmented button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 42px;
  padding: 7px;
  border: 0;
  border-radius: 9px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 0.75rem;
  font-weight: 650;
  cursor: pointer;
}

.mc-segmented button.active {
  color: var(--interactive-active-text);
  background: var(--surface-primary);
  box-shadow: var(--shadow-small);
}

.mc-field-hint {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1.45;
}

.mc-capacity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
}

.mc-capacity-row div { display: flex; flex-direction: column; gap: 3px; }
.mc-capacity-row strong { margin: 0; }
.mc-capacity-row span { color: var(--text-secondary); font-size: 0.75rem; }
.mc-capacity-row__upcoming { padding: 4px 7px; border-radius: 999px; background: var(--surface-secondary); white-space: nowrap; }

.mc-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 46px;
  margin-top: auto;
  padding: 10px 16px;
  border: 0;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
}

.mc-button--primary { color: var(--text-inverse); background: var(--btn-primary-bg); }
.mc-button--primary:hover:not(:disabled) { background: var(--btn-primary-bg-hover); transform: translateY(-1px); }
.mc-button:focus-visible { outline: 3px solid color-mix(in srgb, var(--interactive-primary) 35%, transparent); outline-offset: 2px; }
.mc-button:disabled { opacity: 0.55; cursor: not-allowed; }

.mc-search-orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  color: var(--interactive-primary);
  background: color-mix(in srgb, var(--interactive-primary) 9%, var(--surface-primary));
}

.mc-search-orbit > :deep(svg) { width: 30px; height: 30px; }
.mc-search-orbit span { position: absolute; inset: -7px; border: 2px solid transparent; border-top-color: var(--interactive-primary); border-radius: 50%; animation: mc-rotate 1s linear infinite; }
.mc-search-facts { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.mc-search-facts span { padding: 5px 8px; border-radius: 999px; color: var(--text-secondary); background: var(--surface-secondary); font-size: 0.7rem; }

.mc-encounter-avatars { display: flex; align-items: center; justify-content: center; gap: 12px; padding-top: 20px; }
.mc-agent-avatar { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 16px; color: var(--text-inverse); background: var(--interactive-primary); box-shadow: var(--shadow-medium); }
.mc-agent-avatar :deep(svg) { width: 30px; height: 30px; }
.mc-agent-avatar--other { background: var(--semantic-purple); }
.mc-encounter-link { color: var(--semantic-warning); }
.mc-stage-copy--center { display: flex; align-items: center; flex-direction: column; text-align: center; }
.mc-reason-list { display: flex; flex-direction: column; gap: 8px; padding: 0; margin: 0; list-style: none; }
.mc-reason-list li { display: flex; align-items: flex-start; gap: 8px; color: var(--text-secondary); font-size: 0.83rem; line-height: 1.5; }
.mc-reason-list :deep(svg) { flex: 0 0 auto; margin-top: 2px; color: var(--semantic-success); }

.mc-event-card,
.mc-story-intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--semantic-purple) 9%, var(--surface-primary));
}

.mc-event-card__icon,
.mc-story-intro > span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 11px;
  color: var(--text-inverse);
  background: var(--semantic-purple);
}

.mc-event-card h3,
.mc-story-intro h3 { margin: 0; font-size: 1rem; }
.mc-event-card p,
.mc-story-intro p { margin: 5px 0 0; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.55; }
.mc-story-intro small { color: var(--semantic-purple); font-size: 0.7rem; font-weight: 750; }

.mc-story-details { display: flex; flex-direction: column; margin: 0; }
.mc-story-details > div { padding: 10px 0; border-bottom: 1px solid var(--border-secondary); }
.mc-story-details dt { color: var(--text-secondary); font-size: 0.7rem; font-weight: 700; }
.mc-story-details dd { margin: 4px 0 0; font-size: 0.82rem; line-height: 1.5; }

.mc-consent-row {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
}
.mc-consent-row > span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 11px; color: var(--interactive-active-text); background: var(--surface-secondary); }
.mc-consent-row div { display: flex; flex-direction: column; gap: 2px; }
.mc-consent-row strong { font-size: 0.85rem; }
.mc-consent-row small { color: var(--text-secondary); font-size: 0.72rem; }
.mc-consent-row--accepted > :deep(svg:last-child) { color: var(--semantic-success); }

.mc-profile { display: flex; align-items: center; gap: 14px; }
.mc-profile__avatar { display: grid; place-items: center; width: 70px; height: 70px; flex: 0 0 auto; border-radius: 16px; color: var(--text-inverse); background: var(--semantic-purple); font-size: 1.4rem; font-weight: 800; }
.mc-profile h3 { margin: 4px 0 0; font-size: 1.2rem; }
.mc-profile__unlocked { display: inline-flex; align-items: center; gap: 4px; color: var(--semantic-success); font-size: 0.7rem; font-weight: 700; }
.mc-profile__headline { margin: 3px 0 0; color: var(--text-secondary); font-size: 0.78rem; }
.mc-profile__bio { margin: 0; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.65; }
.mc-icebreaker { display: flex; flex-direction: column; gap: 5px; padding: 13px; border-radius: 12px; background: var(--surface-secondary); }
.mc-icebreaker span { color: var(--text-secondary); font-size: 0.7rem; }
.mc-icebreaker strong { font-size: 0.88rem; line-height: 1.5; }

.mc-plan-summary { display: grid; grid-template-columns: 38px 1fr 1fr; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; background: var(--surface-secondary); }
.mc-plan-summary > span { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; color: var(--interactive-active-text); background: var(--surface-primary); }
.mc-plan-summary div { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.mc-plan-summary small { color: var(--text-secondary); font-size: 0.68rem; }
.mc-plan-summary strong { overflow-wrap: anywhere; font-size: 0.78rem; }

.mc-time-list label { display: flex; align-items: center; gap: 9px; min-height: 46px; padding: 9px 11px; border: 1px solid var(--border-secondary); border-radius: 11px; cursor: pointer; }
.mc-time-list label.selected { border-color: var(--interactive-primary); background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary)); }
.mc-time-list input { width: 18px; height: 18px; accent-color: var(--interactive-primary); }
.mc-time-list span { flex: 1; font-size: 0.82rem; }
.mc-time-list label > :deep(svg) { color: var(--interactive-primary); }

.mc-pass { overflow: hidden; border: 1px solid var(--border-primary); border-radius: 14px; background: var(--surface-primary); }
.mc-pass__top { display: flex; align-items: center; gap: 11px; padding: 14px; color: var(--text-inverse); background: var(--interactive-active); }
.mc-pass__top > span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; background: color-mix(in srgb, var(--text-inverse) 16%, transparent); }
.mc-pass__top small { opacity: 0.84; font-size: 0.68rem; }
.mc-pass__top h3 { margin: 3px 0 0; font-size: 1rem; }
.mc-pass dl { display: flex; flex-direction: column; margin: 0; padding: 5px 14px 10px; }
.mc-pass dl div { display: grid; grid-template-columns: 86px 1fr; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border-secondary); }
.mc-pass dl div:last-child { border-bottom: 0; }
.mc-pass dt { color: var(--text-secondary); font-size: 0.7rem; }
.mc-pass dd { margin: 0; font-size: 0.78rem; line-height: 1.5; }
.mc-safety-note > :deep(svg) { color: var(--semantic-success); }

.mc-feedback-list button { min-height: 68px; }
.mc-feedback-list button > :deep(svg) { width: 26px; height: 26px; flex: 0 0 auto; color: var(--interactive-active-text); }

.mc-complete-icon { display: grid; place-items: center; width: 70px; height: 70px; border-radius: 18px; color: var(--text-inverse); background: var(--semantic-purple); box-shadow: var(--shadow-medium); }
.mc-complete-icon :deep(svg) { width: 32px; height: 32px; }
.mc-memory { display: flex; flex-direction: column; align-items: center; gap: 5px; width: 100%; padding: 14px; border-radius: 12px; background: var(--surface-secondary); }
.mc-memory small { color: var(--text-secondary); font-size: 0.7rem; }
.mc-memory strong { font-size: 0.92rem; }
.mc-memory span { color: var(--interactive-active-text); font-size: 0.75rem; font-weight: 700; }

.mc-spin { animation: mc-rotate 0.9s linear infinite; }
@keyframes mc-rotate { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .mc-journey { min-height: 0; }
}

@media (max-width: 520px) {
  .mc-journey { padding: 18px 16px; border-radius: 14px; }
  .mc-journey__header { gap: 10px; }
  .mc-journey__header h2 { font-size: 1.15rem; }
  .mc-journey__sandbox-badge { padding: 5px 7px; }
  .mc-segmented { grid-template-columns: 1fr; }
  .mc-segmented button { justify-content: flex-start; padding-inline: 12px; }
  .mc-pass dl div { grid-template-columns: 72px 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .mc-journey__progress span,
  .mc-button,
  .mc-intent,
  .mc-choice,
  .mc-feedback-list button { transition: none; }
  .mc-search-orbit span,
  .mc-spin { animation: none; }
}
</style>
