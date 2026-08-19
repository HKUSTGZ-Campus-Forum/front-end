import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => readFileSync(
  resolve(process.cwd(), relativePath),
  "utf8",
);

describe("post tag entry integration", () => {
  it("locks the canonical club tag when posting from club activities", () => {
    const forumPage = readSource("pages/forum/index.vue");

    expect(forumPage).toContain('lockedTag: "club"');
    expect(forumPage).toContain('source: "activity"');
    expect(forumPage).toContain('query: { section: "activity" }');
  });

  it("uses a dedicated tag suggestion query and exposes listbox semantics", () => {
    const postMessage = readSource("components/forum/PostMessage.vue");

    expect(postMessage).toContain("/api/search/tags?");
    expect(postMessage).toContain("/api/search/global?q=");
    expect(postMessage).toContain("useGlobalTagSearchFallback = true");
    expect(postMessage).toContain('role="combobox"');
    expect(postMessage).toContain('role="listbox"');
    expect(postMessage).toContain('role="option"');
    expect(postMessage).toContain('tabindex="-1"');
    expect(postMessage).toContain('event.isComposing || event.key === "Process" || event.keyCode === 229');
    expect(postMessage).toContain("TAG_SEARCH_DEBOUNCE_MS = 280");
  });

  it("distinguishes the activity return label from the course return label", () => {
    const createPage = readSource("pages/forum/postMessage/index.vue");

    expect(createPage).toContain('source.value === "activity"');
    expect(createPage).toContain('t("forum.create.backToActivity")');
    expect(createPage).toContain('t("forum.create.backToCourse")');
  });
});
