import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("private recruitment developer console", () => {
  it("shows the entry only when the server grants access", () => {
    const page = source("../../pages/recruitment/index.vue");

    expect(page).toContain("const canViewAdmin = ref(false)");
    expect(page).toContain("payload?.data?.can_view_admin");
    expect(page).toContain('v-if="canViewAdmin"');
    expect(page).toContain("getLocalePath('/recruitment/admin')");
    expect(page).toContain('class="recruitment-guide"');
  });

  it("uses the protected overview API and redirects forbidden viewers", () => {
    const page = source("../../pages/recruitment/admin.vue");

    expect(page).toContain("/api/recruitment/admin/overview?page=${page}&per_page=50");
    expect(page).toContain("response.status === 403");
    expect(page).toContain('name: "robots", content: "noindex, nofollow"');
  });

  it("keeps all developer-console copy bilingual", () => {
    const zh = JSON.parse(source("../../i18n/locales/zh.json")).recruitment;
    const en = JSON.parse(source("../../i18n/locales/en.json")).recruitment;

    for (const recruitment of [zh, en]) {
      expect(recruitment.adminEntry).toBeTruthy();
      expect(recruitment.admin.title).toBeTruthy();
      expect(recruitment.admin.leaderboard.title).toBeTruthy();
      expect(recruitment.admin.attempts.title).toBeTruthy();
    }
  });
});
