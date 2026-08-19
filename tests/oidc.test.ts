import { describe, expect, it } from "vitest";
import { oidcErrorTranslationKey, safeOidcReturnTo } from "../utils/oidc";

describe("safeOidcReturnTo", () => {
  it("keeps same-origin application paths", () => {
    expect(safeOidcReturnTo("/courses/planner?semester=2630")).toBe(
      "/courses/planner?semester=2630"
    );
    expect(safeOidcReturnTo("/en/forum")).toBe("/en/forum");
  });

  it("rejects external, protocol-relative, and backslash paths", () => {
    expect(safeOidcReturnTo("https://evil.example", "/en")).toBe("/en");
    expect(safeOidcReturnTo("//evil.example", "/en")).toBe("/en");
    expect(safeOidcReturnTo("/\\evil.example", "/en")).toBe("/en");
  });
});

describe("oidcErrorTranslationKey", () => {
  it("maps known server codes to localized copy", () => {
    expect(oidcErrorTranslationKey("account_conflict")).toBe(
      "auth.login.sso.errors.account_conflict"
    );
  });

  it("does not allow arbitrary translation-key injection", () => {
    expect(oidcErrorTranslationKey("unknown.provider.detail")).toBe(
      "auth.login.sso.errors.authorization_failed"
    );
  });
});

