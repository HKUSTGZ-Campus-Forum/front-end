const FORMAT_CHARACTER_PATTERN = /\p{Cf}/gu;

export const RECRUITMENT_PROMPT_LIMIT = 100;

export function normalizeRecruitmentPrompt(value: string): string {
  return value.normalize("NFKC").replace(FORMAT_CHARACTER_PATTERN, "").trim();
}

export function countRecruitmentPromptCharacters(value: string): number {
  return Array.from(normalizeRecruitmentPrompt(value)).length;
}

export function isRecruitmentPromptValid(value: string): boolean {
  const count = countRecruitmentPromptCharacters(value);
  return count > 0 && count <= RECRUITMENT_PROMPT_LIMIT;
}

