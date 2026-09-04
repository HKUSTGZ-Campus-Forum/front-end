import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("repeatable recruitment challenge and live leaderboard", () => {
  it("allows another run after a completed attempt", () => {
    const page = source("../../pages/recruitment/index.vue");

    expect(page).toContain("const repeatable = ref(false)");
    expect(page).toContain("payload?.data?.repeatable");
    expect(page).toContain("payload?.data?.unlimited_attempts");
    expect(page).toContain("repeatable.value || !hasAttempted.value");
    expect(page).toContain("isRunning || (hasAttempted && !repeatable)");
    expect(page).toContain('t("recruitment.composer.retry")');
  });

  it("loads every username ranking and refreshes it every ten seconds", () => {
    const page = source("../../pages/recruitment/index.vue");

    expect(page).toContain('fetchWithAuth("/api/recruitment/leaderboard"');
    expect(page).toContain("entry.username");
    expect(page).toContain("entry.is_current_user");
    expect(page).toContain("10_000");
    expect(page).toContain('class="recruitment-leaderboard"');
  });

  it("removes the mascot and updates both languages for the new rules", () => {
    const page = source("../../pages/recruitment/index.vue");
    const zh = JSON.parse(source("../../i18n/locales/zh.json")).recruitment;
    const en = JSON.parse(source("../../i18n/locales/en.json")).recruitment;

    expect(page).not.toContain("recruitment-console__mascot");
    expect(page).not.toContain("/recruitment/mascot.png");
    expect(zh.lead).toContain("提交次数不限");
    expect(en.lead).toContain("retry without a total limit");
    for (const recruitment of [zh, en]) {
      expect(recruitment.leaderboard.title).toBeTruthy();
      expect(recruitment.leaderboard.username).toBeTruthy();
      expect(recruitment.leaderboard.mine).toBeTruthy();
      expect(recruitment.composer.retry).toBeTruthy();
    }
  });
});
