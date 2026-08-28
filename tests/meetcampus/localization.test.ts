import { describe, expect, it } from "vitest";
import { localizeText } from "../../utils/meetcampus";

describe("MeetCampus localization", () => {
  it("uses the requested locale and falls back safely", () => {
    expect(localizeText({ zh: "校园", en: "Campus" }, "zh")).toBe("校园");
    expect(localizeText({ zh: "校园", en: "Campus" }, "en")).toBe("Campus");
    expect(localizeText(undefined, "en")).toBe("");
  });
});
