import { describe, expect, it } from "vitest";
import { normalizeMascotRendererKind } from "../../utils/mascotRenderer";
import { pickThreeReactionClip } from "../../utils/mascotThree";

describe("mascot renderer selection", () => {
  it("selects Three.js only when explicitly configured", () => {
    expect(normalizeMascotRendererKind("three")).toBe("three");
    expect(normalizeMascotRendererKind("live2d")).toBe("live2d");
    expect(normalizeMascotRendererKind(undefined)).toBe("live2d");
  });

  it("selects only supported GLB reaction clips", () => {
    const clips = ["Idle", "Walk", "Celebrate", "EatTOK"];
    expect(pickThreeReactionClip(clips, () => 0)).toBe("Celebrate");
    expect(pickThreeReactionClip(clips, () => 0.99)).toBe("EatTOK");
    expect(pickThreeReactionClip(["Idle"], () => 0)).toBeNull();
  });
});
