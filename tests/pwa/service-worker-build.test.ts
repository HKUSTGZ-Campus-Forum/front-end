import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { embedServiceWorkerBuildVersion } from "../../utils/serviceWorkerBuild";

const template = 'const CACHE_VERSION = "__UNIKORN_BUILD_VERSION__";';

describe("service worker build identity", () => {
  it("stamps the actual source without mutating its template", () => {
    const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
    const result = embedServiceWorkerBuildVersion(source, "frontend-sha");
    expect(result).toContain('const CACHE_VERSION = "frontend-sha";');
    expect(result).not.toContain("__UNIKORN_BUILD_VERSION__");
    expect(source).toContain("__UNIKORN_BUILD_VERSION__");
    expect(result).not.toContain("searchParams.get");
  });

  it("changes worker script bytes even if no service worker code changed", () => {
    expect(embedServiceWorkerBuildVersion(template, "release-a"))
      .not.toBe(embedServiceWorkerBuildVersion(template, "release-b"));
  });

  it("serializes quotes, backslashes, newlines and replacement markers safely", () => {
    const version = 'build-";globalThis.injected=true;//\\\n$&$`$\'';
    const context: Record<string, unknown> = {};
    runInNewContext(`${embedServiceWorkerBuildVersion(template, version)}\nthis.version = CACHE_VERSION;`, context);
    expect(context.version).toBe(version);
    expect(context.injected).toBeUndefined();
  });

  it.each(["", "   ", "__UNIKORN_BUILD_VERSION__"])("rejects invalid identity %j", (version) => {
    expect(() => embedServiceWorkerBuildVersion(template, version)).toThrow("build version");
  });

  it("fails the build on missing or duplicated placeholders", () => {
    expect(() => embedServiceWorkerBuildVersion("const CACHE_VERSION = 'old';", "new"))
      .toThrow("exactly one");
    expect(() => embedServiceWorkerBuildVersion(`${template}\n${template}`, "new"))
      .toThrow("exactly one");
  });

  it("uses the public-asset hook before Nitro indexes the stamped script", () => {
    const config = readFileSync(new URL("../../nuxt.config.ts", import.meta.url), "utf8");
    expect(config).toContain('"nitro:build:public-assets"');
    expect(config).toContain('join(nitro.options.output.publicDir, "sw.js")');
    expect(config).toContain("embedServiceWorkerBuildVersion(source, appBuildVersion)");
    expect(config).toContain('"/sw.js": { headers: { "Cache-Control": "no-cache, must-revalidate" } }');
  });
});
