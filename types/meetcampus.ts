export type MeetCampusLocale = "zh" | "en";
export interface LocalizedText { zh: string; en: string }

export interface MeetCampusFeatureFlags {
  id: "meetcampus"; stage: "private_beta"; mode: "persistent_world";
  sessionStorage: "server"; liveAgents: true; realPeople: false;
  autonomousAgentDecisions: true; syntheticResidentCount: number; providerConfigured: boolean;
  runtimeParity: boolean; continuousJourneys: boolean; reciprocalActivities: boolean;
}

export interface MeetCampusActivityDefinition {
  id: string; slug: string; name: LocalizedText; description: LocalizedText;
  participants: { min: number; max: number };
  durationMinutes: { min: number; max: number }; tags: string[];
}

export interface MeetCampusScene {
  id: string; slug: string; parentSceneId: string | null; kind: string; name: LocalizedText;
  map: { x: number; y: number }; affordances: string[]; activities: MeetCampusActivityDefinition[];
  visual: Record<string, unknown>;
}

export interface MeetCampusJourney {
  id: string; fromSceneId: string; toSceneId: string; routeSceneIds: string[];
  path: { x: number; y: number }[]; status: "traveling" | "arrived";
  intention: LocalizedText; departAt: string; arriveAt: string;
}

export interface MeetCampusActivitySessionState {
  sessionId: string; status: "forming" | "active"; participantStatus: "invited" | "accepted";
  activityId: string; activitySlug: string; activityName: LocalizedText;
  participantResidentIds: string[]; startsAt: string | null; endsAt: string | null;
}

export type MeetCampusSkinTone = "porcelain" | "warm" | "tan" | "deep";
export type MeetCampusHairStyle = "crop" | "bob" | "waves" | "bun" | "curly" | "cap";
export type MeetCampusHairColor = "ink" | "chestnut" | "auburn" | "plum" | "ocean";
export type MeetCampusOutfit = "campus_blue" | "mint_cardigan" | "sunset_hoodie" | "lavender_knit" | "sport_green" | "lab_coat";
export type MeetCampusAccessory = "none" | "round_glasses" | "headphones" | "beret" | "hairclip";

export interface MeetCampusAppearance {
  skinTone: MeetCampusSkinTone;
  hairStyle: MeetCampusHairStyle;
  hairColor: MeetCampusHairColor;
  outfit: MeetCampusOutfit;
  accessory: MeetCampusAccessory;
}

export interface MeetCampusResident {
  id: string; slug: string; name: LocalizedText; isMine: boolean; isSynthetic: boolean;
  appearance: MeetCampusAppearance;
  persona: { interests?: string[]; temperament?: string };
  state: { sceneId: string; position: { x: number; y: number }; activity: string;
    activityStartedAt: string; nextDecisionAt: string | null; needs: Record<string, number> | null;
    journey: MeetCampusJourney | null; activitySession: MeetCampusActivitySessionState | null };
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
  feature: MeetCampusFeatureFlags; onboarding: MeetCampusOnboarding; ownerResidentId: string; myResidentId: string;
  perspective: { residentId: string; isOwnerResident: boolean; canSwitch: boolean;
    residents: Pick<MeetCampusResident, "id" | "name" | "appearance">[] };
  snapshot: MeetCampusWorldSnapshot; stories: MeetCampusStory[];
  relationships: MeetCampusRelationship[];
}

export interface MeetCampusOnboardingInput {
  locale: MeetCampusLocale; autonomyLevel: "guided" | "balanced" | "brave";
  anchors: { residentName: string; socialPace: string; preferredPlaces: string[]; ownerNote: string };
  appearance: MeetCampusAppearance;
}

export interface MeetCampusCommandInput {
  kind: "goal" | "visit" | "activity"; text: string; targetSceneId?: string; residentId?: string;
}

export interface MeetCampusDecisionTrace {
  id: string; createdAt: string; source: "deepseek" | "resident_utility"; status: string;
  observation: Record<string, any>; candidates: Record<string, any>[];
  selectedIntent: Record<string, any>; validation: Record<string, any>; execution: Record<string, any>;
}
