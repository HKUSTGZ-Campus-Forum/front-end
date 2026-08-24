import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import MarkdownIt from "markdown-it";
import { XSSPlugin } from "md-editor-v3";
import { describe, expect, it } from "vitest";
import { buildHighlightedTextSegments } from "../../utils/textHighlight";

const readSource = (relativePath: string) => readFileSync(
  resolve(process.cwd(), relativePath),
  "utf8",
);

describe("untrusted rich-text rendering", () => {
  it("strips executable HTML and dangerous links from Markdown previews", () => {
    const markdown = new MarkdownIt({ html: true, linkify: true });
    markdown.use(XSSPlugin, {});

    const rendered = markdown.render([
      '<img src=x onerror=alert(1)>',
      "",
      "<script>alert(2)</script>",
      "",
      "[click](javascript:alert(3))",
    ].join("\n"));

    expect(rendered).toContain("<img src>");
    expect(rendered).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
    expect(rendered).not.toContain("onerror");
    expect(rendered).not.toContain("<script>");
    expect(rendered).not.toContain('href="javascript:');
  });

  it("keeps hostile search-result markup as inert text segments", () => {
    expect(buildHighlightedTextSegments(
      '<img src=x onerror=alert(1)> XSS <script>alert(2)</script>',
      "xss",
    )).toEqual([
      { text: '<img src=x onerror=alert(1)> ', highlighted: false },
      { text: "XSS", highlighted: true },
      { text: " <script>alert(2)</script>", highlighted: false },
    ]);
  });

  it("handles regex characters and repeated case-insensitive matches", () => {
    expect(buildHighlightedTextSegments("C++ and c++", "c++")).toEqual([
      { text: "C++", highlighted: true },
      { text: " and ", highlighted: false },
      { text: "c++", highlighted: true },
    ]);
  });

  it("renders search highlights without v-html or server-provided HTML", () => {
    const dropdown = readSource("components/ui/SearchDropdown.vue");

    expect(dropdown).not.toContain("v-html");
    expect(dropdown).not.toContain("title_highlighted");
    expect(dropdown).not.toContain("username_highlighted");
    expect(dropdown).not.toContain("name_highlighted");
    expect(dropdown).toContain(':text="post.title"');
    expect(dropdown).toContain(':text="user.username"');
    expect(dropdown).toContain(':text="tag.name"');
    expect(dropdown).toContain(':text="course.code"');
  });

  it("routes feedback Markdown through the shared XSS-filtered preview", () => {
    for (const page of [
      "pages/feedback/[id].vue",
      "pages/feedback/merge-requests/[id].vue",
      "pages/contest/index.vue",
    ]) {
      const source = readSource(page);
      expect(source).not.toContain('from "marked"');
      expect(source).not.toContain("v-html");
      expect(source).toContain("<CommonMarkdownContent");
    }

    const securityPlugin = readSource("plugins/markdown-security.ts");
    expect(securityPlugin).toContain("markdownIt.use(XSSPlugin");
  });
});
