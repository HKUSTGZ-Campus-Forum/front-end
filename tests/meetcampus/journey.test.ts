import { describe, expect, it } from "vitest";
import { interpolateJourneyPath, journeyProgress } from "../../utils/meetcampusJourney";

describe("MeetCampus journey rendering", () => {
  it("keeps a three-minute journey continuous and bounded", () => {
    const departure = "2026-08-29T01:00:00.000Z";
    const arrival = "2026-08-29T01:03:00.000Z";
    expect(journeyProgress(departure, arrival, Date.parse(departure))).toBe(0);
    expect(journeyProgress(departure, arrival, Date.parse("2026-08-29T01:01:30.000Z"))).toBe(0.5);
    expect(journeyProgress(departure, arrival, Date.parse(arrival) + 1_000)).toBe(1);
  });

  it("interpolates across every route segment instead of teleporting", () => {
    const point = interpolateJourneyPath([{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 30 }], 0.5);
    expect(point).toEqual({ x: 20, y: 15 });
  });
});
