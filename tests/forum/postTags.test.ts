import { describe, expect, it } from "vitest";
import {
  COMMON_POST_TAGS,
  dedupePostTags,
  getPostTagKey,
  mergePostTagRecommendations,
  normalizePostTag,
} from "../../utils/postTags";

describe("post tag helpers", () => {
  it("trims tags, collapses whitespace, and canonicalizes club", () => {
    expect(normalizePostTag("  study   group  ")).toBe("study group");
    expect(normalizePostTag(" CLUB ")).toBe("club");
    expect(getPostTagKey(" Club ")).toBe("club");
  });

  it("deduplicates normalized tags without changing the first display value", () => {
    expect(dedupePostTags([
      " AI ",
      "ai",
      "study   group",
      "study group",
      "Club",
      "club",
      "   ",
    ])).toEqual(["AI", "study group", "club"]);
  });

  it("merges common and remote recommendations while filtering selected tags", () => {
    expect(mergePostTagRecommendations({
      commonTags: COMMON_POST_TAGS,
      remoteTags: ["Club", "AI", "Study Group", "ai"],
      selectedTags: ["study group"],
    })).toEqual(["club", "AI"]);
  });

  it("filters locked tags and respects both tag and suggestion limits", () => {
    expect(mergePostTagRecommendations({
      remoteTags: ["one", "two", "three"],
      selectedTags: ["a", "b", "c", "d"],
      lockedTags: ["club"],
    })).toEqual([]);

    expect(mergePostTagRecommendations({
      commonTags: [],
      remoteTags: ["one", "two", "three"],
      maxSuggestions: 2,
    })).toEqual(["one", "two"]);
  });
});
