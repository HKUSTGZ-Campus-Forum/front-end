import { describe, expect, it } from "vitest";
import {
  themes,
  getThemeById,
  getThemesByCategory,
  generateCSSVariables,
  getLogoFilter,
} from "../../utils/themes";

describe("theme registry", () => {
  it("registers exactly one light and one dark theme", () => {
    expect(getThemesByCategory("light")).toHaveLength(1);
    expect(getThemesByCategory("dark")).toHaveLength(1);
  });

  it("keeps theme ids unique", () => {
    const ids = themes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("looks up the deep-dark theme", () => {
    const dark = getThemeById("deep-dark");
    expect(dark).toBeDefined();
    expect(dark?.category).toBe("dark");
  });
});

describe("deep-dark variable generation", () => {
  const dark = getThemeById("deep-dark")!;
  const vars = generateCSSVariables(dark);

  it("uses dark blue-black backgrounds", () => {
    expect(vars["--bg-primary"]).toBe("#0e1726");
    expect(vars["--bg-secondary"]).toBe("#16233a");
  });

  it("keeps the keguang blue brand accent", () => {
    expect(vars["--interactive-primary"]).toBe("#26a4ff");
  });

  it("switches text to light on dark surfaces", () => {
    expect(vars["--text-primary"]).toBe("#e6edf7");
    expect(vars["--text-inverse"]).toBe("#0e1726");
  });

  it("brightens semantic colors for dark backgrounds", () => {
    expect(vars["--semantic-success"]).toBe("#34d399");
    expect(vars["--semantic-error"]).toBe("#f87171");
  });
});

describe("logo filter", () => {
  it("brightens the logo for both keguang themes", () => {
    expect(getLogoFilter("keguang-blue")).toBe("brightness(10) saturate(0)");
    expect(getLogoFilter("deep-dark")).toBe("brightness(10) saturate(0)");
  });

  it("leaves unknown themes untouched", () => {
    expect(getLogoFilter("nonexistent")).toBe("none");
  });
});
