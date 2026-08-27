export type MeetCampusLocale = "zh" | "en";

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface MeetCampusFeatureFlags {
  id: "meetcampus";
  stage: "private_beta";
  mode: "guided_sandbox";
  sessionStorage: "browser_local";
  liveAgents: false;
  realPeople: false;
  autonomousAgentDecisions: false;
}

export interface MeetCampusLocation {
  id: string;
  name: LocalizedText;
  kind: "study" | "dining" | "activity";
  x: number;
  y: number;
}

export interface MeetCampusCandidate {
  displayName: LocalizedText;
  agentName: LocalizedText;
  headline: LocalizedText;
  bio: LocalizedText;
}

export interface MeetCampusChoice {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
}

export interface MeetCampusStory {
  title: LocalizedText;
  summary: LocalizedText;
  myAgent: LocalizedText;
  otherAgent: LocalizedText;
  commonGround: LocalizedText;
  difference: LocalizedText;
  icebreaker: LocalizedText;
}

export interface MeetCampusTimeChoice {
  id: string;
  label: LocalizedText;
}

export interface MeetCampusScenario {
  id: "study" | "dining" | "activity";
  label: LocalizedText;
  summary: LocalizedText;
  icon: string;
  locationId: string;
  candidate: MeetCampusCandidate;
  matchReasons: LocalizedText[];
  event: {
    title: LocalizedText;
    description: LocalizedText;
  };
  choices: MeetCampusChoice[];
  stories: Record<string, MeetCampusStory>;
  times: MeetCampusTimeChoice[];
  durationMinutes: number;
  offlineTask: LocalizedText;
}

export interface MeetCampusBootstrap {
  feature: MeetCampusFeatureFlags;
  locations: MeetCampusLocation[];
  scenarios: MeetCampusScenario[];
}

export type MeetCampusPhase =
  | "setup"
  | "searching"
  | "encounter"
  | "experience"
  | "story"
  | "consent"
  | "profile"
  | "planning"
  | "pass"
  | "feedback"
  | "complete";

export type MeetCampusPace = "quiet" | "easy" | "active";
export type MeetCampusFeedback = "natural" | "good" | "pressure";

export interface MeetCampusSession {
  version: 1;
  phase: MeetCampusPhase;
  scenarioId: MeetCampusScenario["id"] | null;
  pace: MeetCampusPace;
  choiceId: string | null;
  timeId: string | null;
  feedback: MeetCampusFeedback | null;
  updatedAt: string;
}
