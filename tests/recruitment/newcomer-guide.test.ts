import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("recruitment newcomer guide", () => {
  it("presents the challenge as a concise three-step flow", () => {
    const page = source("../../pages/recruitment/index.vue");

    expect(page).toContain('class="recruitment-guide"');
    expect(page).toContain('aria-labelledby="recruitment-guide-title"');
    expect(page).toContain('name="lucide:message-square-text"');
    expect(page).toContain('name="lucide:bot"');
    expect(page).toContain('name="lucide:gauge"');
    expect(page.match(/recruitment\.guide\.steps\.(prompt|agent|score)\.title/g)).toHaveLength(3);
  });

  it("keeps the beginner explanation complete in both locales", () => {
    const zh = JSON.parse(source("../../i18n/locales/zh.json")).recruitment.guide;
    const en = JSON.parse(source("../../i18n/locales/en.json")).recruitment.guide;

    for (const guide of [zh, en]) {
      expect(guide.title).toBeTruthy();
      expect(guide.body).toBeTruthy();
      expect(Object.keys(guide.steps)).toEqual(["prompt", "agent", "score"]);
      expect(guide.tip).toBeTruthy();
    }
  });
});
