import { describe, expect, it } from "vitest";
import {
  RECRUITMENT_PROMPT_LIMIT,
  countRecruitmentPromptCharacters,
  isRecruitmentPromptValid,
  isRecruitmentPromptWithinLimit,
  normalizeRecruitmentPrompt,
} from "../../utils/recruitment";

describe("recruitment prompt limit", () => {
  it("normalizes compatibility characters and removes invisible format marks", () => {
    expect(normalizeRecruitmentPrompt("  Ａ\u200b计划  ")).toBe("A计划");
  });

  it("weights Chinese characters as 1 and other characters as 0.3", () => {
    // 'A' non-Chinese (0.3) + two Chinese (1 each) => 2.3
    expect(countRecruitmentPromptCharacters("A计划")).toBeCloseTo(2.3);
    // emoji is non-Chinese (0.3), then 计 and 划 each 1 => 2.3
    expect(countRecruitmentPromptCharacters("🙂计划")).toBeCloseTo(2.3);
    // full-width marks normalize via NFKC are still non-Chinese
    expect(countRecruitmentPromptCharacters("。。。")).toBeCloseTo(0.9);
  });

  it("caps at 100 Chinese-character units", () => {
    expect(countRecruitmentPromptCharacters("汉".repeat(RECRUITMENT_PROMPT_LIMIT)))
      .toBeCloseTo(RECRUITMENT_PROMPT_LIMIT);
    // 100 ASCII characters weigh far less than the budget
    expect(countRecruitmentPromptCharacters("a".repeat(RECRUITMENT_PROMPT_LIMIT)))
      .toBeCloseTo(30);
    expect(isRecruitmentPromptValid(" ")).toBe(false);
    expect(isRecruitmentPromptWithinLimit("汉".repeat(RECRUITMENT_PROMPT_LIMIT))).toBe(true);
    expect(isRecruitmentPromptWithinLimit("汉".repeat(RECRUITMENT_PROMPT_LIMIT + 1))).toBe(false);
    // 333 ASCII ≈ 99.9 fits; 334 ASCII ≈ 100.2 exceeds
    expect(isRecruitmentPromptWithinLimit("a".repeat(333))).toBe(true);
    expect(isRecruitmentPromptWithinLimit("a".repeat(334))).toBe(false);
  });
});

