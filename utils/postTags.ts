export const MAX_POST_TAG_COUNT = 5;
export const MAX_POST_TAG_LENGTH = 50;
export const COMMON_POST_TAGS = ["club"] as const;

const CANONICAL_POST_TAGS = new Map<string, string>([
  ["club", "club"],
]);

export function normalizePostTag(rawTag: string): string {
  const normalized = rawTag.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  return CANONICAL_POST_TAGS.get(normalized.toLocaleLowerCase()) || normalized;
}

export function getPostTagKey(rawTag: string): string {
  return normalizePostTag(rawTag).toLocaleLowerCase();
}

export function dedupePostTags(rawTags: readonly string[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of rawTags) {
    const normalized = normalizePostTag(rawTag);
    if (!normalized) continue;

    const key = getPostTagKey(normalized);
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(normalized);
  }

  return tags;
}

interface MergePostTagRecommendationsOptions {
  commonTags?: readonly string[];
  remoteTags?: readonly string[];
  selectedTags?: readonly string[];
  lockedTags?: readonly string[];
  maxTagCount?: number;
  maxSuggestions?: number;
}

export function mergePostTagRecommendations({
  commonTags = COMMON_POST_TAGS,
  remoteTags = [],
  selectedTags = [],
  lockedTags = [],
  maxTagCount = MAX_POST_TAG_COUNT,
  maxSuggestions = 8,
}: MergePostTagRecommendationsOptions = {}): string[] {
  const occupiedTags = dedupePostTags([...lockedTags, ...selectedTags]);
  const safeTagLimit = Math.max(0, Math.floor(maxTagCount));
  if (occupiedTags.length >= safeTagLimit) return [];

  const occupiedKeys = new Set(occupiedTags.map(getPostTagKey));
  const safeSuggestionLimit = Math.max(0, Math.floor(maxSuggestions));

  return dedupePostTags([...commonTags, ...remoteTags])
    .filter((tag) => !occupiedKeys.has(getPostTagKey(tag)))
    .slice(0, safeSuggestionLimit);
}
