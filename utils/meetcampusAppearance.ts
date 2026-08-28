import type {
  MeetCampusAccessory,
  MeetCampusAppearance,
  MeetCampusHairColor,
  MeetCampusHairStyle,
  MeetCampusOutfit,
  MeetCampusSkinTone,
} from "~/types/meetcampus";

export const MEETCAMPUS_APPEARANCE_OPTIONS = {
  skinTone: ["porcelain", "warm", "tan", "deep"] as MeetCampusSkinTone[],
  hairStyle: ["crop", "bob", "waves", "bun", "curly", "cap"] as MeetCampusHairStyle[],
  hairColor: ["ink", "chestnut", "auburn", "plum", "ocean"] as MeetCampusHairColor[],
  outfit: ["campus_blue", "mint_cardigan", "sunset_hoodie", "lavender_knit", "sport_green", "lab_coat"] as MeetCampusOutfit[],
  accessory: ["none", "round_glasses", "headphones", "beret", "hairclip"] as MeetCampusAccessory[],
} as const;

export const DEFAULT_MEETCAMPUS_APPEARANCE: MeetCampusAppearance = {
  skinTone: "warm",
  hairStyle: "crop",
  hairColor: "ink",
  outfit: "campus_blue",
  accessory: "none",
};

const legacyPaletteOutfits: Record<string, MeetCampusOutfit> = {
  navy: "campus_blue", blue: "campus_blue", green: "sport_green", forest: "sport_green",
  mint: "mint_cardigan", orange: "sunset_hoodie", amber: "sunset_hoodie", purple: "lavender_knit",
};

function pickLegacy<T>(values: readonly T[], value: unknown, fallback: T): T {
  const index = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(index) ? values[Math.abs(index) % values.length] : fallback;
}

function isOption<K extends keyof typeof MEETCAMPUS_APPEARANCE_OPTIONS>(key: K, value: unknown): value is MeetCampusAppearance[K] {
  return typeof value === "string" && (MEETCAMPUS_APPEARANCE_OPTIONS[key] as readonly string[]).includes(value);
}

export function normalizeMeetCampusAppearance(input?: Partial<MeetCampusAppearance> & Record<string, unknown> | null): MeetCampusAppearance {
  const source = input ?? {};
  return {
    skinTone: isOption("skinTone", source.skinTone) ? source.skinTone : pickLegacy(MEETCAMPUS_APPEARANCE_OPTIONS.skinTone, source.skin, DEFAULT_MEETCAMPUS_APPEARANCE.skinTone),
    hairStyle: isOption("hairStyle", source.hairStyle) ? source.hairStyle : pickLegacy(MEETCAMPUS_APPEARANCE_OPTIONS.hairStyle, source.hair, DEFAULT_MEETCAMPUS_APPEARANCE.hairStyle),
    hairColor: isOption("hairColor", source.hairColor) ? source.hairColor : pickLegacy(MEETCAMPUS_APPEARANCE_OPTIONS.hairColor, source.hair, DEFAULT_MEETCAMPUS_APPEARANCE.hairColor),
    outfit: isOption("outfit", source.outfit) ? source.outfit : legacyPaletteOutfits[String(source.palette)] ?? pickLegacy(MEETCAMPUS_APPEARANCE_OPTIONS.outfit, source.outfit, DEFAULT_MEETCAMPUS_APPEARANCE.outfit),
    accessory: isOption("accessory", source.accessory) ? source.accessory : pickLegacy(MEETCAMPUS_APPEARANCE_OPTIONS.accessory, source.accessory, DEFAULT_MEETCAMPUS_APPEARANCE.accessory),
  };
}

export function randomMeetCampusAppearance(current = DEFAULT_MEETCAMPUS_APPEARANCE): MeetCampusAppearance {
  const next = Object.fromEntries(Object.entries(MEETCAMPUS_APPEARANCE_OPTIONS).map(([key, values]) => {
    const alternatives = values.filter(value => value !== current[key as keyof MeetCampusAppearance]);
    return [key, alternatives[Math.floor(Math.random() * alternatives.length)] ?? values[0]];
  })) as unknown as MeetCampusAppearance;
  return next;
}
