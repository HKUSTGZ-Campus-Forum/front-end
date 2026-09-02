import { describe, expect, it } from "vitest";
import {
  isMascotModelUrlCandidate,
  normalizeMascotModelUrl,
} from "../../utils/mascotModelUrl";

describe("mascot model URL helpers", () => {
  it("normalizes user-provided model URLs", () => {
    expect(normalizeMascotModelUrl("  https://example.com/Hiyori.model3.json  ")).toBe(
      "https://example.com/Hiyori.model3.json"
    );
  });

  it("accepts http URLs and site-relative JSON model paths", () => {
    expect(
      isMascotModelUrlCandidate("https://example.com/live2d/Hiyori.model3.json")
    ).toBe(true);
    expect(isMascotModelUrlCandidate("http://localhost:3000/model.json")).toBe(
      true
    );
    expect(isMascotModelUrlCandidate("/models/hiyori/model3.json")).toBe(true);
  });

  it("rejects empty values, non-web protocols, and non-JSON assets", () => {
    expect(isMascotModelUrlCandidate("   ")).toBe(false);
    expect(isMascotModelUrlCandidate("javascript:alert(1)")).toBe(false);
    expect(isMascotModelUrlCandidate("https://example.com/texture.png")).toBe(
      false
    );
  });
});
