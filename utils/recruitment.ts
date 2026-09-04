const FORMAT_CHARACTER_PATTERN = /\p{Cf}/gu;

// The strategy a user writes is bound by a weighted budget (100 units by
// default). A Chinese (Han) character consumes one unit; every other visible
// character consumes 0.3 units. These numbers are the contract with the
// backend, which enforces the same rule server-side.
export const RECRUITMENT_PROMPT_LIMIT = 100;

// Weights kept in tenths of a unit so the arithmetic is integer-exact and
// agrees with the backend on every boundary: Han = 1.0 (10 tenths), other =
// 0.3 (3 tenths). These CJK ranges mirror the backend _CJK_HAN_RANGES exactly.
const HAN_TENTHS = 10;
const OTHER_TENTHS = 3;
const CJK_HAN_RANGES: Array<[number, number]> = [
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
];

function isCjkHan(ch: string): boolean {
  const codePoint = ch.codePointAt(0)!;
  return CJK_HAN_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end);
}

export function normalizeRecruitmentPrompt(value: string): string {
  return value.normalize("NFKC").replace(FORMAT_CHARACTER_PATTERN, "").trim();
}

function recruitmentPromptTenths(value: string): number {
  let total = 0;
  for (const ch of normalizeRecruitmentPrompt(value)) {
    total += isCjkHan(ch) ? HAN_TENTHS : OTHER_TENTHS;
  }
  return total;
}

/** Weighted prompt length in Chinese-character-equivalent units. */
export function countRecruitmentPromptCharacters(value: string): number {
  return recruitmentPromptTenths(value) / 10;
}

/** True while the weighted prompt fits at or under the budget (exact). */
export function isRecruitmentPromptWithinLimit(value: string): boolean {
  return recruitmentPromptTenths(value) <= RECRUITMENT_PROMPT_LIMIT * HAN_TENTHS;
}

export function isRecruitmentPromptValid(value: string): boolean {
  const count = countRecruitmentPromptCharacters(value);
  return count > 0 && isRecruitmentPromptWithinLimit(value);
}


