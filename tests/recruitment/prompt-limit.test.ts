import { describe, expect, it } from "vitest";
import {
  RECRUITMENT_PROMPT_LIMIT,
  countRecruitmentPromptCharacters,
  isRecruitmentPromptValid,
  normalizeRecruitmentPrompt,
} from "../../utils/recruitment";

describe("recruitment prompt limit", () => {
  it("normalizes compatibility characters and removes invisible format marks", () => {
    expect(normalizeRecruitmentPrompt("  Ａ\u200b计划  ")).toBe("A计划");
  });

  it("counts Unicode characters instead of UTF-16 code units", () => {
    expect(countRecruitmentPromptCharacters("🙂计划")).toBe(3);
  });

  it("accepts one through 100 characters only", () => {
    expect(isRecruitmentPromptValid(" ")).toBe(false);
    expect(isRecruitmentPromptValid("a".repeat(RECRUITMENT_PROMPT_LIMIT))).toBe(true);
    expect(isRecruitmentPromptValid("a".repeat(RECRUITMENT_PROMPT_LIMIT + 1))).toBe(false);
  });
});

