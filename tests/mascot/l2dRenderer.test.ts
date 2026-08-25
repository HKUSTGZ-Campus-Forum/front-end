import { describe, expect, it } from "vitest";
import {
  normalizeMouthOpenValue,
  pickMotionGroup,
  resolveMouthParameterId,
} from "../../utils/mascotL2d";

describe("Live2D mascot renderer helpers", () => {
  it("recognizes mouth parameters across Cubism generations", () => {
    expect(resolveMouthParameterId([{ id: "ParamMouthOpenY" }])).toBe(
      "ParamMouthOpenY"
    );
    expect(resolveMouthParameterId([{ id: "PARAM_MOUTH_OPEN_Y" }])).toBe(
      "PARAM_MOUTH_OPEN_Y"
    );
    expect(resolveMouthParameterId([{ id: "ParamEyeLOpen" }])).toBeNull();
  });

  it("clamps mouth input to the supported normalized range", () => {
    expect(normalizeMouthOpenValue(-0.5)).toBe(0);
    expect(normalizeMouthOpenValue(0.45)).toBe(0.45);
    expect(normalizeMouthOpenValue(2)).toBe(1);
    expect(normalizeMouthOpenValue(Number.NaN)).toBe(0);
  });

  it("prefers reactive motions over the idle loop", () => {
    const motions = {
      idle: ["idle.motion"],
      tap: ["tap-1.motion", "tap-2.motion"],
      wave: ["wave.motion"],
    };

    expect(pickMotionGroup(motions, () => 0)).toBe("tap");
    expect(pickMotionGroup(motions, () => 0.99)).toBe("wave");
    expect(pickMotionGroup({ idle: ["idle.motion"] }, () => 0)).toBe("idle");
    expect(pickMotionGroup({ idle: [] }, () => 0)).toBeNull();
  });
});
