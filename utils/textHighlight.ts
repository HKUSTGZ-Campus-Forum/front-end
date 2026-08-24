export interface HighlightedTextSegment {
  text: string;
  highlighted: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildHighlightedTextSegments(
  value: string | null | undefined,
  query: string | null | undefined,
): HighlightedTextSegment[] {
  const text = value || "";
  const normalizedQuery = query?.trim() || "";

  if (!text || !normalizedQuery) {
    return text ? [{ text, highlighted: false }] : [];
  }

  const pattern = new RegExp(escapeRegExp(normalizedQuery), "giu");
  const segments: HighlightedTextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index;
    const matchText = match[0];
    if (matchIndex === undefined || !matchText) continue;

    if (matchIndex > cursor) {
      segments.push({ text: text.slice(cursor, matchIndex), highlighted: false });
    }
    segments.push({ text: matchText, highlighted: true });
    cursor = matchIndex + matchText.length;
  }

  if (!segments.length) {
    return [{ text, highlighted: false }];
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlighted: false });
  }

  return segments;
}
