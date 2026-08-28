import { describe, expect, it } from "vitest";
import { DEFAULT_MEETCAMPUS_APPEARANCE, MEETCAMPUS_APPEARANCE_OPTIONS, normalizeMeetCampusAppearance } from "../../utils/meetcampusAppearance";

describe("MeetCampus appearance", () => {
  it("normalizes the legacy seeded resident format into the layered contract", () => {
    expect(normalizeMeetCampusAppearance({ palette: "green", hair: 3, outfit: 2, accessory: 4 } as never)).toEqual({
      skinTone: "warm",
      hairStyle: "bun",
      hairColor: "plum",
      outfit: "sport_green",
      accessory: "hairclip",
    });
  });

  it("keeps valid choices and safely replaces unsupported values", () => {
    const result = normalizeMeetCampusAppearance({
      skinTone: "deep", hairStyle: "waves", hairColor: "auburn", outfit: "lab_coat", accessory: "round_glasses",
    });
    expect(result).toEqual({ skinTone: "deep", hairStyle: "waves", hairColor: "auburn", outfit: "lab_coat", accessory: "round_glasses" });
    expect(normalizeMeetCampusAppearance({ hairStyle: "unknown" } as never).hairStyle).toBe(DEFAULT_MEETCAMPUS_APPEARANCE.hairStyle);
    expect(MEETCAMPUS_APPEARANCE_OPTIONS.outfit).toContain(result.outfit);
  });
});
