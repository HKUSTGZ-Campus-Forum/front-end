export type MeetCampusLocale = "zh" | "en";
export interface LocalizedText { zh: string; en: string }

export interface MeetCampusFeatureFlags {
  id: "meetcampus"; stage: "private_beta"; mode: "persistent_world";
  sessionStorage: "server"; liveAgents: true; realPeople: false;
  autonomousAgentDecisions: true; syntheticResidentCount: number; providerConfigured: boolean;
}

export interface MeetCampusScene {
  id: string; slug: string; parentSceneId: string | null; kind: string; name: LocalizedText;
  map: { x: number; y: number }; affordances: string[]; visual: Record<string, unknown>;
}

export interface MeetCampusResident {
  id: string; slug: string; name: LocalizedText; isMine: boolean; isSynthetic: boolean;
  appearance: { palette?: string; hair?: string; outfit?: string };
  persona: { interests?: string[]; temperament?: string };
  state: { sceneId: string; position: { x: number; y: number }; activity: string;
    activityStartedAt: string; nextDecisionAt: string | null };
}

export interface MeetCampusWorldSnapshot {
  world: { id: string; name: LocalizedText; status: string; stateVersion: number;
    lastAdvancedAt: string; serverTime: string };
  scenes: MeetCampusScene[]; residents: MeetCampusResident[];
}

export interface MeetCampusStoryEvent {
  id: string; kind: string; summary: LocalizedText; sceneId: string;
  participantResidentIds: string[]; importance: number; occurredAt: string;
}

export interface MeetCampusStory {
  id: string; title: LocalizedText; narration: LocalizedText; events: MeetCampusStoryEvent[];
  bridgeCandidate: boolean; isViewed: boolean; createdAt: string;
}

export interface MeetCampusRelationship {
  id: string;
  resident: Pick<MeetCampusResident, "id" | "name" | "appearance" | "isSynthetic">;
  familiarity: number; trust: number; warmth: number; sharedInterests: string[];
  summary: LocalizedText; updatedAt: string;
}

export interface MeetCampusOnboarding {
  status: "not_started" | "completed"; completedAt: string | null;
  autonomyLevel: "guided" | "balanced" | "brave";
  anchors: Record<string, unknown>; privacyRules: Record<string, boolean>;
}

export interface MeetCampusBootstrap {
  feature: MeetCampusFeatureFlags; onboarding: MeetCampusOnboarding; myResidentId: string;
  snapshot: MeetCampusWorldSnapshot; stories: MeetCampusStory[];
  relationships: MeetCampusRelationship[];
}

export interface MeetCampusOnboardingInput {
  locale: MeetCampusLocale; autonomyLevel: "guided" | "balanced" | "brave";
  anchors: { residentName: string; socialPace: string; preferredPlaces: string[]; ownerNote: string };
}

export interface MeetCampusCommandInput {
  kind: "goal" | "visit" | "activity"; text: string; targetSceneId?: string;
}
