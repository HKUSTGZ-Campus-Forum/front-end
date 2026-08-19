const OIDC_ERROR_CODES = new Set([
  "access_denied",
  "authorization_failed",
  "invalid_response",
  "institutional_email_required",
  "account_conflict",
  "account_unavailable",
  "not_configured",
  "invalid_login_ticket",
]);

export function safeOidcReturnTo(value: unknown, fallback = "/"): string {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    value.length <= 512
  ) {
    return value;
  }
  return fallback;
}

export function oidcErrorTranslationKey(value: unknown): string {
  const code = typeof value === "string" && OIDC_ERROR_CODES.has(value)
    ? value
    : "authorization_failed";
  return `auth.login.sso.errors.${code}`;
}

