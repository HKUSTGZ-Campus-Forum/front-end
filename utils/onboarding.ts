import { safeOidcReturnTo } from "./oidc";

const ONBOARDING_ERROR_CODES = new Set([
  "authentication_required",
  "username_required",
  "username_invalid",
  "username_taken",
  "username_moderation_rejected",
  "email_verification_required",
  "email_required",
  "account_unavailable",
  "save_failed",
]);

export function onboardingPathFor(path: string): string {
  return path.startsWith("/en/") || path === "/en" ? "/en/onboarding" : "/onboarding";
}

export function isOnboardingPath(path: string): boolean {
  return /^\/(?:en\/)?onboarding\/?$/.test(path);
}

export function isLoginPath(path: string): boolean {
  return /^\/(?:en\/)?login\/?$/.test(path);
}

export function isOnboardingSupportPath(path: string): boolean {
  return /^\/(?:en\/)?help\/(?:rules|privacy)\/?$/.test(path);
}

export function safePostOnboardingReturnTo(
  value: unknown,
  fallback = "/",
): string {
  const candidate = safeOidcReturnTo(value, fallback);
  return isOnboardingPath(candidate) || isLoginPath(candidate)
    ? fallback
    : candidate;
}

export function onboardingErrorTranslationKey(value: unknown): string {
  const code =
    typeof value === "string" && ONBOARDING_ERROR_CODES.has(value)
      ? value
      : "save_failed";
  return `auth.onboarding.errors.${code}`;
}
