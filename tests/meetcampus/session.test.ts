import { describe, expect, it } from "vitest";

import {
  createMeetCampusSession,
  localizeText,
  parseMeetCampusSession,
} from "../../utils/meetcampus";

describe("MeetCampus session", () => {
  it("creates a safe initial guided-sandbox state", () => {
    expect(createMeetCampusSession()).toMatchObject({
      version: 1,
      phase: "setup",
      scenarioId: null,
      pace: "quiet",
      choiceId: null,
      timeId: null,
      feedback: null,
    });
  });

  it("restores a valid session", () => {
    const restored = parseMeetCampusSession(JSON.stringify({
      version: 1,
      phase: "story",
      scenarioId: "study",
      pace: "easy",
      choiceId: "window",
      timeId: null,
      feedback: null,
      updatedAt: "2026-08-27T12:00:00.000Z",
    }));

    expect(restored).toEqual({
      version: 1,
      phase: "story",
      scenarioId: "study",
      pace: "easy",
      choiceId: "window",
      timeId: null,
      feedback: null,
      updatedAt: "2026-08-27T12:00:00.000Z",
    });
  });

  it.each([
    "not-json",
    JSON.stringify({ version: 99, phase: "setup", pace: "quiet" }),
    JSON.stringify({ version: 1, phase: "admin", pace: "quiet" }),
    JSON.stringify({ version: 1, phase: "setup", pace: "instant" }),
    JSON.stringify({ version: 1, phase: "setup", pace: "quiet", scenarioId: "unknown" }),
    JSON.stringify({ version: 1, phase: "encounter", pace: "quiet", scenarioId: null }),
    JSON.stringify({ version: 1, phase: "story", pace: "quiet", scenarioId: "study" }),
    JSON.stringify({
      version: 1,
      phase: "complete",
      pace: "quiet",
      scenarioId: "study",
      choiceId: "window",
      timeId: "today",
      feedback: null,
    }),
  ])("rejects invalid persisted data", (value) => {
    expect(parseMeetCampusSession(value)).toBeNull();
  });

  it("selects the requested localized text", () => {
    expect(localizeText({ zh: "图书馆", en: "Library" }, "zh")).toBe("图书馆");
    expect(localizeText({ zh: "图书馆", en: "Library" }, "en")).toBe("Library");
  });
});
