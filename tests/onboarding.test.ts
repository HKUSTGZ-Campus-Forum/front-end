import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isOnboardingPath,
  isOnboardingSupportPath,
  onboardingErrorTranslationKey,
  onboardingPathFor,
  safePostOnboardingReturnTo,
} from "../utils/onboarding";

describe("onboarding route helpers", () => {
  it("preserves the active locale", () => {
    expect(onboardingPathFor("/courses/planner")).toBe("/onboarding");
    expect(onboardingPathFor("/en/courses/planner")).toBe("/en/onboarding");
    expect(isOnboardingPath("/onboarding")).toBe(true);
    expect(isOnboardingPath("/en/onboarding")).toBe(true);
  });

  it("keeps safe destinations and rejects auth-flow loops", () => {
    expect(safePostOnboardingReturnTo("/en/forum", "/en")).toBe("/en/forum");
    expect(safePostOnboardingReturnTo("/en/login", "/en")).toBe("/en");
    expect(safePostOnboardingReturnTo("/onboarding", "/")).toBe("/");
    expect(safePostOnboardingReturnTo("https://evil.example", "/")).toBe("/");
  });

  it("allows the rules and privacy pages needed during onboarding", () => {
    expect(isOnboardingSupportPath("/help/rules")).toBe(true);
    expect(isOnboardingSupportPath("/en/help/privacy")).toBe(true);
    expect(isOnboardingSupportPath("/help/guide")).toBe(false);
  });

  it("maps stable API error codes to localized copy", () => {
    expect(onboardingErrorTranslationKey("username_taken")).toBe(
      "auth.onboarding.errors.username_taken",
    );
    expect(onboardingErrorTranslationKey("unexpected_detail")).toBe(
      "auth.onboarding.errors.save_failed",
    );
  });
});

describe("SSO onboarding integration", () => {
  it("routes a newly provisioned account through profile confirmation", () => {
    const loginPage = readFileSync(
      fileURLToPath(new URL("../pages/login/index.vue", import.meta.url)),
      "utf8",
    );
    const middleware = readFileSync(
      fileURLToPath(new URL("../middleware/onboarding.global.ts", import.meta.url)),
      "utf8",
    );

    expect(loginPage).toContain("result.user.onboarding_required");
    expect(loginPage).toContain('getLocalePath("/onboarding")');
    expect(middleware).toContain("user.value.onboarding_required");
    expect(middleware).toContain("isOnboardingSupportPath");
    expect(middleware).toContain("safePostOnboardingReturnTo");
  });
});
