import type {
  MeetCampusBootstrap,
  MeetCampusFeedback,
  MeetCampusPace,
  MeetCampusScenario,
  MeetCampusSession,
} from "~/types/meetcampus";
import {
  createMeetCampusSession,
  MEETCAMPUS_SESSION_KEY,
  parseMeetCampusSession,
} from "~/utils/meetcampus";

type MeetCampusLoadState = "idle" | "loading" | "ready" | "denied" | "error";

export function useMeetCampus() {
  const { fetchWithAuth } = useApi();
  const bootstrap = ref<MeetCampusBootstrap | null>(null);
  const loadState = ref<MeetCampusLoadState>("idle");
  const session = ref<MeetCampusSession>(createMeetCampusSession());
  const isAdvancing = ref(false);
  let transitionTimer: ReturnType<typeof setTimeout> | null = null;

  const scenario = computed<MeetCampusScenario | null>(() => {
    if (!bootstrap.value || !session.value.scenarioId) return null;
    return bootstrap.value.scenarios.find((item) => item.id === session.value.scenarioId) ?? null;
  });

  const location = computed(() => {
    if (!bootstrap.value || !scenario.value) return null;
    return bootstrap.value.locations.find((item) => item.id === scenario.value?.locationId) ?? null;
  });

  const story = computed(() => {
    if (!scenario.value || !session.value.choiceId) return null;
    return scenario.value.stories[session.value.choiceId] ?? null;
  });

  const selectedTime = computed(() => {
    if (!scenario.value || !session.value.timeId) return null;
    return scenario.value.times.find((item) => item.id === session.value.timeId) ?? null;
  });

  const progress = computed(() => {
    const steps = ["setup", "encounter", "story", "profile", "pass", "complete"];
    const phaseIndex: Record<MeetCampusSession["phase"], number> = {
      setup: 0,
      searching: 0,
      encounter: 1,
      experience: 1,
      story: 2,
      consent: 2,
      profile: 3,
      planning: 3,
      pass: 4,
      feedback: 4,
      complete: 5,
    };
    return {
      current: phaseIndex[session.value.phase],
      total: steps.length,
      percent: ((phaseIndex[session.value.phase] + 1) / steps.length) * 100,
    };
  });

  function persistSession() {
    if (!import.meta.client) return;
    const next = { ...session.value, updatedAt: new Date().toISOString() };
    session.value = next;
    localStorage.setItem(MEETCAMPUS_SESSION_KEY, JSON.stringify(next));
  }

  function patchSession(updates: Partial<MeetCampusSession>) {
    session.value = { ...session.value, ...updates, updatedAt: new Date().toISOString() };
    persistSession();
  }

  function restoreSession() {
    if (!import.meta.client) return;
    const restored = parseMeetCampusSession(localStorage.getItem(MEETCAMPUS_SESSION_KEY));
    session.value = restored ?? createMeetCampusSession();
  }

  function clearTimer() {
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  function scheduleEncounter() {
    clearTimer();
    transitionTimer = setTimeout(() => {
      if (session.value.phase === "searching") patchSession({ phase: "encounter" });
    }, 1400);
  }

  async function load() {
    loadState.value = "loading";
    try {
      const response = await fetchWithAuth("/api/meetcampus/bootstrap");
      if (response.status === 403) {
        bootstrap.value = null;
        loadState.value = "denied";
        return;
      }
      if (!response.ok) throw new Error(`MeetCampus bootstrap failed (${response.status})`);
      bootstrap.value = (await response.json()) as MeetCampusBootstrap;
      loadState.value = "ready";
      restoreSession();

      const restoredScenario = session.value.scenarioId
        ? bootstrap.value.scenarios.find((item) => item.id === session.value.scenarioId)
        : null;
      const restoredChoiceIsValid =
        !session.value.choiceId ||
        Boolean(restoredScenario?.choices.some((item) => item.id === session.value.choiceId));
      const restoredTimeIsValid =
        !session.value.timeId ||
        Boolean(restoredScenario?.times.some((item) => item.id === session.value.timeId));

      if (
        (session.value.scenarioId && !restoredScenario) ||
        !restoredChoiceIsValid ||
        !restoredTimeIsValid
      ) {
        reset();
      } else if (session.value.phase === "searching") {
        scheduleEncounter();
      }
    } catch (error) {
      console.error("Failed to load MeetCampus", error);
      bootstrap.value = null;
      loadState.value = "error";
    }
  }

  function selectScenario(scenarioId: MeetCampusScenario["id"]) {
    patchSession({
      phase: "setup",
      scenarioId,
      choiceId: null,
      timeId: null,
      feedback: null,
    });
  }

  function setPace(pace: MeetCampusPace) {
    patchSession({ pace });
  }

  function dispatchAgent() {
    if (!scenario.value) return;
    patchSession({ phase: "searching" });
    scheduleEncounter();
  }

  function beginExperience() {
    if (session.value.phase === "encounter") patchSession({ phase: "experience" });
  }

  function chooseExperience(choiceId: string) {
    if (!scenario.value?.choices.some((choice) => choice.id === choiceId)) return;
    patchSession({ choiceId, phase: "story" });
  }

  function requestIntroduction() {
    if (story.value) patchSession({ phase: "consent" });
  }

  async function simulateConsent() {
    if (session.value.phase !== "consent" || isAdvancing.value) return;
    isAdvancing.value = true;
    await new Promise((resolve) => setTimeout(resolve, 900));
    patchSession({ phase: "profile" });
    isAdvancing.value = false;
  }

  function startPlanning() {
    if (session.value.phase === "profile") patchSession({ phase: "planning" });
  }

  function selectTime(timeId: string) {
    if (!scenario.value?.times.some((time) => time.id === timeId)) return;
    patchSession({ timeId });
  }

  async function simulatePlanConfirmation() {
    if (session.value.phase !== "planning" || !selectedTime.value || isAdvancing.value) return;
    isAdvancing.value = true;
    await new Promise((resolve) => setTimeout(resolve, 900));
    patchSession({ phase: "pass" });
    isAdvancing.value = false;
  }

  function markMeetupComplete() {
    if (session.value.phase === "pass") patchSession({ phase: "feedback" });
  }

  function submitFeedback(feedback: MeetCampusFeedback) {
    if (session.value.phase !== "feedback") return;
    patchSession({ feedback, phase: "complete" });
  }

  function reset() {
    clearTimer();
    session.value = createMeetCampusSession();
    if (import.meta.client) localStorage.removeItem(MEETCAMPUS_SESSION_KEY);
  }

  onBeforeUnmount(clearTimer);

  return {
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
  };
}
