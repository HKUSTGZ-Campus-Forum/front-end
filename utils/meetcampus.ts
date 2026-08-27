import type {
  LocalizedText,
  MeetCampusFeedback,
  MeetCampusLocale,
  MeetCampusPace,
  MeetCampusPhase,
  MeetCampusSession,
} from "~/types/meetcampus";

export const MEETCAMPUS_BETA_EMAIL = "wtao565@connect.hkust-gz.edu.cn";
export const MEETCAMPUS_SESSION_KEY = "unikorn:meetcampus:guided-sandbox:v1";

export const MEETCAMPUS_PHASES: MeetCampusPhase[] = [
  "setup",
  "searching",
  "encounter",
  "experience",
  "story",
  "consent",
  "profile",
  "planning",
  "pass",
  "feedback",
  "complete",
];

const VALID_PACES: MeetCampusPace[] = ["quiet", "easy", "active"];
const VALID_FEEDBACK: MeetCampusFeedback[] = ["natural", "good", "pressure"];

export function localizeText(value: LocalizedText | undefined, locale: MeetCampusLocale): string {
  if (!value) return "";
  return value[locale] || value.zh || value.en || "";
}

export function createMeetCampusSession(): MeetCampusSession {
  return {
    version: 1,
    phase: "setup",
    scenarioId: null,
    pace: "quiet",
    choiceId: null,
    timeId: null,
    feedback: null,
    updatedAt: new Date().toISOString(),
  };
}

export function parseMeetCampusSession(value: string | null): MeetCampusSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<MeetCampusSession>;
    if (
      parsed.version !== 1 ||
      !parsed.phase ||
      !MEETCAMPUS_PHASES.includes(parsed.phase) ||
      !parsed.pace ||
      !VALID_PACES.includes(parsed.pace)
    ) {
      return null;
    }
    if (
      parsed.scenarioId !== null &&
      parsed.scenarioId !== "study" &&
      parsed.scenarioId !== "dining" &&
      parsed.scenarioId !== "activity"
    ) {
      return null;
    }
    if (
      parsed.feedback !== null &&
      parsed.feedback !== undefined &&
      !VALID_FEEDBACK.includes(parsed.feedback)
    ) {
      return null;
    }

    const choiceId = typeof parsed.choiceId === "string" ? parsed.choiceId : null;
    const timeId = typeof parsed.timeId === "string" ? parsed.timeId : null;
    const feedback = parsed.feedback ?? null;
    const phasesRequiringScenario: MeetCampusPhase[] = MEETCAMPUS_PHASES.filter(
      (phase) => phase !== "setup",
    );
    const phasesRequiringChoice: MeetCampusPhase[] = [
      "story",
      "consent",
      "profile",
      "planning",
      "pass",
      "feedback",
      "complete",
    ];
    const phasesRequiringTime: MeetCampusPhase[] = ["pass", "feedback", "complete"];

    if (
      (phasesRequiringScenario.includes(parsed.phase) && !parsed.scenarioId) ||
      (phasesRequiringChoice.includes(parsed.phase) && !choiceId) ||
      (phasesRequiringTime.includes(parsed.phase) && !timeId) ||
      (parsed.phase === "complete" && !feedback)
    ) {
      return null;
    }

    return {
      version: 1,
      phase: parsed.phase,
      scenarioId: parsed.scenarioId ?? null,
      pace: parsed.pace,
      choiceId,
      timeId,
      feedback,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
