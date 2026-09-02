const DEFAULT_MODEL_BASE_URL = "https://unikorn.local";

export function normalizeMascotModelUrl(value: string): string {
  return value.trim();
}

export function isMascotModelUrlCandidate(
  value: string,
  baseUrl = DEFAULT_MODEL_BASE_URL
): boolean {
  const trimmed = normalizeMascotModelUrl(value);
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed, baseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    return parsed.pathname.toLowerCase().endsWith(".json");
  } catch {
    return false;
  }
}
